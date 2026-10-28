-- Repairs the company-scoped customer and vehicle write RPCs without touching
-- existing customer, vehicle, company, invoice, or authentication data.

alter table public.clients
  alter column owner_id drop not null;

alter table public.vehicles
  alter column owner_id drop not null;

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
  normalized_first_name text := btrim(coalesce(input_first_name, ''));
  normalized_last_name text := btrim(coalesce(input_last_name, ''));
  normalized_phone text := btrim(coalesce(input_phone, ''));
  normalized_model text := nullif(btrim(coalesce(input_vehicle_model, '')), '');
  normalized_plate text := nullif(upper(regexp_replace(btrim(coalesce(input_vehicle_plate_number, '')), '[[:space:]]+', '', 'g')), '');
  normalized_vin text := nullif(btrim(coalesce(input_vehicle_vin, '')), '');
  has_vehicle boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if normalized_first_name = '' or normalized_last_name = '' or normalized_phone = '' then
    raise exception 'Customer first name, last name and phone are required.' using errcode = '22023';
  end if;

  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']) then
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
    normalized_first_name,
    normalized_last_name,
    normalized_phone,
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

create or replace function public.create_company_vehicle(
  input_client_id uuid,
  input_model text,
  input_plate_number text,
  input_vin text,
  input_current_km integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  scoped_client_id uuid;
  scoped_company_id uuid;
  created_vehicle_id uuid;
  normalized_model text := btrim(coalesce(input_model, ''));
  normalized_plate text := upper(regexp_replace(btrim(coalesce(input_plate_number, '')), '[[:space:]]+', '', 'g'));
  normalized_vin text := nullif(btrim(coalesce(input_vin, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if input_client_id is null then
    raise exception 'Customer is required.' using errcode = '22023';
  end if;

  if char_length(normalized_model) < 2 or char_length(normalized_model) > 120 then
    raise exception 'Vehicle model is invalid.' using errcode = '22023';
  end if;

  if char_length(normalized_plate) < 3 or char_length(normalized_plate) > 20 then
    raise exception 'Vehicle plate number is invalid.' using errcode = '22023';
  end if;

  if input_current_km is null or input_current_km < 0 or input_current_km > 2000000 then
    raise exception 'Vehicle odometer is invalid.' using errcode = '22023';
  end if;

  select c.id, c.company_id
  into scoped_client_id, scoped_company_id
  from public.clients c
  where c.id = input_client_id;

  if not found or scoped_company_id is null then
    raise exception 'Customer is not available.' using errcode = '42501';
  end if;

  if not public.has_company_role(scoped_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']) then
    raise exception 'You cannot create vehicles for this company.' using errcode = '42501';
  end if;

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
    scoped_company_id,
    scoped_client_id,
    null,
    normalized_model,
    normalized_plate,
    normalized_vin,
    input_current_km
  )
  returning id into created_vehicle_id;

  return created_vehicle_id;
end;
$$;

revoke all on function public.create_company_customer_with_vehicle(uuid, text, text, text, boolean, text, text, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.create_company_vehicle(uuid, text, text, text, integer) from public, anon, authenticated, service_role;

grant execute on function public.create_company_customer_with_vehicle(uuid, text, text, text, boolean, text, text, text, integer) to authenticated;
grant execute on function public.create_company_vehicle(uuid, text, text, text, integer) to authenticated;

select jsonb_build_object(
  'clients_owner_id_nullable', (
    select is_nullable = 'YES'
    from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'owner_id'
  ),
  'vehicles_owner_id_nullable', (
    select is_nullable = 'YES'
    from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicles' and column_name = 'owner_id'
  ),
  'customer_rpc_exists', to_regprocedure('public.create_company_customer_with_vehicle(uuid,text,text,text,boolean,text,text,text,integer)') is not null,
  'vehicle_rpc_exists', to_regprocedure('public.create_company_vehicle(uuid,text,text,text,integer)') is not null
) as company_write_repair;
