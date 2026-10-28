-- Remove production-only triggers left by the retired owner_id authorization
-- model. These triggers reject valid SaaS rows whose owner_id is intentionally
-- null with SQLSTATE 23503 and "owner chain parent is missing".
--
-- Selection is deliberately narrow: only non-internal triggers on clients or
-- vehicles whose trigger function contains that exact legacy error message.
-- No table rows, constraints, policies, or unrelated triggers are changed.

do $remove_legacy_owner_chain_triggers$
declare
  legacy_trigger record;
begin
  for legacy_trigger in
    select
      trigger_namespace.nspname as table_schema,
      trigger_table.relname as table_name,
      triggers.tgname as trigger_name
    from pg_catalog.pg_trigger triggers
    join pg_catalog.pg_class trigger_table
      on trigger_table.oid = triggers.tgrelid
    join pg_catalog.pg_namespace trigger_namespace
      on trigger_namespace.oid = trigger_table.relnamespace
    join pg_catalog.pg_proc trigger_function
      on trigger_function.oid = triggers.tgfoid
    where trigger_namespace.nspname = 'public'
      and trigger_table.relname in ('clients', 'vehicles')
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
$remove_legacy_owner_chain_triggers$;

-- Fail atomically if the targeted blocker is still attached. This prevents a
-- false-success result in the hosted SQL editor.
do $verify_legacy_owner_chain_triggers_removed$
begin
  if exists (
    select 1
    from pg_catalog.pg_trigger triggers
    join pg_catalog.pg_class trigger_table
      on trigger_table.oid = triggers.tgrelid
    join pg_catalog.pg_namespace trigger_namespace
      on trigger_namespace.oid = trigger_table.relnamespace
    join pg_catalog.pg_proc trigger_function
      on trigger_function.oid = triggers.tgfoid
    where trigger_namespace.nspname = 'public'
      and trigger_table.relname in ('clients', 'vehicles')
      and not triggers.tgisinternal
      and position(
        'owner chain parent is missing'
        in lower(pg_catalog.pg_get_functiondef(trigger_function.oid))
      ) > 0
  ) then
    raise exception 'Legacy owner-chain trigger is still attached.';
  end if;
end;
$verify_legacy_owner_chain_triggers_removed$;

notify pgrst, 'reload schema';
