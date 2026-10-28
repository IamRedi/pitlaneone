-- Appointments are requests first. A manager confirms one into a real calendar slot.
-- Times are stored as the workshop's local civil time; each company can later receive
-- a configurable business timezone without changing the booking model.

alter table public.company_appointment_requests
  add column if not exists preferred_time time,
  add column if not exists scheduled_start timestamp,
  add column if not exists duration_minutes integer not null default 60
    check (duration_minutes between 15 and 480);

create index if not exists company_appointment_requests_calendar_idx
  on public.company_appointment_requests (company_id, scheduled_start)
  where status = 'confirmed' and scheduled_start is not null;

-- Public website: only expose occupied slots for an active public workshop.
create or replace function public.list_public_appointment_slots(
  input_company_id uuid,
  input_from date,
  input_to date
)
returns table (scheduled_date date, scheduled_time time, duration_minutes integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if input_from is null or input_to is null or input_to < input_from or input_to > input_from + 90 then
    raise exception 'Invalid appointment availability range' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.companies c
    join public.company_profiles p on p.company_id = c.id
    where c.id = input_company_id and c.status = 'active' and p.is_public = true
  ) then
    raise exception 'Company is not accepting public appointment requests' using errcode = '42501';
  end if;

  return query
  select r.scheduled_start::date, r.scheduled_start::time, r.duration_minutes
  from public.company_appointment_requests r
  where r.company_id = input_company_id
    and r.status = 'confirmed'
    and r.scheduled_start is not null
    and r.scheduled_start::date between input_from and input_to
  order by r.scheduled_start;
end;
$$;

revoke all on function public.list_public_appointment_slots(uuid, date, date) from public;
grant execute on function public.list_public_appointment_slots(uuid, date, date) to anon, authenticated;

-- New public request signature with preferred time. The old six-argument function
-- remains valid for existing clients and integrations.
create or replace function public.create_public_appointment_request(
  input_company_id uuid,
  input_customer_name text,
  input_phone text,
  input_service_interest text,
  input_preferred_date date default null,
  input_preferred_time time default null,
  input_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_id uuid;
  cleaned_name text := btrim(input_customer_name);
  cleaned_phone text := btrim(input_phone);
  cleaned_service text := btrim(input_service_interest);
  cleaned_note text := nullif(btrim(coalesce(input_note, '')), '');
begin
  if not exists (
    select 1 from public.companies c join public.company_profiles p on p.company_id = c.id
    where c.id = input_company_id and c.status = 'active' and p.is_public = true
  ) then
    raise exception 'Company is not accepting public appointment requests' using errcode = '42501';
  end if;

  if char_length(cleaned_name) not between 2 and 120
    or char_length(cleaned_phone) not between 5 and 40
    or char_length(cleaned_service) not between 2 and 120
    or (cleaned_note is not null and char_length(cleaned_note) > 1000) then
    raise exception 'Invalid appointment request' using errcode = '22023';
  end if;

  insert into public.company_appointment_requests (
    company_id, customer_name, phone, service_interest, preferred_date, preferred_time, note
  ) values (
    input_company_id, cleaned_name, cleaned_phone, cleaned_service, input_preferred_date, input_preferred_time, cleaned_note
  ) returning id into request_id;
  return request_id;
end;
$$;

revoke all on function public.create_public_appointment_request(uuid, text, text, text, date, time, text) from public;
grant execute on function public.create_public_appointment_request(uuid, text, text, text, date, time, text) to anon, authenticated;

-- Confirm one request and reserve its slot. The advisory lock makes two concurrent
-- confirmations for the same workshop/day deterministic.
create or replace function public.schedule_company_appointment_request(
  input_company_id uuid,
  input_request_id uuid,
  input_date date,
  input_time time,
  input_duration_minutes integer default 60
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  slot_start timestamp := input_date + input_time;
  slot_end timestamp := input_date + input_time + make_interval(mins => input_duration_minutes);
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]) then
    raise exception 'Not allowed to manage appointments' using errcode = '42501';
  end if;
  if input_date is null or input_time is null or input_date < current_date or input_duration_minutes not between 15 and 480 then
    raise exception 'Invalid appointment slot' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(input_company_id::text || ':' || input_date::text, 0));
  if not exists (
    select 1 from public.company_appointment_requests
    where id = input_request_id and company_id = input_company_id and status = 'requested'
  ) then
    raise exception 'Appointment request is not available' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.company_appointment_requests r
    where r.company_id = input_company_id
      and r.status = 'confirmed'
      and r.scheduled_start is not null
      and r.scheduled_start < slot_end
      and r.scheduled_start + make_interval(mins => r.duration_minutes) > slot_start
  ) then
    raise exception 'The selected appointment slot is already occupied' using errcode = '23P01';
  end if;

  update public.company_appointment_requests
  set status = 'confirmed', scheduled_start = slot_start, duration_minutes = input_duration_minutes,
      handled_at = now(), handled_by = auth.uid()
  where id = input_request_id and company_id = input_company_id;
end;
$$;

revoke all on function public.schedule_company_appointment_request(uuid, uuid, date, time, integer) from public;
grant execute on function public.schedule_company_appointment_request(uuid, uuid, date, time, integer) to authenticated;

notify pgrst, 'reload schema';
