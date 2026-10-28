-- Confirmed appointments become a lightweight arrival ticket only when due.
-- A ticket never invents a client or vehicle: staff completes the missing vehicle data on arrival.

alter table public.company_appointment_requests
  add column if not exists vehicle_description text,
  add column if not exists vehicle_plate text;

alter table public.company_appointment_requests
  drop constraint if exists company_appointment_requests_vehicle_description_check,
  add constraint company_appointment_requests_vehicle_description_check
    check (vehicle_description is null or char_length(btrim(vehicle_description)) between 2 and 120),
  drop constraint if exists company_appointment_requests_vehicle_plate_check,
  add constraint company_appointment_requests_vehicle_plate_check
    check (vehicle_plate is null or char_length(btrim(vehicle_plate)) between 2 and 24);

create or replace function public.create_public_appointment_request(
  input_company_id uuid,
  input_customer_name text,
  input_phone text,
  input_service_interest text,
  input_preferred_date date,
  input_preferred_time time,
  input_note text,
  input_vehicle_description text,
  input_vehicle_plate text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare request_id uuid;
begin
  if not exists (select 1 from public.companies c join public.company_profiles p on p.company_id = c.id where c.id = input_company_id and c.status = 'active' and p.is_public = true) then
    raise exception 'Company is not accepting public appointment requests' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(input_customer_name, ''))) not between 2 and 120 or char_length(btrim(coalesce(input_phone, ''))) not between 5 and 40 or char_length(btrim(coalesce(input_service_interest, ''))) not between 2 and 120 then
    raise exception 'Invalid appointment request' using errcode = '22023';
  end if;
  insert into public.company_appointment_requests (company_id, customer_name, phone, service_interest, preferred_date, preferred_time, note, vehicle_description, vehicle_plate)
  values (input_company_id, btrim(input_customer_name), btrim(input_phone), btrim(input_service_interest), input_preferred_date, input_preferred_time, nullif(btrim(coalesce(input_note, '')), ''), nullif(btrim(coalesce(input_vehicle_description, '')), ''), nullif(btrim(coalesce(input_vehicle_plate, '')), ''))
  returning id into request_id;
  return request_id;
end;
$$;

revoke all on function public.create_public_appointment_request(uuid, text, text, text, date, time, text, text, text) from public;
grant execute on function public.create_public_appointment_request(uuid, text, text, text, date, time, text, text, text) to anon, authenticated;

create table if not exists public.company_appointment_work_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  appointment_request_id uuid not null unique references public.company_appointment_requests(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  vehicle_description text,
  vehicle_plate text,
  service_interest text not null,
  note text,
  scheduled_start timestamp not null,
  status text not null default 'ready' check (status in ('ready', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists company_appointment_work_tickets_due_idx
  on public.company_appointment_work_tickets (company_id, status, scheduled_start);

alter table public.company_appointment_work_tickets enable row level security;

create policy "company operators read appointment work tickets"
  on public.company_appointment_work_tickets for select to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

create or replace function public.materialize_due_appointment_work_tickets()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare created_count integer;
begin
  insert into public.company_appointment_work_tickets (
    company_id, appointment_request_id, customer_name, phone, vehicle_description,
    vehicle_plate, service_interest, note, scheduled_start
  )
  select r.company_id, r.id, r.customer_name, r.phone, nullif(btrim(r.vehicle_description), ''),
    nullif(btrim(r.vehicle_plate), ''), r.service_interest, r.note, r.scheduled_start
  from public.company_appointment_requests r
  where r.status = 'confirmed'
    and r.scheduled_start is not null
    and r.scheduled_start <= (now() at time zone 'Europe/Berlin') + interval '30 minutes'
    and r.scheduled_start >= (now() at time zone 'Europe/Berlin') - interval '24 hours'
  on conflict (appointment_request_id) do nothing;
  get diagnostics created_count = row_count;
  return created_count;
end;
$$;

revoke all on function public.materialize_due_appointment_work_tickets() from public, anon;
grant execute on function public.materialize_due_appointment_work_tickets() to authenticated, service_role;

notify pgrst, 'reload schema';
