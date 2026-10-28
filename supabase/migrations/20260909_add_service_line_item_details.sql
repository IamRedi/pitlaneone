-- Store workshop work as proper invoice lines: material, quantity, unit price
-- and labour. Existing rows remain valid and are backfilled as one unit.
alter table public.service_items
  add column if not exists quantity numeric(12,3) not null default 1,
  add column if not exists unit_price numeric(12,2) not null default 0,
  add column if not exists unit_label text;

alter table public.service_items
  drop constraint if exists service_items_quantity_positive,
  drop constraint if exists service_items_unit_price_non_negative,
  drop constraint if exists service_items_unit_label_length,
  add constraint service_items_quantity_positive check (quantity > 0 and quantity <= 1000000),
  add constraint service_items_unit_price_non_negative check (unit_price >= 0 and unit_price <= 1000000),
  add constraint service_items_unit_label_length check (unit_label is null or char_length(unit_label) <= 16);

create or replace function public.create_company_service_with_line_items(
  input_company_id uuid,
  input_vehicle_id uuid,
  input_type public.service_type,
  input_date date,
  input_km integer,
  input_notes text,
  input_items jsonb,
  input_labor_discount_percent numeric default 0
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
  line_unit text;
  quantity_text text;
  unit_price_text text;
  labor_cost_text text;
  line_quantity numeric(12,3);
  line_unit_price numeric(12,2);
  line_labor_cost numeric(12,2);
  line_material_cost numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if input_company_id is null or input_vehicle_id is null
    or input_date is null or input_km is null or input_km < 0 or input_km > 2000000 then
    raise exception 'Company, vehicle, service date, or odometer is invalid.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(input_items, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(input_items, '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(input_items, '[]'::jsonb)) > 40
    or coalesce(input_labor_discount_percent, -1) < 0
    or input_labor_discount_percent > 100 then
    raise exception 'Service lines or discount are invalid.' using errcode = '22023';
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

  insert into public.services (company_id, vehicle_id, owner_id, type, date, km, notes, total_amount)
  values (input_company_id, input_vehicle_id, null, input_type, input_date, input_km,
    nullif(btrim(coalesce(input_notes, '')), ''), 0)
  returning id into created_service_id;

  for item in select value from jsonb_array_elements(input_items)
  loop
    line_name := btrim(coalesce(item ->> 'name', ''));
    line_unit := nullif(btrim(coalesce(item ->> 'unit', '')), '');
    quantity_text := coalesce(item ->> 'quantity', '');
    unit_price_text := coalesce(item ->> 'unitPrice', '');
    labor_cost_text := coalesce(item ->> 'laborCost', '');

    if line_name = '' or char_length(line_name) > 160
      or char_length(coalesce(line_unit, '')) > 16
      or quantity_text !~ '^([0-9]+)(\.[0-9]{1,3})?$'
      or unit_price_text !~ '^([0-9]+)(\.[0-9]{1,2})?$'
      or labor_cost_text !~ '^([0-9]+)(\.[0-9]{1,2})?$' then
      raise exception 'Every service line needs a valid description, quantity, unit price, and labour price.' using errcode = '22023';
    end if;

    line_quantity := quantity_text::numeric;
    line_unit_price := unit_price_text::numeric;
    line_labor_cost := labor_cost_text::numeric;
    line_material_cost := round(line_quantity * line_unit_price, 2);

    if line_quantity <= 0 or line_quantity > 1000000
      or line_unit_price < 0 or line_unit_price > 1000000
      or line_labor_cost < 0 or line_labor_cost > 1000000
      or line_material_cost + line_labor_cost <= 0 then
      raise exception 'A service line must have a positive total.' using errcode = '22023';
    end if;

    insert into public.service_items (
      company_id, service_id, owner_id, name, material_cost, labor_cost, fee,
      labor_discount_percent, quantity, unit_price, unit_label
    ) values (
      input_company_id, created_service_id, null, line_name, line_material_cost,
      line_labor_cost, 0, input_labor_discount_percent, line_quantity,
      line_unit_price, line_unit
    );
  end loop;

  return created_service_id;
end;
$$;

revoke all on function public.create_company_service_with_line_items(
  uuid, uuid, public.service_type, date, integer, text, jsonb, numeric
) from public, anon, authenticated, service_role;
grant execute on function public.create_company_service_with_line_items(
  uuid, uuid, public.service_type, date, integer, text, jsonb, numeric
) to authenticated;

notify pgrst, 'reload schema';
