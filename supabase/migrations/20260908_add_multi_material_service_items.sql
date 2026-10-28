-- A service can consume several physical materials. Keep the existing
-- service_items ledger, but write one labour row and one row for each material
-- in a single transaction so invoices retain a complete, immutable breakdown.
create or replace function public.create_company_service_with_items(
  input_company_id uuid,
  input_vehicle_id uuid,
  input_type public.service_type,
  input_date date,
  input_km integer,
  input_notes text,
  input_work_name text,
  input_labor_cost numeric,
  input_fee numeric,
  input_labor_discount_percent numeric,
  input_materials jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_service_id uuid;
  normalized_work_name text := btrim(coalesce(input_work_name, ''));
  material jsonb;
  material_name text;
  material_cost numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if input_company_id is null or input_vehicle_id is null then
    raise exception 'Company and vehicle are required.' using errcode = '22023';
  end if;

  if input_date is null or input_km is null or input_km < 0 or input_km > 2000000 then
    raise exception 'Service date or odometer is invalid.' using errcode = '22023';
  end if;

  if normalized_work_name = '' then
    raise exception 'Service work description is required.' using errcode = '22023';
  end if;

  if coalesce(input_labor_cost, -1) < 0
    or coalesce(input_fee, -1) < 0
    or coalesce(input_labor_discount_percent, -1) < 0
    or input_labor_discount_percent > 100
    or jsonb_typeof(coalesce(input_materials, '[]'::jsonb)) <> 'array' then
    raise exception 'Service costs, discount, or materials are invalid.' using errcode = '22023';
  end if;

  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']::text[]
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
    company_id, vehicle_id, owner_id, type, date, km, notes, total_amount
  ) values (
    input_company_id, input_vehicle_id, null, input_type, input_date,
    input_km, nullif(btrim(coalesce(input_notes, '')), ''), 0
  ) returning id into created_service_id;

  insert into public.service_items (
    company_id, service_id, owner_id, name, material_cost, labor_cost,
    fee, labor_discount_percent
  ) values (
    input_company_id, created_service_id, null, normalized_work_name, 0,
    input_labor_cost, input_fee, input_labor_discount_percent
  );

  for material in select value from jsonb_array_elements(coalesce(input_materials, '[]'::jsonb))
  loop
    material_name := btrim(coalesce(material ->> 'name', ''));
    begin
      material_cost := (material ->> 'cost')::numeric;
    exception when invalid_text_representation then
      raise exception 'Material cost is invalid.' using errcode = '22023';
    end;

    if material_name = '' or char_length(material_name) > 160
      or material_cost is null or material_cost <= 0 or material_cost > 1000000 then
      raise exception 'Each material needs a name and a positive gross price.' using errcode = '22023';
    end if;

    insert into public.service_items (
      company_id, service_id, owner_id, name, material_cost, labor_cost,
      fee, labor_discount_percent
    ) values (
      input_company_id, created_service_id, null, material_name, material_cost,
      0, 0, 0
    );
  end loop;

  return created_service_id;
end;
$$;

revoke all on function public.create_company_service_with_items(
  uuid, uuid, public.service_type, date, integer, text, text, numeric,
  numeric, numeric, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.create_company_service_with_items(
  uuid, uuid, public.service_type, date, integer, text, text, numeric,
  numeric, numeric, jsonb
) to authenticated;

notify pgrst, 'reload schema';
