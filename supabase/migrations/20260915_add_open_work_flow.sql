-- Separate workshop work from the financial invoice. An open work record can
-- be created with descriptions only; prices are added immediately before the
-- immutable invoice is issued.

alter table public.services
  add column if not exists work_status text not null default 'completed',
  add column if not exists completed_at timestamptz;

update public.services
set completed_at = coalesce(completed_at, updated_at, created_at)
where work_status = 'completed' and completed_at is null;

alter table public.services
  drop constraint if exists services_work_status_check,
  add constraint services_work_status_check check (work_status in ('open', 'completed'));

create index if not exists services_company_work_status_created_idx
  on public.services(company_id, work_status, created_at desc);

create or replace function public.prevent_open_work_invoice()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.services service
    where service.id = new.service_id
      and service.company_id = new.company_id
      and service.work_status = 'open'
  ) then
    raise exception 'Complete and price the open work before issuing an invoice.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_open_work_invoice on public.invoices;
create trigger prevent_open_work_invoice
before insert on public.invoices
for each row execute function public.prevent_open_work_invoice();

create or replace function public.create_company_open_work(
  input_company_id uuid,
  input_vehicle_id uuid,
  input_type public.service_type,
  input_date date,
  input_km integer,
  input_notes text,
  input_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_service_id uuid;
  item jsonb;
  line_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if input_company_id is null or input_vehicle_id is null or input_date is null
    or input_km is null or input_km < 0 or input_km > 2000000 then
    raise exception 'Company, vehicle, date, or odometer is invalid.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(input_items, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(input_items, '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(input_items, '[]'::jsonb)) > 40 then
    raise exception 'Add between one and forty planned work lines.' using errcode = '22023';
  end if;

  if not public.has_company_role(
    input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]
  ) then
    raise exception 'Company operator access is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.vehicles vehicle
    where vehicle.id = input_vehicle_id and vehicle.company_id = input_company_id
  ) then
    raise exception 'Vehicle is outside the active company.' using errcode = '23503';
  end if;

  insert into public.services (
    company_id, vehicle_id, owner_id, type, date, km, notes, total_amount,
    work_status, completed_at
  ) values (
    input_company_id, input_vehicle_id, null, input_type, input_date, input_km,
    nullif(btrim(coalesce(input_notes, '')), ''), 0, 'open', null
  ) returning id into created_service_id;

  for item in select value from jsonb_array_elements(input_items)
  loop
    line_name := btrim(coalesce(item ->> 'name', ''));
    if line_name = '' or char_length(line_name) > 160 then
      raise exception 'Every planned work line needs a valid description.' using errcode = '22023';
    end if;

    insert into public.service_items (
      company_id, service_id, owner_id, name, material_cost, labor_cost, fee,
      labor_discount_percent, quantity, unit_price, unit_label
    ) values (
      input_company_id, created_service_id, null, line_name, 0, 0, 0, 0, 1, 0, null
    );
  end loop;

  return created_service_id;
end;
$$;

create or replace function public.finalize_company_open_work(
  input_company_id uuid,
  input_service_id uuid,
  input_items jsonb,
  input_notes text default null,
  input_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  line_name text;
  line_unit text;
  quantity_text text;
  unit_price_text text;
  labor_cost_text text;
  discount_text text;
  line_quantity numeric(12,3);
  line_unit_price numeric(12,2);
  line_labor_cost numeric(12,2);
  line_discount numeric(5,2);
  line_material_cost numeric(12,2);
  created_invoice_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not public.has_company_role(
    input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']::text[]
  ) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(input_items, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(input_items, '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(input_items, '[]'::jsonb)) > 40 then
    raise exception 'Invoice lines are invalid.' using errcode = '22023';
  end if;

  perform 1
  from public.services service
  where service.id = input_service_id
    and service.company_id = input_company_id
    and service.work_status = 'open'
  for update;

  if not found then
    raise exception 'Open work was not found or was already invoiced.' using errcode = '23503';
  end if;

  if exists (
    select 1 from public.invoices invoice
    where invoice.service_id = input_service_id and invoice.company_id = input_company_id
  ) then
    raise exception 'This work already has an invoice.' using errcode = '23505';
  end if;

  delete from public.service_items
  where service_id = input_service_id and company_id = input_company_id;

  for item in select value from jsonb_array_elements(input_items)
  loop
    line_name := btrim(coalesce(item ->> 'name', ''));
    line_unit := nullif(btrim(coalesce(item ->> 'unit', '')), '');
    quantity_text := coalesce(item ->> 'quantity', '');
    unit_price_text := coalesce(item ->> 'unitPrice', '');
    labor_cost_text := coalesce(item ->> 'laborCost', '');
    discount_text := coalesce(nullif(item ->> 'laborDiscountPercent', ''), '0');

    if line_name = '' or char_length(line_name) > 160
      or char_length(coalesce(line_unit, '')) > 16
      or quantity_text !~ '^([0-9]+)(\.[0-9]{1,3})?$'
      or unit_price_text !~ '^([0-9]+)(\.[0-9]{1,2})?$'
      or labor_cost_text !~ '^([0-9]+)(\.[0-9]{1,2})?$'
      or discount_text !~ '^([0-9]+)(\.[0-9]{1,2})?$' then
      raise exception 'Every invoice line needs valid values.' using errcode = '22023';
    end if;

    line_quantity := quantity_text::numeric;
    line_unit_price := unit_price_text::numeric;
    line_labor_cost := labor_cost_text::numeric;
    line_discount := discount_text::numeric;
    line_material_cost := round(line_quantity * line_unit_price, 2);

    if line_quantity <= 0 or line_quantity > 1000000
      or line_unit_price < 0 or line_unit_price > 1000000
      or line_labor_cost < 0 or line_labor_cost > 1000000
      or line_discount < 0 or line_discount > 100
      or line_material_cost + line_labor_cost <= 0 then
      raise exception 'Every invoice line needs a positive material or labour value.' using errcode = '22023';
    end if;

    insert into public.service_items (
      company_id, service_id, owner_id, name, material_cost, labor_cost, fee,
      labor_discount_percent, quantity, unit_price, unit_label
    ) values (
      input_company_id, input_service_id, null, line_name, line_material_cost,
      line_labor_cost, 0, line_discount, line_quantity, line_unit_price, line_unit
    );
  end loop;

  update public.services
  set notes = nullif(btrim(coalesce(input_notes, notes, '')), ''),
      work_status = 'completed',
      completed_at = now()
  where id = input_service_id and company_id = input_company_id;

  select public.create_company_invoice_from_service(
    input_company_id, input_service_id, input_due_date
  ) into created_invoice_id;

  return created_invoice_id;
end;
$$;

revoke all on function public.create_company_open_work(
  uuid, uuid, public.service_type, date, integer, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.create_company_open_work(
  uuid, uuid, public.service_type, date, integer, text, jsonb
) to authenticated;

revoke all on function public.finalize_company_open_work(
  uuid, uuid, jsonb, text, date
) from public, anon, authenticated, service_role;
grant execute on function public.finalize_company_open_work(
  uuid, uuid, jsonb, text, date
) to authenticated;

notify pgrst, 'reload schema';
