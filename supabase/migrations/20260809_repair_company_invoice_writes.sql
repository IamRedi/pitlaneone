-- Repair company invoice issuance after the SaaS owner_id cutover.
-- Existing invoices and sequence values are preserved.

alter table public.invoices alter column owner_id drop not null;

-- invoices has one supported user trigger in the repository. Remove indirect
-- production-only owner-chain triggers, then attach the canonical trigger.
do $canonicalize_invoice_triggers$
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
      and trigger_table.relname = 'invoices'
      and not triggers.tgisinternal
      and triggers.tgname <> 'set_invoices_updated_at'
  loop
    execute format(
      'drop trigger %I on %I.%I',
      unexpected_trigger.trigger_name,
      unexpected_trigger.table_schema,
      unexpected_trigger.table_name
    );
  end loop;
end;
$canonicalize_invoice_triggers$;

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create or replace function public.create_company_invoice_from_service(
  input_company_id uuid,
  input_service_id uuid,
  input_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_service record;
  created_invoice_id uuid;
  sequence_number integer;
  generated_invoice_number text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'accounting']::text[]
  ) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;

  if input_due_date is not null and input_due_date < current_date then
    raise exception 'The due date cannot be in the past.' using errcode = '22007';
  end if;

  select service.id, vehicle.client_id, service.total_amount
    into source_service
  from public.services service
  join public.vehicles vehicle
    on vehicle.id = service.vehicle_id
    and vehicle.company_id = service.company_id
  where service.id = input_service_id
    and service.company_id = input_company_id;

  if not found then
    raise exception 'Service is outside the active company.' using errcode = '23503';
  end if;

  if source_service.total_amount <= 0 then
    raise exception 'A service needs a positive total before invoicing.' using errcode = '22023';
  end if;

  insert into public.company_invoice_sequences (company_id, next_number)
  values (input_company_id, 2)
  on conflict (company_id) do update
    set next_number = public.company_invoice_sequences.next_number + 1
  returning next_number - 1 into sequence_number;

  generated_invoice_number := format(
    'F-%s-%s',
    to_char(current_date, 'YYYY'),
    lpad(sequence_number::text, 6, '0')
  );

  insert into public.invoices (
    company_id, client_id, service_id, owner_id, invoice_number, currency,
    issued_at, due_date, status, amount_paid, total_amount
  ) values (
    input_company_id, source_service.client_id, input_service_id, null,
    generated_invoice_number, 'EUR', current_date, input_due_date,
    'issued', 0, source_service.total_amount
  )
  returning id into created_invoice_id;

  return created_invoice_id;
end;
$$;

revoke all on function public.create_company_invoice_from_service(uuid, uuid, date)
  from public, anon, authenticated, service_role;
grant execute on function public.create_company_invoice_from_service(uuid, uuid, date)
  to authenticated;

-- Payment updates must use the same repaired helper and the security-definer
-- path because direct invoice mutations remain revoked from browser roles.
create or replace function public.record_company_invoice_payment(
  input_company_id uuid,
  input_invoice_id uuid,
  input_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_invoice public.invoices%rowtype;
  next_amount_paid numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'accounting']::text[]
  ) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;

  if input_amount is null or input_amount <= 0 then
    raise exception 'Payment amount must be positive.' using errcode = '22023';
  end if;

  select * into target_invoice
  from public.invoices
  where id = input_invoice_id
    and company_id = input_company_id
  for update;

  if not found then
    raise exception 'Invoice is outside the active company.' using errcode = '23503';
  end if;

  if target_invoice.status not in ('issued', 'partial') then
    raise exception 'Only issued or partial invoices can receive a payment.' using errcode = '55000';
  end if;

  next_amount_paid := target_invoice.amount_paid + input_amount;
  if next_amount_paid > target_invoice.total_amount then
    raise exception 'Payment exceeds the remaining invoice balance.' using errcode = '22023';
  end if;

  update public.invoices
  set amount_paid = next_amount_paid,
      status = case
        when next_amount_paid = total_amount then 'paid'::public.invoice_status
        else 'partial'::public.invoice_status
      end
  where id = target_invoice.id
    and company_id = input_company_id;

  return target_invoice.id;
end;
$$;

revoke all on function public.record_company_invoice_payment(uuid, uuid, numeric)
  from public, anon, authenticated, service_role;
grant execute on function public.record_company_invoice_payment(uuid, uuid, numeric)
  to authenticated;

revoke insert, update, delete on public.invoices from authenticated;
grant select on public.invoices to authenticated;

notify pgrst, 'reload schema';
