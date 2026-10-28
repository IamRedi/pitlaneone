-- Give every issued invoice an append-only audit trail and an immutable
-- document archive.  The PDF is stored in the private invoice-archive bucket;
-- structured XML can be registered separately without replacing the PDF.

alter table public.company_invoice_settings
  add column if not exists default_currency text not null default 'EUR',
  add column if not exists all_per_eur_rate numeric(12,4) not null default 100;

alter table public.company_invoice_settings
  drop constraint if exists company_invoice_settings_default_currency_check,
  add constraint company_invoice_settings_default_currency_check
    check (default_currency in ('EUR', 'ALL')),
  drop constraint if exists company_invoice_settings_all_per_eur_rate_check,
  add constraint company_invoice_settings_all_per_eur_rate_check
    check (all_per_eur_rate > 0 and all_per_eur_rate <= 1000000);

update public.company_invoice_settings
set default_currency = case when registration_country = 'AL' then 'ALL' else 'EUR' end,
    all_per_eur_rate = coalesce(nullif(all_per_eur_rate, 0), 100)
where registration_country = 'AL' or all_per_eur_rate <= 0;

alter table public.invoices
  add column if not exists created_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists exchange_rate numeric(12,4) not null default 1,
  add column if not exists invoice_kind text not null default 'invoice',
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists finalized_at timestamptz,
  add column if not exists related_invoice_id uuid references public.invoices(id) on delete restrict,
  add column if not exists cancelled_by_invoice_id uuid references public.invoices(id) on delete restrict,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancel_reason text;

update public.invoices
set created_at = coalesce(created_at, updated_at, issued_at::timestamptz)
where created_at is null;

update public.invoices
set finalized_at = coalesce(finalized_at, created_at, updated_at, issued_at::timestamptz)
where finalized_at is null;

alter table public.invoices
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column finalized_at set default now(),
  alter column finalized_at set not null,
  drop constraint if exists invoices_invoice_kind_check,
  add constraint invoices_invoice_kind_check
    check (invoice_kind in ('invoice', 'storno', 'correction')),
  drop constraint if exists invoices_lifecycle_status_check,
  add constraint invoices_lifecycle_status_check
    check (lifecycle_status in ('active', 'cancelled')),
  drop constraint if exists invoices_cancel_reason_length,
  add constraint invoices_cancel_reason_length
    check (cancel_reason is null or char_length(cancel_reason) between 5 and 500);

create index if not exists invoices_company_finalized_idx
  on public.invoices(company_id, finalized_at desc);
create index if not exists invoices_company_created_by_date_idx
  on public.invoices(company_id, created_by, issued_at desc);
create index if not exists invoices_related_invoice_idx
  on public.invoices(company_id, related_invoice_id)
  where related_invoice_id is not null;

create or replace function public.assign_company_record_creator()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.created_by is null and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists assign_company_invoice_creator on public.invoices;
create trigger assign_company_invoice_creator
before insert on public.invoices
for each row execute function public.assign_company_record_creator();

-- Storno documents deliberately carry negative totals.  Ordinary and
-- correction invoices remain non-negative.
alter table public.invoices
  drop constraint if exists invoices_non_negative_amounts,
  drop constraint if exists invoices_paid_amount_within_total,
  drop constraint if exists invoices_official_totals_non_negative,
  drop constraint if exists invoices_signed_totals_check,
  drop constraint if exists invoices_tax_rate_range,
  add constraint invoices_signed_totals_check check (
    (
      invoice_kind in ('invoice', 'correction')
      and material_total >= 0 and labor_total >= 0 and fee_total >= 0
      and net_amount >= 0 and tax_amount >= 0 and total_amount >= 0
      and amount_paid >= 0 and amount_paid <= total_amount
    ) or (
      invoice_kind = 'storno'
      and material_total <= 0 and labor_total <= 0 and fee_total <= 0
      and net_amount <= 0 and tax_amount <= 0 and total_amount <= 0
      and amount_paid = 0
    )
  ),
  add constraint invoices_tax_rate_range check (tax_rate between 0 and 100);

create table if not exists public.invoice_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  document_format text not null check (document_format in ('pdf', 'xml')),
  mime_type text not null,
  original_filename text not null,
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint not null check (size_bytes > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (invoice_id, document_format)
);

create index if not exists invoice_documents_company_created_idx
  on public.invoice_documents(company_id, created_at desc);

create table if not exists public.invoice_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  event_type text not null check (event_type in (
    'issued', 'payment_updated', 'cancelled', 'storno_issued',
    'pdf_archived', 'xml_archived'
  )),
  event_data jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_events_invoice_created_idx
  on public.invoice_events(company_id, invoice_id, created_at asc, id asc);

alter table public.invoice_documents enable row level security;
alter table public.invoice_events enable row level security;

drop policy if exists "company members read invoice documents" on public.invoice_documents;
create policy "company members read invoice documents"
on public.invoice_documents for select to authenticated
using (public.has_company_role(
  company_id, auth.uid(),
  array['owner','admin','manager','staff','accounting','viewer']::text[]
));

drop policy if exists "company members read invoice events" on public.invoice_events;
create policy "company members read invoice events"
on public.invoice_events for select to authenticated
using (public.has_company_role(
  company_id, auth.uid(),
  array['owner','admin','manager','staff','accounting','viewer']::text[]
));

revoke insert, update, delete on public.invoice_documents from authenticated;
revoke insert, update, delete on public.invoice_events from authenticated;
grant select on public.invoice_documents, public.invoice_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoice-archive', 'invoice-archive', false, 10485760,
  array['application/pdf', 'application/xml', 'text/xml']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company members read invoice archive" on storage.objects;
create policy "company members read invoice archive"
on storage.objects for select to authenticated
using (
  bucket_id = 'invoice-archive'
  and public.has_company_role(
    split_part(name, '/', 1)::uuid,
    auth.uid(),
    array['owner','admin','manager','staff','accounting','viewer']::text[]
  )
);

drop policy if exists "company finance uploads invoice archive" on storage.objects;
create policy "company finance uploads invoice archive"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'invoice-archive'
  and public.has_company_role(
    split_part(name, '/', 1)::uuid,
    auth.uid(),
    array['owner','admin','manager','accounting']::text[]
  )
);

create or replace function public.prevent_invoice_document_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Archived invoice documents and events are append-only.' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_invoice_document_update_delete on public.invoice_documents;
create trigger prevent_invoice_document_update_delete
before update or delete on public.invoice_documents
for each row execute function public.prevent_invoice_document_mutation();

drop trigger if exists prevent_invoice_event_update_delete on public.invoice_events;
create trigger prevent_invoice_event_update_delete
before update or delete on public.invoice_events
for each row execute function public.prevent_invoice_document_mutation();

-- Freeze the current issuer identity for historical invoices before the
-- immutability trigger is installed.  The marker documents this one-time
-- convergence without altering any financial amount.
update public.invoices invoice
set invoice_snapshot = coalesce(invoice.invoice_snapshot, '{}'::jsonb) || jsonb_build_object(
  'issuer', jsonb_strip_nulls(jsonb_build_object(
    'company_name', company.name,
    'legal_name', settings.legal_name,
    'tax_id', settings.tax_id,
    'registration_number', settings.registration_number,
    'bank_name', settings.bank_name,
    'bank_iban', settings.bank_iban,
    'invoice_footer', settings.invoice_footer,
    'display_name', profile.display_name,
    'phone', profile.phone,
    'email', profile.email,
    'address', profile.address,
    'city', profile.city,
    'country', profile.country,
    'historical_backfill', true
  ))
)
from public.companies company
left join public.company_invoice_settings settings on settings.company_id = company.id
left join public.company_profiles profile on profile.company_id = company.id
where invoice.company_id = company.id
  and jsonb_typeof(invoice.invoice_snapshot -> 'issuer') is distinct from 'object';

create or replace function public.protect_issued_invoice()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Issued invoices cannot be deleted.' using errcode = '55000';
  end if;

  if old.lifecycle_status = 'cancelled' then
    raise exception 'A cancelled invoice cannot be changed.' using errcode = '55000';
  end if;

  if (to_jsonb(new) - array[
    'status', 'amount_paid', 'updated_at', 'lifecycle_status', 'cancelled_at',
    'cancelled_by', 'cancel_reason', 'cancelled_by_invoice_id'
  ]) is distinct from (to_jsonb(old) - array[
    'status', 'amount_paid', 'updated_at', 'lifecycle_status', 'cancelled_at',
    'cancelled_by', 'cancel_reason', 'cancelled_by_invoice_id'
  ]) then
    raise exception 'Issued invoice facts are immutable.' using errcode = '55000';
  end if;

  if new.lifecycle_status = 'cancelled' and old.lifecycle_status = 'active' then
    if new.cancelled_at is null or new.cancelled_by_invoice_id is null
      or char_length(btrim(coalesce(new.cancel_reason, ''))) < 5 then
      raise exception 'Cancellation requires a reason and a Storno document.' using errcode = '22023';
    end if;
  elsif new.lifecycle_status is distinct from old.lifecycle_status then
    raise exception 'Invoice lifecycle transition is invalid.' using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_issued_invoice on public.invoices;
create trigger protect_issued_invoice
before update or delete on public.invoices
for each row execute function public.protect_issued_invoice();

create or replace function public.capture_invoice_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id)
    values (
      new.company_id, new.id,
      case when new.invoice_kind = 'storno' then 'storno_issued' else 'issued' end,
      jsonb_build_object(
        'invoice_number', new.invoice_number,
        'invoice_kind', new.invoice_kind,
        'total_amount', new.total_amount,
        'currency', new.currency,
        'finalized_at', new.finalized_at
      ),
      coalesce(new.created_by, auth.uid())
    );
  else
    if new.amount_paid is distinct from old.amount_paid or new.status is distinct from old.status then
      insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id)
      values (
        new.company_id, new.id, 'payment_updated',
        jsonb_build_object('previous_amount_paid', old.amount_paid, 'amount_paid', new.amount_paid,
          'previous_status', old.status, 'status', new.status),
        auth.uid()
      );
    end if;
    if new.lifecycle_status = 'cancelled' and old.lifecycle_status = 'active' then
      insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id)
      values (
        new.company_id, new.id, 'cancelled',
        jsonb_build_object('reason', new.cancel_reason, 'storno_invoice_id', new.cancelled_by_invoice_id),
        coalesce(new.cancelled_by, auth.uid())
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists capture_invoice_audit_event on public.invoices;
create trigger capture_invoice_audit_event
after insert or update on public.invoices
for each row execute function public.capture_invoice_audit_event();

-- Existing invoices predate the event table; record their issuance once.
insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id, created_at)
select invoice.company_id, invoice.id, 'issued',
  jsonb_build_object(
    'invoice_number', invoice.invoice_number,
    'invoice_kind', invoice.invoice_kind,
    'total_amount', invoice.total_amount,
    'currency', invoice.currency,
    'historical_backfill', true
  ),
  invoice.created_by,
  invoice.finalized_at
from public.invoices invoice
where invoice.company_id is not null
  and not exists (
    select 1 from public.invoice_events event
    where event.invoice_id = invoice.id and event.event_type in ('issued', 'storno_issued')
  );

-- Preserve the issuer's legal identity inside the invoice snapshot.  The UI
-- and generated archive can then render an old invoice without consulting
-- mutable company settings.
create or replace function public.capture_invoice_issuer_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  issuer_snapshot jsonb;
begin
  if jsonb_typeof(new.invoice_snapshot -> 'issuer') = 'object' then
    return new;
  end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'company_name', company.name,
    'legal_name', settings.legal_name,
    'tax_id', settings.tax_id,
    'registration_number', settings.registration_number,
    'bank_name', settings.bank_name,
    'bank_iban', settings.bank_iban,
    'invoice_footer', settings.invoice_footer,
    'display_name', profile.display_name,
    'phone', profile.phone,
    'email', profile.email,
    'address', profile.address,
    'city', profile.city,
    'country', profile.country
  )) into issuer_snapshot
  from public.companies company
  left join public.company_invoice_settings settings on settings.company_id = company.id
  left join public.company_profiles profile on profile.company_id = company.id
  where company.id = new.company_id;

  new.invoice_snapshot := coalesce(new.invoice_snapshot, '{}'::jsonb)
    || jsonb_build_object('issuer', coalesce(issuer_snapshot, '{}'::jsonb));
  return new;
end;
$$;

drop trigger if exists zz_capture_invoice_issuer_snapshot on public.invoices;
create trigger zz_capture_invoice_issuer_snapshot
before insert on public.invoices
for each row execute function public.capture_invoice_issuer_snapshot();

-- Related correction/Storno documents inherit the original monetary and
-- registration context even if the workshop changes country or currency later.
create or replace function public.apply_invoice_registration_context()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  configured_country text;
  configured_currency text;
  configured_rate numeric(12,4);
begin
  if new.related_invoice_id is not null then
    select registration_country, currency, exchange_rate
      into configured_country, configured_currency, configured_rate
    from public.invoices
    where id = new.related_invoice_id and company_id = new.company_id;
  else
    select registration_country, default_currency, all_per_eur_rate
      into configured_country, configured_currency, configured_rate
    from public.company_invoice_settings
    where company_id = new.company_id;
  end if;

  configured_country := coalesce(configured_country, 'DE');
  configured_currency := case
    when new.related_invoice_id is not null then coalesce(configured_currency, 'EUR')
    when configured_country = 'AL' then 'ALL'
    else 'EUR'
  end;
  configured_rate := coalesce(configured_rate, case when configured_currency = 'ALL' then 100 else 1 end);

  new.registration_country := configured_country;
  new.currency := configured_currency;
  new.exchange_rate := configured_rate;
  new.invoice_snapshot := coalesce(new.invoice_snapshot, '{}'::jsonb) || jsonb_build_object(
    'registration_country', configured_country,
    'currency', configured_currency,
    'exchange_rate', configured_rate,
    'exchange_rate_basis', 'ALL_per_EUR'
  );
  return new;
end;
$$;

create or replace function public.register_company_invoice_document(
  input_company_id uuid,
  input_invoice_id uuid,
  input_document_format text,
  input_mime_type text,
  input_original_filename text,
  input_storage_path text,
  input_sha256 text,
  input_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  existing_document public.invoice_documents%rowtype;
  created_document_id uuid;
begin
  if not public.has_company_role(
    input_company_id, auth.uid(), array['owner','admin','manager','accounting']::text[]
  ) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if input_document_format not in ('pdf', 'xml')
    or input_sha256 !~ '^[0-9a-f]{64}$'
    or input_size_bytes <= 0
    or input_storage_path !~ ('^' || input_company_id::text || '/' || input_invoice_id::text || '/') then
    raise exception 'Invoice document metadata is invalid.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.invoices invoice
    where invoice.id = input_invoice_id and invoice.company_id = input_company_id
  ) then
    raise exception 'Invoice is outside the active company.' using errcode = '23503';
  end if;
  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = 'invoice-archive' and object.name = input_storage_path
  ) then
    raise exception 'Archived file is missing from private storage.' using errcode = '23503';
  end if;

  select * into existing_document
  from public.invoice_documents document
  where document.invoice_id = input_invoice_id
    and document.document_format = input_document_format;
  if found then
    if existing_document.sha256 <> input_sha256
      or existing_document.storage_path <> input_storage_path then
      raise exception 'An immutable document already exists for this invoice format.' using errcode = '23505';
    end if;
    return existing_document.id;
  end if;

  insert into public.invoice_documents(
    company_id, invoice_id, document_format, mime_type, original_filename,
    storage_path, sha256, size_bytes, created_by
  ) values (
    input_company_id, input_invoice_id, input_document_format, input_mime_type,
    input_original_filename, input_storage_path, input_sha256, input_size_bytes, auth.uid()
  ) returning id into created_document_id;

  insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id)
  values (
    input_company_id, input_invoice_id,
    case when input_document_format = 'xml' then 'xml_archived' else 'pdf_archived' end,
    jsonb_build_object('document_id', created_document_id, 'sha256', input_sha256,
      'size_bytes', input_size_bytes, 'original_filename', input_original_filename),
    auth.uid()
  );
  return created_document_id;
end;
$$;

create or replace function public.cancel_company_invoice(
  input_company_id uuid,
  input_invoice_id uuid,
  input_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  original public.invoices%rowtype;
  sequence_number integer;
  storno_number text;
  storno_snapshot jsonb;
  storno_items jsonb;
  storno_id uuid;
begin
  if not public.has_company_role(
    input_company_id, auth.uid(), array['owner','admin','manager','accounting']::text[]
  ) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(input_reason, ''))) < 5
    or char_length(btrim(input_reason)) > 500 then
    raise exception 'A cancellation reason between 5 and 500 characters is required.' using errcode = '22023';
  end if;

  select * into original from public.invoices
  where id = input_invoice_id and company_id = input_company_id
  for update;
  if not found then
    raise exception 'Invoice is outside the active company.' using errcode = '23503';
  end if;
  if original.invoice_kind not in ('invoice', 'correction') or original.lifecycle_status <> 'active' then
    raise exception 'Only an active invoice can be cancelled.' using errcode = '55000';
  end if;
  if original.amount_paid > 0 then
    raise exception 'Refund or reverse recorded payments before creating a Storno.' using errcode = '55000';
  end if;

  insert into public.company_invoice_sequences(company_id, next_number)
  values (input_company_id, 2)
  on conflict (company_id) do update
    set next_number = public.company_invoice_sequences.next_number + 1
  returning next_number - 1 into sequence_number;
  storno_number := format('S-%s-%s', to_char(current_date, 'YYYY'), lpad(sequence_number::text, 6, '0'));

  select coalesce(jsonb_agg(
    item || jsonb_build_object(
      'material_cost', -abs(coalesce((item ->> 'material_cost')::numeric, 0)),
      'labor_cost', -abs(coalesce((item ->> 'labor_cost')::numeric, 0)),
      'fee', -abs(coalesce((item ->> 'fee')::numeric, 0)),
      'unit_price', -abs(coalesce((item ->> 'unit_price')::numeric, 0)),
      'line_labor_total', -abs(coalesce((item ->> 'line_labor_total')::numeric, 0)),
      'line_total', -abs(coalesce((item ->> 'line_total')::numeric, 0))
    )
  ), '[]'::jsonb) into storno_items
  from jsonb_array_elements(coalesce(original.invoice_snapshot -> 'items', '[]'::jsonb)) item;

  storno_snapshot := original.invoice_snapshot || jsonb_build_object(
    'version', 4,
    'invoice_number', storno_number,
    'invoice_kind', 'storno',
    'related_invoice_id', original.id,
    'related_invoice_number', original.invoice_number,
    'issued_at', current_date,
    'captured_at', now(),
    'cancellation_reason', btrim(input_reason),
    'items', storno_items,
    'material_total', -abs(original.material_total),
    'labor_total', -abs(original.labor_total),
    'fee_total', -abs(original.fee_total),
    'net_amount', -abs(original.net_amount),
    'tax_amount', -abs(original.tax_amount),
    'total_amount', -abs(original.total_amount)
  );

  insert into public.invoices(
    company_id, client_id, service_id, owner_id, invoice_number, currency,
    registration_country, exchange_rate, issued_at, due_date, status, amount_paid,
    material_total, labor_total, fee_total, net_amount, tax_rate, tax_amount,
    total_amount, invoice_snapshot, invoice_kind, lifecycle_status,
    finalized_at, related_invoice_id, created_by
  ) values (
    input_company_id, original.client_id, null, original.owner_id, storno_number,
    original.currency, original.registration_country, original.exchange_rate,
    current_date, null, 'issued', 0,
    -abs(original.material_total), -abs(original.labor_total), -abs(original.fee_total),
    -abs(original.net_amount), original.tax_rate, -abs(original.tax_amount),
    -abs(original.total_amount), storno_snapshot, 'storno', 'active', now(),
    original.id, auth.uid()
  ) returning id into storno_id;

  update public.invoices
  set lifecycle_status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
      cancel_reason = btrim(input_reason), cancelled_by_invoice_id = storno_id,
      updated_at = now()
  where id = original.id and company_id = input_company_id;

  return storno_id;
end;
$$;

-- Payment writes remain allowed only for active positive invoices.
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
  if not public.has_company_role(
    input_company_id, auth.uid(), array['owner','admin','manager','accounting']::text[]
  ) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if input_amount is null or input_amount <= 0 then
    raise exception 'Payment amount must be positive.' using errcode = '22023';
  end if;
  select * into target_invoice from public.invoices
  where id = input_invoice_id and company_id = input_company_id for update;
  if not found then
    raise exception 'Invoice is outside the active company.' using errcode = '23503';
  end if;
  if target_invoice.lifecycle_status <> 'active'
    or target_invoice.invoice_kind not in ('invoice', 'correction')
    or target_invoice.status not in ('issued', 'partial') then
    raise exception 'Only an active issued invoice can receive a payment.' using errcode = '55000';
  end if;
  next_amount_paid := target_invoice.amount_paid + input_amount;
  if next_amount_paid > target_invoice.total_amount then
    raise exception 'Payment exceeds the remaining invoice balance.' using errcode = '22023';
  end if;
  update public.invoices
  set amount_paid = next_amount_paid,
      status = case when next_amount_paid = total_amount
        then 'paid'::public.invoice_status else 'partial'::public.invoice_status end,
      updated_at = now()
  where id = target_invoice.id and company_id = input_company_id;
  return target_invoice.id;
end;
$$;

revoke all on function public.register_company_invoice_document(
  uuid, uuid, text, text, text, text, text, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.register_company_invoice_document(
  uuid, uuid, text, text, text, text, text, bigint
) to authenticated;

revoke all on function public.cancel_company_invoice(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.cancel_company_invoice(uuid, uuid, text)
  to authenticated;

revoke all on function public.record_company_invoice_payment(uuid, uuid, numeric)
  from public, anon, authenticated, service_role;
grant execute on function public.record_company_invoice_payment(uuid, uuid, numeric)
  to authenticated;

notify pgrst, 'reload schema';
