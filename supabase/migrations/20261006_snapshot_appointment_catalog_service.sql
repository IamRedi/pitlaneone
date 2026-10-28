alter table public.company_appointment_requests
  add column if not exists catalog_item_id uuid
    references public.company_catalog_items(id) on delete set null,
  add column if not exists service_price numeric(12,2),
  add column if not exists service_currency text;

alter table public.company_appointment_requests
  drop constraint if exists company_appointment_requests_service_price_check;

alter table public.company_appointment_requests
  add constraint company_appointment_requests_service_price_check
  check (service_price is null or service_price >= 0);

alter table public.company_appointment_requests
  drop constraint if exists company_appointment_requests_service_currency_check;

alter table public.company_appointment_requests
  add constraint company_appointment_requests_service_currency_check
  check (service_currency is null or service_currency in ('EUR', 'ALL'));

create index if not exists company_appointment_requests_catalog_item_idx
  on public.company_appointment_requests(company_id, catalog_item_id)
  where catalog_item_id is not null;

create or replace function public.create_public_appointment_request(
  input_company_id uuid,
  input_customer_name text,
  input_phone text,
  input_service_interest text,
  input_preferred_date date,
  input_preferred_time time,
  input_note text,
  input_vehicle_description text,
  input_vehicle_plate text,
  input_catalog_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_id uuid;
  resolved_service_interest text := btrim(coalesce(input_service_interest, ''));
  resolved_duration_minutes integer := 60;
  resolved_service_price numeric(12,2);
  resolved_service_currency text;
begin
  if not exists (
    select 1
    from public.companies c
    join public.company_profiles p on p.company_id = c.id
    join public.company_modules cm
      on cm.company_id = c.id and cm.module_key = 'appointments'
    where c.id = input_company_id
      and c.status = 'active'
      and p.is_public = true
  ) then
    raise exception 'Company is not accepting public appointment requests'
      using errcode = '42501';
  end if;

  if input_catalog_item_id is not null then
    select ci.name, ci.duration_minutes, ci.price, ci.currency
    into
      resolved_service_interest,
      resolved_duration_minutes,
      resolved_service_price,
      resolved_service_currency
    from public.company_catalog_items ci
    where ci.id = input_catalog_item_id
      and ci.company_id = input_company_id
      and ci.item_type = 'service';

    if not found then
      raise exception 'Invalid catalog service' using errcode = '22023';
    end if;
  end if;

  if char_length(btrim(coalesce(input_customer_name, ''))) not between 2 and 120
    or char_length(btrim(coalesce(input_phone, ''))) not between 5 and 40
    or char_length(resolved_service_interest) not between 2 and 120
    or resolved_duration_minutes not between 15 and 480 then
    raise exception 'Invalid appointment request' using errcode = '22023';
  end if;

  insert into public.company_appointment_requests (
    company_id,
    customer_name,
    phone,
    catalog_item_id,
    service_interest,
    service_price,
    service_currency,
    preferred_date,
    preferred_time,
    duration_minutes,
    note,
    vehicle_description,
    vehicle_plate
  ) values (
    input_company_id,
    btrim(input_customer_name),
    btrim(input_phone),
    input_catalog_item_id,
    resolved_service_interest,
    resolved_service_price,
    resolved_service_currency,
    input_preferred_date,
    input_preferred_time,
    resolved_duration_minutes,
    nullif(btrim(coalesce(input_note, '')), ''),
    nullif(btrim(coalesce(input_vehicle_description, '')), ''),
    nullif(btrim(coalesce(input_vehicle_plate, '')), '')
  ) returning id into request_id;

  return request_id;
end;
$$;
