-- Create a tenant-scoped customer and optional first vehicle atomically.
-- This does not alter legacy rows that have no company_id.

create or replace function public.create_company_customer_with_vehicle(
  input_company_id uuid,
  input_first_name text,
  input_last_name text,
  input_phone text,
  input_is_vip boolean,
  input_vehicle_model text default null,
  input_vehicle_plate_number text default null,
  input_vehicle_vin text default null,
  input_vehicle_current_km integer default null
)
returns table (client_id uuid, vehicle_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_client_id uuid;
  created_vehicle_id uuid;
  normalized_model text := nullif(btrim(coalesce(input_vehicle_model, '')), '');
  normalized_plate text := nullif(upper(regexp_replace(btrim(coalesce(input_vehicle_plate_number, '')), '\s+', '', 'g')), '');
  normalized_vin text := nullif(btrim(coalesce(input_vehicle_vin, '')), '');
  has_vehicle boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']
  ) then
    raise exception 'You cannot create customers for this company.' using errcode = '42501';
  end if;

  has_vehicle := normalized_model is not null
    or normalized_plate is not null
    or normalized_vin is not null
    or input_vehicle_current_km is not null;

  if has_vehicle and (normalized_model is null or normalized_plate is null) then
    raise exception 'Vehicle model and plate number are required.' using errcode = '22023';
  end if;

  if input_vehicle_current_km is not null
    and (input_vehicle_current_km < 0 or input_vehicle_current_km > 2000000) then
    raise exception 'Vehicle odometer is invalid.' using errcode = '22023';
  end if;

  insert into public.clients (
    company_id,
    first_name,
    last_name,
    phone,
    is_vip,
    pin_hash
  )
  values (
    input_company_id,
    btrim(input_first_name),
    btrim(input_last_name),
    btrim(input_phone),
    coalesce(input_is_vip, false),
    ''
  )
  returning id into created_client_id;

  if has_vehicle then
    insert into public.vehicles (
      company_id,
      client_id,
      owner_id,
      model,
      plate_number,
      vin,
      current_km
    )
    values (
      input_company_id,
      created_client_id,
      null,
      normalized_model,
      normalized_plate,
      normalized_vin,
      coalesce(input_vehicle_current_km, 0)
    )
    returning id into created_vehicle_id;
  end if;

  return query select created_client_id, created_vehicle_id;
end;
$$;

revoke execute on function public.create_company_customer_with_vehicle(uuid, text, text, text, boolean, text, text, text, integer) from public;
grant execute on function public.create_company_customer_with_vehicle(uuid, text, text, text, boolean, text, text, text, integer) to authenticated;
