-- Store the financial breakdown used by an issued invoice. Historical invoices
-- keep their original gross total and are marked with a zero tax rate; newly
-- issued invoices use the company's configured VAT rate.

alter table public.company_invoice_settings
  add column if not exists default_tax_rate numeric(5,2) not null default 19.00;

alter table public.clients
  add column if not exists billing_address text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_country text;

alter table public.clients
  drop constraint if exists clients_billing_address_length,
  drop constraint if exists clients_billing_postal_code_length,
  drop constraint if exists clients_billing_city_length,
  drop constraint if exists clients_billing_country_length,
  add constraint clients_billing_address_length check (billing_address is null or char_length(billing_address) <= 180),
  add constraint clients_billing_postal_code_length check (billing_postal_code is null or char_length(billing_postal_code) <= 24),
  add constraint clients_billing_city_length check (billing_city is null or char_length(billing_city) <= 100),
  add constraint clients_billing_country_length check (billing_country is null or char_length(billing_country) <= 100);

alter table public.company_invoice_settings
  drop constraint if exists company_invoice_settings_default_tax_rate_range,
  add constraint company_invoice_settings_default_tax_rate_range
    check (default_tax_rate between 0 and 100);

alter table public.invoices
  add column if not exists material_total numeric(12,2) not null default 0,
  add column if not exists labor_total numeric(12,2) not null default 0,
  add column if not exists fee_total numeric(12,2) not null default 0,
  add column if not exists net_amount numeric(12,2) not null default 0,
  add column if not exists tax_rate numeric(5,2) not null default 0,
  add column if not exists tax_amount numeric(12,2) not null default 0;

with item_totals as (
  select
    invoice.id as invoice_id,
    coalesce(sum(item.material_cost), 0)::numeric(12,2) as material_total,
    coalesce(sum(item.labor_cost * (1 - item.labor_discount_percent / 100)), 0)::numeric(12,2) as labor_total,
    coalesce(sum(item.fee), 0)::numeric(12,2) as fee_total
  from public.invoices invoice
  left join public.service_items item
    on item.service_id = invoice.service_id
    and item.company_id = invoice.company_id
  group by invoice.id
)
update public.invoices invoice
set material_total = totals.material_total,
    labor_total = totals.labor_total,
    fee_total = totals.fee_total,
    net_amount = invoice.total_amount,
    tax_rate = 0,
    tax_amount = 0
from item_totals totals
where totals.invoice_id = invoice.id
  and coalesce(invoice.invoice_snapshot ->> 'version', '1') <> '2';

alter table public.invoices
  drop constraint if exists invoices_official_totals_non_negative,
  add constraint invoices_official_totals_non_negative check (
    material_total >= 0 and labor_total >= 0 and fee_total >= 0
    and net_amount >= 0 and tax_rate between 0 and 100 and tax_amount >= 0
  );

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
  configured_tax_rate numeric(5,2);
  calculated_tax_amount numeric(12,2);
  calculated_total numeric(12,2);
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
    vehicle.id as vehicle_id,
    vehicle.model as vehicle_model,
    vehicle.plate_number,
    vehicle.vin,
    client.id as client_id,
    client.first_name,
    client.last_name,
    client.phone,
    client.billing_address,
    client.billing_postal_code,
    client.billing_city,
    client.billing_country,
    coalesce(sum(item.material_cost), 0)::numeric(12,2) as material_total,
    coalesce(sum(item.labor_cost * (1 - item.labor_discount_percent / 100)), 0)::numeric(12,2) as labor_total,
    coalesce(sum(item.fee), 0)::numeric(12,2) as fee_total,
    coalesce(sum(
      item.material_cost + item.fee
      + item.labor_cost * (1 - item.labor_discount_percent / 100)
    ), 0)::numeric(12,2) as net_amount
  into source_service
  from public.services service
  join public.vehicles vehicle
    on vehicle.id = service.vehicle_id
    and vehicle.company_id = service.company_id
  join public.clients client
    on client.id = vehicle.client_id
    and client.company_id = vehicle.company_id
  left join public.service_items item
    on item.service_id = service.id
    and item.company_id = service.company_id
  where service.id = input_service_id
    and service.company_id = input_company_id
  group by service.id, vehicle.id, client.id;

  if not found then
    raise exception 'Service is outside the active company.' using errcode = '23503';
  end if;

  if source_service.net_amount <= 0 then
    raise exception 'A service needs a positive total before invoicing.' using errcode = '22023';
  end if;

  select coalesce(settings.default_tax_rate, 19.00)
    into configured_tax_rate
  from public.company_invoice_settings settings
  where settings.company_id = input_company_id;

  configured_tax_rate := coalesce(configured_tax_rate, 19.00);
  calculated_tax_amount := round(source_service.net_amount * configured_tax_rate / 100, 2);
  calculated_total := source_service.net_amount + calculated_tax_amount;

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
    'version', 2,
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
      'phone', source_service.phone,
      'billing_address', source_service.billing_address,
      'billing_postal_code', source_service.billing_postal_code,
      'billing_city', source_service.billing_city,
      'billing_country', source_service.billing_country
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
      'notes', source_service.notes
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'name', item.name,
          'material_cost', item.material_cost,
          'labor_cost', item.labor_cost,
          'fee', item.fee,
          'labor_discount_percent', item.labor_discount_percent,
          'line_labor_total', round(item.labor_cost * (1 - item.labor_discount_percent / 100), 2),
          'line_total', round(
            item.material_cost + item.fee
            + item.labor_cost * (1 - item.labor_discount_percent / 100), 2
          )
        ) order by item.id
      )
      from public.service_items item
      where item.service_id = source_service.id
        and item.company_id = input_company_id
    ), '[]'::jsonb),
    'material_total', source_service.material_total,
    'labor_total', source_service.labor_total,
    'fee_total', source_service.fee_total,
    'net_amount', source_service.net_amount,
    'tax_rate', configured_tax_rate,
    'tax_amount', calculated_tax_amount,
    'total_amount', calculated_total
  ) into captured_snapshot;

  insert into public.invoices (
    company_id, client_id, service_id, owner_id, invoice_number, currency,
    issued_at, due_date, status, amount_paid, material_total, labor_total,
    fee_total, net_amount, tax_rate, tax_amount, total_amount, invoice_snapshot
  ) values (
    input_company_id, source_service.client_id, input_service_id, null,
    generated_invoice_number, 'EUR', current_date, input_due_date,
    'issued', 0, source_service.material_total, source_service.labor_total,
    source_service.fee_total, source_service.net_amount, configured_tax_rate,
    calculated_tax_amount, calculated_total, captured_snapshot
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
