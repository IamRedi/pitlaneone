-- Service totals are derived from company-scoped line items, so future
-- invoices can rely on a single database-backed source of truth.
create or replace function public.sync_company_service_total_from_items()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_service_id uuid;
  target_company_id uuid;
begin
  if tg_op = 'DELETE' then
    target_service_id := old.service_id;
    target_company_id := old.company_id;
  else
    target_service_id := new.service_id;
    target_company_id := new.company_id;
  end if;

  if target_company_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  update public.services
  set total_amount = coalesce((
    select sum(
      item.material_cost
      + item.fee
      + item.labor_cost * (1 - item.labor_discount_percent / 100)
    )
    from public.service_items item
    where item.service_id = target_service_id
      and item.company_id = target_company_id
  ), 0)
  where id = target_service_id
    and company_id = target_company_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_company_service_total_from_items on public.service_items;

create trigger sync_company_service_total_from_items
after insert or update or delete on public.service_items
for each row execute function public.sync_company_service_total_from_items();

create or replace function public.create_company_service_with_item(
  input_company_id uuid,
  input_vehicle_id uuid,
  input_type public.service_type,
  input_date date,
  input_km integer,
  input_notes text,
  input_item_name text,
  input_material_cost numeric,
  input_labor_cost numeric,
  input_fee numeric,
  input_labor_discount_percent numeric
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_service_id uuid;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']) then
    raise exception 'Company operator access is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.vehicles vehicle
    where vehicle.id = input_vehicle_id
      and vehicle.company_id = input_company_id
  ) then
    raise exception 'Vehicle is outside the active company.' using errcode = '23503';
  end if;

  insert into public.services (company_id, vehicle_id, type, date, km, notes, total_amount)
  values (input_company_id, input_vehicle_id, input_type, input_date, input_km, nullif(input_notes, ''), 0)
  returning id into created_service_id;

  insert into public.service_items (
    company_id,
    service_id,
    name,
    material_cost,
    labor_cost,
    fee,
    labor_discount_percent
  )
  values (
    input_company_id,
    created_service_id,
    input_item_name,
    input_material_cost,
    input_labor_cost,
    input_fee,
    input_labor_discount_percent
  );

  return created_service_id;
end;
$$;

grant execute on function public.create_company_service_with_item(
  uuid, uuid, public.service_type, date, integer, text, text, numeric, numeric, numeric, numeric
) to authenticated;
