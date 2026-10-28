-- Repair the atomic SaaS service + service-item write path without deleting
-- business data. Production previously retained owner-chain triggers that are
-- incompatible with company-scoped rows whose legacy owner_id is null.

do $remove_operational_owner_chain_triggers$
declare
  legacy_trigger record;
begin
  for legacy_trigger in
    select
      trigger_namespace.nspname as table_schema,
      trigger_table.relname as table_name,
      triggers.tgname as trigger_name
    from pg_catalog.pg_trigger triggers
    join pg_catalog.pg_class trigger_table on trigger_table.oid = triggers.tgrelid
    join pg_catalog.pg_namespace trigger_namespace on trigger_namespace.oid = trigger_table.relnamespace
    join pg_catalog.pg_proc trigger_function on trigger_function.oid = triggers.tgfoid
    where trigger_namespace.nspname = 'public'
      and trigger_table.relname in (
        'clients', 'vehicles', 'services', 'service_items', 'reminders',
        'invoices', 'client_intake_notes', 'gallery_images'
      )
      and not triggers.tgisinternal
      and position(
        'owner chain parent is missing'
        in lower(pg_catalog.pg_get_functiondef(trigger_function.oid))
      ) > 0
  loop
    execute format(
      'drop trigger %I on %I.%I',
      legacy_trigger.trigger_name,
      legacy_trigger.table_schema,
      legacy_trigger.table_name
    );
  end loop;
end;
$remove_operational_owner_chain_triggers$;

alter table public.services alter column owner_id drop not null;
alter table public.service_items alter column owner_id drop not null;

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
security definer
set search_path = public, pg_temp
as $$
declare
  created_service_id uuid;
  normalized_item_name text := btrim(coalesce(input_item_name, ''));
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

  if normalized_item_name = '' then
    raise exception 'Service item name is required.' using errcode = '22023';
  end if;

  if coalesce(input_material_cost, -1) < 0
    or coalesce(input_labor_cost, -1) < 0
    or coalesce(input_fee, -1) < 0
    or coalesce(input_labor_discount_percent, -1) < 0
    or input_labor_discount_percent > 100 then
    raise exception 'Service costs or discount are invalid.' using errcode = '22023';
  end if;

  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']::text[]
  ) then
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

  insert into public.services (
    company_id, vehicle_id, owner_id, type, date, km, notes, total_amount
  ) values (
    input_company_id, input_vehicle_id, null, input_type, input_date,
    input_km, nullif(btrim(coalesce(input_notes, '')), ''), 0
  )
  returning id into created_service_id;

  insert into public.service_items (
    company_id, service_id, owner_id, name, material_cost, labor_cost,
    fee, labor_discount_percent
  ) values (
    input_company_id, created_service_id, null, normalized_item_name,
    input_material_cost, input_labor_cost, input_fee,
    input_labor_discount_percent
  );

  return created_service_id;
end;
$$;

revoke all on function public.create_company_service_with_item(
  uuid, uuid, public.service_type, date, integer, text, text,
  numeric, numeric, numeric, numeric
) from public, anon, authenticated, service_role;

grant execute on function public.create_company_service_with_item(
  uuid, uuid, public.service_type, date, integer, text, text,
  numeric, numeric, numeric, numeric
) to authenticated;

-- Do not report success if an exact known blocker survived the repair.
do $verify_operational_owner_chain_triggers_removed$
begin
  if exists (
    select 1
    from pg_catalog.pg_trigger triggers
    join pg_catalog.pg_class trigger_table on trigger_table.oid = triggers.tgrelid
    join pg_catalog.pg_namespace trigger_namespace on trigger_namespace.oid = trigger_table.relnamespace
    join pg_catalog.pg_proc trigger_function on trigger_function.oid = triggers.tgfoid
    where trigger_namespace.nspname = 'public'
      and trigger_table.relname in ('services', 'service_items')
      and not triggers.tgisinternal
      and position(
        'owner chain parent is missing'
        in lower(pg_catalog.pg_get_functiondef(trigger_function.oid))
      ) > 0
  ) then
    raise exception 'Legacy owner-chain service trigger is still attached.';
  end if;
end;
$verify_operational_owner_chain_triggers_removed$;

notify pgrst, 'reload schema';
