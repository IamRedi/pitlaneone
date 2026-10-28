-- Repair the company-scoped vehicle write path after the single-workshop
-- cutover. This migration is safe to run after the earlier SaaS migrations.
-- Legacy owner_id is audit metadata only and must not block SaaS operators.

alter table public.vehicles
  alter column owner_id drop not null;

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
  normalized_plate text := upper(regexp_replace(btrim(coalesce(input_plate_number, '')), '\\s+', '', 'g'));
  normalized_vin text := nullif(btrim(coalesce(input_vin, '')), '');
begin
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

  if not public.has_company_role(
    scoped_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']
  ) then
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

revoke execute on function public.create_company_vehicle(uuid, text, text, text, integer) from public;
grant execute on function public.create_company_vehicle(uuid, text, text, text, integer) to authenticated;
