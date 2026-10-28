-- Canonical repair for SaaS customer and vehicle writes.
--
-- This migration is intentionally idempotent and does not delete business data.
-- It repairs the authorization helper first, then the two RPCs and their RLS
-- policies in one transaction (Supabase migrations are applied transactionally).

-- Production has previously contained both text and enum-backed company roles.
-- Comparing through text keeps this helper compatible with either physical type.
create or replace function public.has_company_role(
  input_company_id uuid,
  input_user_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.company_users cu
    join public.companies c on c.id = cu.company_id
    where cu.company_id = input_company_id
      and cu.user_id = input_user_id
      and cu.role::text = any(allowed_roles)
      and cu.is_active is true
      and c.status::text = 'active'
  );
$$;

create or replace function public.is_company_member(
  input_company_id uuid,
  input_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.company_users cu
    join public.companies c on c.id = cu.company_id
    where cu.company_id = input_company_id
      and cu.user_id = input_user_id
      and cu.is_active is true
      and c.status::text = 'active'
  );
$$;

-- If an older production migration created an enum overload, repair it too.
-- Dynamic SQL is required because clean installations do not have this enum.
do $repair_enum_overload$
begin
  if exists (
    select 1
    from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'company_role'
  ) then
    execute $function$
      create or replace function public.has_company_role(
        input_company_id uuid,
        input_user_id uuid,
        allowed_roles public.company_role[]
      )
      returns boolean
      language sql
      stable
      security definer
      set search_path = public, pg_temp
      as 'select public.has_company_role(input_company_id, input_user_id, allowed_roles::text[])'
    $function$;

    execute 'revoke all on function public.has_company_role(uuid, uuid, public.company_role[]) from public';
    execute 'grant execute on function public.has_company_role(uuid, uuid, public.company_role[]) to authenticated';
  end if;
end;
$repair_enum_overload$;

revoke all on function public.has_company_role(uuid, uuid, text[]) from public;
revoke all on function public.is_company_member(uuid, uuid) from public;
grant execute on function public.has_company_role(uuid, uuid, text[]) to authenticated;
grant execute on function public.is_company_member(uuid, uuid) to authenticated;

-- owner_id belongs to the retired single-workshop authorization model. Keep the
-- column and all legacy values, but do not require it for company-scoped rows.
alter table public.clients alter column owner_id drop not null;
alter table public.vehicles alter column owner_id drop not null;

-- Restore tenant-safe phone uniqueness if an older production schema retained
-- the original global clients(phone) constraint.
alter table public.clients drop constraint if exists clients_phone_key;
create unique index if not exists clients_company_phone_unique_idx
  on public.clients (company_id, phone)
  where company_id is not null;
create unique index if not exists clients_legacy_phone_unique_idx
  on public.clients (phone)
  where company_id is null;

create index if not exists clients_company_id_idx on public.clients (company_id);
create index if not exists vehicles_company_id_idx on public.vehicles (company_id);

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
set search_path = public, pg_temp
as $$
declare
  created_client_id uuid;
  created_vehicle_id uuid;
  normalized_first_name text := btrim(coalesce(input_first_name, ''));
  normalized_last_name text := btrim(coalesce(input_last_name, ''));
  normalized_phone text := btrim(coalesce(input_phone, ''));
  normalized_model text := nullif(btrim(coalesce(input_vehicle_model, '')), '');
  normalized_plate text := nullif(upper(regexp_replace(btrim(coalesce(input_vehicle_plate_number, '')), '[[:space:]]+', '', 'g')), '');
  normalized_vin text := nullif(upper(btrim(coalesce(input_vehicle_vin, ''))), '');
  has_vehicle boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if input_company_id is null then
    raise exception 'Company is required.' using errcode = '22023';
  end if;

  if normalized_first_name = '' or normalized_last_name = '' or normalized_phone = '' then
    raise exception 'Customer first name, last name and phone are required.' using errcode = '22023';
  end if;

  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']::text[]
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
    company_id, owner_id, first_name, last_name, phone, is_vip, pin_hash
  ) values (
    input_company_id, null, normalized_first_name, normalized_last_name,
    normalized_phone, coalesce(input_is_vip, false), ''
  )
  returning id into created_client_id;

  if has_vehicle then
    insert into public.vehicles (
      company_id, client_id, owner_id, model, plate_number, vin, current_km
    ) values (
      input_company_id, created_client_id, null, normalized_model,
      normalized_plate, normalized_vin, coalesce(input_vehicle_current_km, 0)
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
set search_path = public, pg_temp
as $$
declare
  scoped_company_id uuid;
  created_vehicle_id uuid;
  normalized_model text := btrim(coalesce(input_model, ''));
  normalized_plate text := upper(regexp_replace(btrim(coalesce(input_plate_number, '')), '[[:space:]]+', '', 'g'));
  normalized_vin text := nullif(upper(btrim(coalesce(input_vin, ''))), '');
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

  select c.company_id
    into scoped_company_id
  from public.clients c
  where c.id = input_client_id;

  if not found or scoped_company_id is null then
    raise exception 'Customer is not available.' using errcode = '42501';
  end if;

  if not public.has_company_role(
    scoped_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']::text[]
  ) then
    raise exception 'You cannot create vehicles for this company.' using errcode = '42501';
  end if;

  insert into public.vehicles (
    company_id, client_id, owner_id, model, plate_number, vin, current_km
  ) values (
    scoped_company_id, input_client_id, null, normalized_model,
    normalized_plate, normalized_vin, input_current_km
  )
  returning id into created_vehicle_id;

  return created_vehicle_id;
end;
$$;

revoke all on function public.create_company_customer_with_vehicle(uuid, text, text, text, boolean, text, text, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.create_company_vehicle(uuid, text, text, text, integer) from public, anon, authenticated, service_role;
grant execute on function public.create_company_customer_with_vehicle(uuid, text, text, text, boolean, text, text, text, integer) to authenticated;
grant execute on function public.create_company_vehicle(uuid, text, text, text, integer) to authenticated;

alter table public.clients enable row level security;
alter table public.vehicles enable row level security;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;

-- Replace both legacy and canonical policies so production ends in one known
-- authorization state even when its migration history has drifted.
drop policy if exists "admins read own clients" on public.clients;
drop policy if exists "admins insert own clients" on public.clients;
drop policy if exists "admins update own clients" on public.clients;
drop policy if exists "clients read self" on public.clients;
drop policy if exists "company members read clients" on public.clients;
drop policy if exists "clients read own profile" on public.clients;
drop policy if exists "company operators manage clients" on public.clients;

create policy "company members read clients"
on public.clients for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own profile"
on public.clients for select to authenticated
using (auth_user_id = auth.uid());

create policy "company operators manage clients"
on public.clients for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "vehicles visible to owner and client" on public.vehicles;
drop policy if exists "vehicles writable by owner" on public.vehicles;
drop policy if exists "company members read vehicles" on public.vehicles;
drop policy if exists "clients read own vehicles" on public.vehicles;
drop policy if exists "company operators manage vehicles" on public.vehicles;

create policy "company members read vehicles"
on public.vehicles for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own vehicles"
on public.vehicles for select to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = vehicles.client_id
      and c.company_id = vehicles.company_id
      and c.auth_user_id = auth.uid()
  )
);

create policy "company operators manage vehicles"
on public.vehicles for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

-- Ask PostgREST to refresh RPC signatures immediately after deployment.
notify pgrst, 'reload schema';
