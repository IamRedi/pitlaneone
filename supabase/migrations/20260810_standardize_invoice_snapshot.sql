-- Standardize the immutable invoice snapshot required by the hosted schema.
-- The production database already has this NOT NULL column; clean/local
-- databases receive the same jsonb column so both environments converge.

alter table public.invoices
  add column if not exists invoice_snapshot jsonb;

do $verify_invoice_snapshot_type$
declare
  snapshot_type text;
begin
  select columns.udt_name
    into snapshot_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'invoices'
    and columns.column_name = 'invoice_snapshot';

  if snapshot_type is distinct from 'jsonb' then
    raise exception 'invoices.invoice_snapshot must be jsonb, found %.', snapshot_type;
  end if;
end;
$verify_invoice_snapshot_type$;

-- Backfill only historical rows that predate the standardized snapshot. No
-- invoice totals or relationships are changed.
update public.invoices invoice
set invoice_snapshot = jsonb_build_object(
  'version', 1,
  'captured_at', coalesce(invoice.updated_at, now()),
  'company_id', invoice.company_id,
  'client_id', invoice.client_id,
  'service_id', invoice.service_id,
  'invoice_number', invoice.invoice_number,
  'currency', invoice.currency,
  'issued_at', invoice.issued_at,
  'due_date', invoice.due_date,
  'total_amount', invoice.total_amount,
  'historical_backfill', true
)
where invoice.invoice_snapshot is null;

alter table public.invoices
  alter column invoice_snapshot set not null;

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
  captured_snapshot jsonb;
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

  select
    service.id,
    service.type::text as service_type,
    service.date as service_date,
    service.km,
    service.notes,
    service.total_amount,
    vehicle.id as vehicle_id,
    vehicle.model as vehicle_model,
    vehicle.plate_number,
    vehicle.vin,
    client.id as client_id,
    client.first_name,
    client.last_name,
    client.phone
  into source_service
  from public.services service
  join public.vehicles vehicle
    on vehicle.id = service.vehicle_id
    and vehicle.company_id = service.company_id
  join public.clients client
    on client.id = vehicle.client_id
    and client.company_id = vehicle.company_id
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

  select jsonb_build_object(
    'version', 1,
    'captured_at', now(),
    'company_id', input_company_id,
    'invoice_number', generated_invoice_number,
    'currency', 'EUR',
    'issued_at', current_date,
    'due_date', input_due_date,
    'client', jsonb_build_object(
      'id', source_service.client_id,
      'first_name', source_service.first_name,
      'last_name', source_service.last_name,
      'phone', source_service.phone
    ),
    'vehicle', jsonb_build_object(
      'id', source_service.vehicle_id,
      'model', source_service.vehicle_model,
      'plate_number', source_service.plate_number,
      'vin', source_service.vin
    ),
    'service', jsonb_build_object(
      'id', source_service.id,
      'type', source_service.service_type,
      'date', source_service.service_date,
      'km', source_service.km,
      'notes', source_service.notes,
      'total_amount', source_service.total_amount
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'name', item.name,
          'material_cost', item.material_cost,
          'labor_cost', item.labor_cost,
          'fee', item.fee,
          'labor_discount_percent', item.labor_discount_percent
        ) order by item.id
      )
      from public.service_items item
      where item.service_id = source_service.id
        and item.company_id = input_company_id
    ), '[]'::jsonb),
    'total_amount', source_service.total_amount
  ) into captured_snapshot;

  insert into public.invoices (
    company_id, client_id, service_id, owner_id, invoice_number, currency,
    issued_at, due_date, status, amount_paid, total_amount, invoice_snapshot
  ) values (
    input_company_id, source_service.client_id, input_service_id, null,
    generated_invoice_number, 'EUR', current_date, input_due_date,
    'issued', 0, source_service.total_amount, captured_snapshot
  )
  returning id into created_invoice_id;

  return created_invoice_id;
end;
$$;

revoke all on function public.create_company_invoice_from_service(uuid, uuid, date)
  from public, anon, authenticated, service_role;
grant execute on function public.create_company_invoice_from_service(uuid, uuid, date)
  to authenticated;

notify pgrst, 'reload schema';
