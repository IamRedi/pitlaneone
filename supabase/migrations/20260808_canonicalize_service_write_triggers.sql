-- Canonicalize every user trigger reached by the atomic service write.
--
-- The hosted database retained an indirect legacy owner-chain trigger: its
-- trigger function calls another helper that raises "owner chain parent is
-- missing", so filtering only the direct function body could not find it.
-- Keep exactly the supported repo triggers and remove production-only drift.

do $canonicalize_service_write_triggers$
declare
  unexpected_trigger record;
begin
  for unexpected_trigger in
    select
      trigger_namespace.nspname as table_schema,
      trigger_table.relname as table_name,
      triggers.tgname as trigger_name
    from pg_catalog.pg_trigger triggers
    join pg_catalog.pg_class trigger_table on trigger_table.oid = triggers.tgrelid
    join pg_catalog.pg_namespace trigger_namespace on trigger_namespace.oid = trigger_table.relnamespace
    where trigger_namespace.nspname = 'public'
      and trigger_table.relname in ('vehicles', 'services', 'service_items')
      and not triggers.tgisinternal
      and not (
        (trigger_table.relname = 'vehicles' and triggers.tgname in (
          'set_vehicles_updated_at'
        ))
        or
        (trigger_table.relname = 'services' and triggers.tgname in (
          'set_services_updated_at',
          'sync_vehicle_current_km_from_service',
          'prevent_invoiced_service_total_change'
        ))
        or
        (trigger_table.relname = 'service_items' and triggers.tgname in (
          'set_service_items_updated_at',
          'sync_company_service_total_from_items',
          'prevent_invoiced_service_item_mutation'
        ))
      )
  loop
    execute format(
      'drop trigger %I on %I.%I',
      unexpected_trigger.trigger_name,
      unexpected_trigger.table_schema,
      unexpected_trigger.table_name
    );
  end loop;
end;
$canonicalize_service_write_triggers$;

-- Re-attach the supported triggers to known functions and event definitions.
drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_service_items_updated_at on public.service_items;
create trigger set_service_items_updated_at
before update on public.service_items
for each row execute function public.set_updated_at();

drop trigger if exists sync_vehicle_current_km_from_service on public.services;
create trigger sync_vehicle_current_km_from_service
after insert or update of km, vehicle_id, company_id on public.services
for each row execute function public.sync_vehicle_current_km_from_service();

drop trigger if exists sync_company_service_total_from_items on public.service_items;
create trigger sync_company_service_total_from_items
after insert or update or delete on public.service_items
for each row execute function public.sync_company_service_total_from_items();

drop trigger if exists prevent_invoiced_service_item_mutation on public.service_items;
create trigger prevent_invoiced_service_item_mutation
before insert or update or delete on public.service_items
for each row execute function public.prevent_invoiced_service_item_mutation();

drop trigger if exists prevent_invoiced_service_total_change on public.services;
create trigger prevent_invoiced_service_total_change
before update on public.services
for each row execute function public.prevent_invoiced_service_total_change();

-- Verify the allowlist rather than returning a misleading success result.
do $verify_service_write_trigger_allowlist$
begin
  if exists (
    select 1
    from pg_catalog.pg_trigger triggers
    join pg_catalog.pg_class trigger_table on trigger_table.oid = triggers.tgrelid
    join pg_catalog.pg_namespace trigger_namespace on trigger_namespace.oid = trigger_table.relnamespace
    where trigger_namespace.nspname = 'public'
      and trigger_table.relname in ('vehicles', 'services', 'service_items')
      and not triggers.tgisinternal
      and not (
        (trigger_table.relname = 'vehicles' and triggers.tgname = 'set_vehicles_updated_at')
        or
        (trigger_table.relname = 'services' and triggers.tgname in (
          'set_services_updated_at',
          'sync_vehicle_current_km_from_service',
          'prevent_invoiced_service_total_change'
        ))
        or
        (trigger_table.relname = 'service_items' and triggers.tgname in (
          'set_service_items_updated_at',
          'sync_company_service_total_from_items',
          'prevent_invoiced_service_item_mutation'
        ))
      )
  ) then
    raise exception 'Unexpected service-write trigger is still attached.';
  end if;
end;
$verify_service_write_trigger_allowlist$;

notify pgrst, 'reload schema';
