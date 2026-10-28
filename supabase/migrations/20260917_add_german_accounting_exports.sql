-- German fiscal identities and e-invoice metadata.  Issued documents continue
-- to be immutable; mutable master data is copied into invoice_snapshot at issue.

alter table public.company_invoice_settings
  add column if not exists seller_street text,
  add column if not exists seller_postal_code text,
  add column if not exists seller_city text,
  add column if not exists seller_country_code text not null default 'DE',
  add column if not exists contact_email text,
  add column if not exists payment_terms text not null default 'Zahlbar sofort ohne Abzug.',
  add column if not exists vat_exemption_reason text;

alter table public.company_invoice_settings
  drop constraint if exists company_invoice_settings_seller_street_length,
  add constraint company_invoice_settings_seller_street_length check (seller_street is null or char_length(seller_street) <= 180),
  drop constraint if exists company_invoice_settings_seller_postal_length,
  add constraint company_invoice_settings_seller_postal_length check (seller_postal_code is null or char_length(seller_postal_code) <= 24),
  drop constraint if exists company_invoice_settings_seller_city_length,
  add constraint company_invoice_settings_seller_city_length check (seller_city is null or char_length(seller_city) <= 100),
  drop constraint if exists company_invoice_settings_seller_country_code_check,
  add constraint company_invoice_settings_seller_country_code_check check (seller_country_code ~ '^[A-Z]{2}$'),
  drop constraint if exists company_invoice_settings_contact_email_length,
  add constraint company_invoice_settings_contact_email_length check (contact_email is null or char_length(contact_email) <= 254),
  drop constraint if exists company_invoice_settings_payment_terms_length,
  add constraint company_invoice_settings_payment_terms_length check (char_length(payment_terms) between 2 and 500),
  drop constraint if exists company_invoice_settings_vat_exemption_reason_length,
  add constraint company_invoice_settings_vat_exemption_reason_length check (vat_exemption_reason is null or char_length(vat_exemption_reason) <= 500);

alter table public.clients
  add column if not exists billing_name text,
  add column if not exists billing_email text,
  add column if not exists billing_country_code text not null default 'DE',
  add column if not exists vat_id text,
  add column if not exists customer_type text not null default 'consumer',
  add column if not exists electronic_address text,
  add column if not exists electronic_address_scheme text not null default 'EM',
  add column if not exists buyer_reference text;

alter table public.clients
  drop constraint if exists clients_billing_name_length,
  add constraint clients_billing_name_length check (billing_name is null or char_length(billing_name) <= 160),
  drop constraint if exists clients_billing_email_length,
  add constraint clients_billing_email_length check (billing_email is null or char_length(billing_email) <= 254),
  drop constraint if exists clients_billing_country_code_check,
  add constraint clients_billing_country_code_check check (billing_country_code ~ '^[A-Z]{2}$'),
  drop constraint if exists clients_vat_id_length,
  add constraint clients_vat_id_length check (vat_id is null or char_length(vat_id) <= 40),
  drop constraint if exists clients_customer_type_check,
  add constraint clients_customer_type_check check (customer_type in ('consumer', 'business', 'public')),
  drop constraint if exists clients_electronic_address_length,
  add constraint clients_electronic_address_length check (electronic_address is null or char_length(electronic_address) <= 254),
  drop constraint if exists clients_electronic_address_scheme_check,
  add constraint clients_electronic_address_scheme_check check (electronic_address_scheme ~ '^[A-Z0-9]{2,4}$'),
  drop constraint if exists clients_buyer_reference_length,
  add constraint clients_buyer_reference_length check (buyer_reference is null or char_length(buyer_reference) <= 100);

alter table public.invoice_documents
  add column if not exists document_standard text,
  add column if not exists standard_version text,
  add column if not exists validation_status text not null default 'not_applicable',
  add column if not exists validation_report jsonb not null default '{}'::jsonb;

alter table public.invoice_documents
  drop constraint if exists invoice_documents_validation_status_check,
  add constraint invoice_documents_validation_status_check
    check (validation_status in ('not_applicable', 'preflight_passed', 'validator_passed', 'validator_failed')),
  drop constraint if exists invoice_documents_standard_length,
  add constraint invoice_documents_standard_length check (document_standard is null or char_length(document_standard) <= 80),
  drop constraint if exists invoice_documents_version_length,
  add constraint invoice_documents_version_length check (standard_version is null or char_length(standard_version) <= 40);

-- Enrich the immutable snapshot with the German seller/buyer master data that
-- exists at issuance time.  This trigger runs after the older z* snapshot
-- triggers because PostgreSQL orders same-event triggers by name.
create or replace function public.capture_invoice_accounting_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  seller jsonb;
  buyer jsonb;
begin
  if jsonb_typeof(new.invoice_snapshot -> 'accounting') = 'object' then
    return new;
  end if;
  select jsonb_strip_nulls(jsonb_build_object(
    'legal_name', settings.legal_name,
    'vat_id', settings.tax_id,
    'tax_number', settings.registration_number,
    'street', coalesce(settings.seller_street, profile.address),
    'postal_code', settings.seller_postal_code,
    'city', coalesce(settings.seller_city, profile.city),
    'country_code', settings.seller_country_code,
    'email', coalesce(settings.contact_email, profile.email),
    'contact_name', coalesce(profile.display_name, settings.legal_name),
    'phone', profile.phone,
    'bank_name', settings.bank_name,
    'iban', settings.bank_iban,
    'payment_terms', settings.payment_terms,
    'vat_exemption_reason', settings.vat_exemption_reason
  )) into seller
  from public.company_invoice_settings settings
  left join public.company_profiles profile on profile.company_id = settings.company_id
  where settings.company_id = new.company_id;

  select jsonb_strip_nulls(jsonb_build_object(
    'name', coalesce(client.billing_name, nullif(btrim(client.first_name || ' ' || client.last_name), '')),
    'first_name', client.first_name,
    'last_name', client.last_name,
    'street', client.billing_address,
    'postal_code', client.billing_postal_code,
    'city', client.billing_city,
    'country', client.billing_country,
    'country_code', client.billing_country_code,
    'email', client.billing_email,
    'vat_id', client.vat_id,
    'customer_type', client.customer_type,
    'electronic_address', coalesce(client.electronic_address, client.billing_email),
    'electronic_address_scheme', client.electronic_address_scheme,
    'buyer_reference', client.buyer_reference
  )) into buyer
  from public.clients client
  where client.id = new.client_id and client.company_id = new.company_id;

  new.invoice_snapshot := coalesce(new.invoice_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'accounting', jsonb_build_object(
        'version', 1,
        'seller', coalesce(seller, '{}'::jsonb),
        'buyer', coalesce(buyer, '{}'::jsonb),
        'service_date', new.invoice_snapshot #>> '{service,date}'
      )
    );
  return new;
end;
$$;

drop trigger if exists zzz_capture_invoice_accounting_snapshot on public.invoices;
create trigger zzz_capture_invoice_accounting_snapshot
before insert on public.invoices
for each row execute function public.capture_invoice_accounting_snapshot();

-- Refunds are append-only ledger entries.  They reduce amount_paid but never
-- delete or rewrite the original payment record.
alter table public.company_invoice_payments
  add column if not exists entry_type text not null default 'payment',
  add column if not exists reason text,
  add column if not exists related_invoice_id uuid references public.invoices(id) on delete restrict;

alter table public.company_invoice_payments
  drop constraint if exists company_invoice_payments_entry_type_check,
  add constraint company_invoice_payments_entry_type_check check (entry_type in ('payment', 'refund')),
  drop constraint if exists company_invoice_payments_reason_length,
  add constraint company_invoice_payments_reason_length check (reason is null or char_length(reason) between 5 and 500);

drop trigger if exists prevent_company_invoice_payment_mutation on public.company_invoice_payments;
create trigger prevent_company_invoice_payment_mutation
before update or delete on public.company_invoice_payments
for each row execute function public.prevent_invoice_document_mutation();

-- Allow audit events introduced by the German accounting flow.
alter table public.invoice_events drop constraint if exists invoice_events_event_type_check;
alter table public.invoice_events add constraint invoice_events_event_type_check check (event_type in (
  'issued', 'payment_updated', 'payment_refunded', 'cancelled', 'storno_issued',
  'correction_issued', 'pdf_archived', 'xml_archived', 'xml_validation'
));

-- Register immutable XML metadata in the same transaction as its archive row.
drop function if exists public.register_company_invoice_document(
  uuid, uuid, text, text, text, text, text, bigint
);

create or replace function public.register_company_invoice_document(
  input_company_id uuid,
  input_invoice_id uuid,
  input_document_format text,
  input_mime_type text,
  input_original_filename text,
  input_storage_path text,
  input_sha256 text,
  input_size_bytes bigint,
  input_document_standard text default null,
  input_standard_version text default null,
  input_validation_status text default 'not_applicable',
  input_validation_report jsonb default '{}'::jsonb
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
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','accounting']::text[]) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if input_document_format not in ('pdf', 'xml')
    or input_sha256 !~ '^[0-9a-f]{64}$'
    or input_size_bytes <= 0
    or input_storage_path !~ ('^' || input_company_id::text || '/' || input_invoice_id::text || '/')
    or input_validation_status not in ('not_applicable', 'preflight_passed', 'validator_passed', 'validator_failed') then
    raise exception 'Invoice document metadata is invalid.' using errcode = '22023';
  end if;
  if input_document_format = 'xml' and (input_document_standard is null or input_standard_version is null) then
    raise exception 'Structured invoice metadata is required.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.invoices where id = input_invoice_id and company_id = input_company_id) then
    raise exception 'Invoice is outside the active company.' using errcode = '23503';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'invoice-archive' and name = input_storage_path) then
    raise exception 'Archived object does not exist.' using errcode = '23503';
  end if;

  select * into existing_document from public.invoice_documents
  where invoice_id = input_invoice_id and document_format = input_document_format;
  if found then
    if existing_document.sha256 = input_sha256 and existing_document.storage_path = input_storage_path then return existing_document.id; end if;
    raise exception 'An immutable document already exists for this invoice format.' using errcode = '23505';
  end if;

  insert into public.invoice_documents(
    company_id, invoice_id, document_format, mime_type, original_filename,
    storage_path, sha256, size_bytes, created_by, document_standard,
    standard_version, validation_status, validation_report
  ) values (
    input_company_id, input_invoice_id, input_document_format, input_mime_type,
    input_original_filename, input_storage_path, input_sha256, input_size_bytes,
    auth.uid(), input_document_standard, input_standard_version,
    input_validation_status, coalesce(input_validation_report, '{}'::jsonb)
  ) returning id into created_document_id;
  insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id)
  values (
    input_company_id, input_invoice_id,
    case when input_document_format = 'xml' then 'xml_archived' else 'pdf_archived' end,
    jsonb_build_object(
      'document_id', created_document_id, 'sha256', input_sha256,
      'size_bytes', input_size_bytes, 'original_filename', input_original_filename,
      'document_standard', input_document_standard, 'standard_version', input_standard_version,
      'validation_status', input_validation_status
    ), auth.uid()
  );
  return created_document_id;
end;
$$;

revoke all on function public.register_company_invoice_document(
  uuid, uuid, text, text, text, text, text, bigint, text, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.register_company_invoice_document(
  uuid, uuid, text, text, text, text, text, bigint, text, text, text, jsonb
) to authenticated;

-- Keep the invoice balance and the append-only ledger in one transaction.
-- This restores the ledger insert that must accompany every payment update.
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
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','accounting']::text[]) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if input_amount is null or input_amount <= 0 then
    raise exception 'Payment amount must be positive.' using errcode = '22023';
  end if;
  select * into target_invoice from public.invoices
  where id = input_invoice_id and company_id = input_company_id for update;
  if not found then raise exception 'Invoice is outside the active company.' using errcode = '23503'; end if;
  if target_invoice.lifecycle_status <> 'active'
    or target_invoice.invoice_kind not in ('invoice', 'correction')
    or target_invoice.status not in ('issued', 'partial') then
    raise exception 'Only an active issued invoice can receive a payment.' using errcode = '55000';
  end if;
  next_amount_paid := target_invoice.amount_paid + input_amount;
  if next_amount_paid > target_invoice.total_amount then
    raise exception 'Payment exceeds the remaining invoice balance.' using errcode = '22023';
  end if;
  insert into public.company_invoice_payments(
    company_id, invoice_id, amount, payment_method, paid_at, recorded_by, entry_type
  ) values (input_company_id, input_invoice_id, input_amount, 'cash', now(), auth.uid(), 'payment');
  update public.invoices
  set amount_paid = next_amount_paid,
      status = case when next_amount_paid = total_amount then 'paid'::public.invoice_status else 'partial'::public.invoice_status end,
      updated_at = now()
  where id = target_invoice.id and company_id = input_company_id;
  return target_invoice.id;
end;
$$;

-- One explicit workflow for paid invoices: the operator confirms that the
-- money was actually returned, an append-only refund entry is recorded, and
-- only then is the immutable Storno created by the established function.
create or replace function public.cancel_company_invoice_with_refund(
  input_company_id uuid,
  input_invoice_id uuid,
  input_reason text,
  input_refund_confirmed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  original public.invoices%rowtype;
  refunded_amount numeric(12,2);
  refund_entry_id uuid;
  storno_id uuid;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','accounting']::text[]) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  select * into original from public.invoices
  where id = input_invoice_id and company_id = input_company_id for update;
  if not found then raise exception 'Invoice is outside the active company.' using errcode = '23503'; end if;

  refunded_amount := original.amount_paid;
  if refunded_amount > 0 then
    if input_refund_confirmed is not true then
      raise exception 'Confirm that the recorded payment was returned before creating the Storno.' using errcode = '22023';
    end if;
    insert into public.company_invoice_payments(
      company_id, invoice_id, amount, payment_method, paid_at, recorded_by,
      entry_type, reason
    ) values (
      input_company_id, input_invoice_id, refunded_amount, 'other', now(), auth.uid(),
      'refund', btrim(input_reason)
    ) returning id into refund_entry_id;

    update public.invoices
    set amount_paid = 0, status = 'issued'::public.invoice_status, updated_at = now()
    where id = input_invoice_id and company_id = input_company_id;
  end if;

  storno_id := public.cancel_company_invoice(input_company_id, input_invoice_id, input_reason);
  if refund_entry_id is not null then
    insert into public.invoice_events(company_id, invoice_id, event_type, event_data, actor_id)
    values (input_company_id, input_invoice_id, 'payment_refunded', jsonb_build_object(
      'amount', refunded_amount, 'refund_entry_id', refund_entry_id, 'storno_invoice_id', storno_id,
      'operator_confirmed_external_refund', true
    ), auth.uid());
  end if;
  return storno_id;
end;
$$;

revoke all on function public.cancel_company_invoice_with_refund(uuid, uuid, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.cancel_company_invoice_with_refund(uuid, uuid, text, boolean)
  to authenticated;

create or replace function public.company_daily_creator_summary(input_company_id uuid, input_day date default current_date)
returns table (
  creator_id uuid, currency text, services_created bigint, invoices_created bigint,
  payments_recorded bigint, invoiced_total numeric, paid_total numeric, open_total numeric
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','staff','accounting','viewer']::text[]) then
    raise exception 'Company access is required.' using errcode = '42501';
  end if;
  return query
  with activity as (
    select s.created_by as creator_id, null::text as currency, count(*)::bigint as services_created,
      0::bigint as invoices_created, 0::bigint as payments_recorded, 0::numeric as invoiced_total,
      0::numeric as paid_total, 0::numeric as open_total
    from public.services s where s.company_id = input_company_id
      and (s.created_at at time zone 'Europe/Berlin')::date = input_day group by s.created_by
    union all
    select i.created_by, i.currency, 0, count(*)::bigint, 0, coalesce(sum(i.total_amount), 0),
      0::numeric, coalesce(sum(i.total_amount - i.amount_paid), 0)
    from public.invoices i where i.company_id = input_company_id
      and (i.created_at at time zone 'Europe/Berlin')::date = input_day group by i.created_by, i.currency
    union all
    select p.recorded_by, i.currency, 0, 0, count(*)::bigint, 0::numeric,
      coalesce(sum(case when p.entry_type = 'refund' then -p.amount else p.amount end), 0), 0::numeric
    from public.company_invoice_payments p join public.invoices i on i.id = p.invoice_id
    where p.company_id = input_company_id and (p.paid_at at time zone 'Europe/Berlin')::date = input_day
    group by p.recorded_by, i.currency
  )
  select activity.creator_id, activity.currency, sum(activity.services_created)::bigint,
    sum(activity.invoices_created)::bigint, sum(activity.payments_recorded)::bigint,
    sum(activity.invoiced_total)::numeric, sum(activity.paid_total)::numeric,
    sum(activity.open_total)::numeric from activity group by activity.creator_id, activity.currency;
end;
$$;

notify pgrst, 'reload schema';
