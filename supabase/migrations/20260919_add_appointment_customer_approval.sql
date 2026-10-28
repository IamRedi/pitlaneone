-- Alternative appointment times require explicit customer approval before confirmation.
-- Staff can operate the appointment inbox, while weekly business hours remain
-- restricted to owners, administrators and managers.

alter table public.company_appointment_requests
  drop constraint if exists company_appointment_requests_status_check;

alter table public.company_appointment_requests
  add constraint company_appointment_requests_status_check
  -- Older production records can already be cancelled. Preserve that history
  -- while introducing the customer-approval states.
  check (status in ('requested', 'awaiting_customer', 'confirmed', 'declined', 'cancelled'));

grant select on table public.company_appointment_requests to authenticated;
revoke update on table public.company_appointment_requests from authenticated;
grant select on table public.company_appointment_business_hours to authenticated;

-- Companies created after the business-hours table was introduced also need
-- their seven default rows. Existing companies were backfilled in 20260914.
create or replace function public.bootstrap_company_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.company_users (company_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (company_id, user_id) do nothing;

  insert into public.company_profiles (company_id, display_name)
  values (new.id, new.name)
  on conflict (company_id) do nothing;

  insert into public.company_theme_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  insert into public.company_invoice_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  insert into public.company_appointment_business_hours (company_id, weekday, is_open)
  select new.id, day.weekday, day.weekday between 1 and 5
  from generate_series(0, 6) as day(weekday)
  on conflict (company_id, weekday) do nothing;

  return new;
end;
$$;

drop policy if exists "company managers read appointment requests" on public.company_appointment_requests;
drop policy if exists "company operations read appointment requests" on public.company_appointment_requests;
create policy "company operations read appointment requests"
  on public.company_appointment_requests
  for select to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

drop policy if exists "company managers update appointment requests" on public.company_appointment_requests;
drop policy if exists "company operations update appointment requests" on public.company_appointment_requests;

drop policy if exists "company managers read appointment business hours" on public.company_appointment_business_hours;
drop policy if exists "company operations read appointment business hours" on public.company_appointment_business_hours;
create policy "company operations read appointment business hours"
  on public.company_appointment_business_hours
  for select to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]));

-- Public availability treats a proposed alternative as temporarily occupied.
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
    select 1 from public.companies c
    join public.company_profiles p on p.company_id = c.id
    where c.id = input_company_id and c.status = 'active' and p.is_public = true
  ) then
    raise exception 'Company is not accepting public appointment requests' using errcode = '42501';
  end if;

  return query
  select r.scheduled_start::date, r.scheduled_start::time, r.duration_minutes
  from public.company_appointment_requests r
  where r.company_id = input_company_id
    and r.status in ('awaiting_customer', 'confirmed')
    and r.scheduled_start is not null
    and r.scheduled_start::date between input_from and input_to
  order by r.scheduled_start;
end;
$$;

-- The database, not the browser, decides whether the selected time may be
-- confirmed immediately. Any deviation from the customer's requested date/time
-- becomes awaiting_customer.
create or replace function public.propose_or_confirm_company_appointment_request(
  input_company_id uuid,
  input_request_id uuid,
  input_date date,
  input_time time,
  input_duration_minutes integer default 60
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  slot_start timestamp := input_date + input_time;
  slot_end timestamp := input_date + input_time + make_interval(mins => input_duration_minutes);
  business_hours public.company_appointment_business_hours%rowtype;
  request_row public.company_appointment_requests%rowtype;
  next_status text;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]) then
    raise exception 'Not allowed to manage appointments' using errcode = '42501';
  end if;
  if input_date is null or input_time is null or input_date < current_date or input_duration_minutes not between 15 and 480 then
    raise exception 'Invalid appointment slot' using errcode = '22023';
  end if;

  select * into business_hours
  from public.company_appointment_business_hours
  where company_id = input_company_id and weekday = extract(dow from input_date)::smallint;
  if not found or not business_hours.is_open or input_time < business_hours.opens_at
    or (input_time + make_interval(mins => input_duration_minutes))::time > business_hours.closes_at then
    raise exception 'The selected appointment slot is outside business hours' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(input_company_id::text || ':' || input_date::text, 0));
  select * into request_row
  from public.company_appointment_requests
  where id = input_request_id and company_id = input_company_id and status in ('requested', 'awaiting_customer')
  for update;
  if not found then
    raise exception 'Appointment request is not available' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.company_appointment_requests r
    where r.company_id = input_company_id
      and r.id <> input_request_id
      and r.status in ('awaiting_customer', 'confirmed')
      and r.scheduled_start is not null
      and r.scheduled_start < slot_end
      and r.scheduled_start + make_interval(mins => r.duration_minutes) > slot_start
  ) then
    raise exception 'The selected appointment slot is already occupied' using errcode = '23P01';
  end if;

  next_status := case
    when request_row.preferred_date = input_date and request_row.preferred_time = input_time then 'confirmed'
    else 'awaiting_customer'
  end;

  update public.company_appointment_requests
  set status = next_status,
      scheduled_start = slot_start,
      duration_minutes = input_duration_minutes,
      handled_at = case when next_status = 'confirmed' then now() else null end,
      handled_by = auth.uid()
  where id = input_request_id and company_id = input_company_id;

  return next_status;
end;
$$;

revoke all on function public.propose_or_confirm_company_appointment_request(uuid, uuid, date, time, integer) from public;
grant execute on function public.propose_or_confirm_company_appointment_request(uuid, uuid, date, time, integer) to authenticated;

create or replace function public.confirm_proposed_company_appointment_request(
  input_company_id uuid,
  input_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.company_appointment_requests%rowtype;
  slot_end timestamp;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]) then
    raise exception 'Not allowed to manage appointments' using errcode = '42501';
  end if;

  select * into request_row
  from public.company_appointment_requests
  where id = input_request_id and company_id = input_company_id and status = 'awaiting_customer'
  for update;
  if not found or request_row.scheduled_start is null then
    raise exception 'Appointment proposal is not available' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(input_company_id::text || ':' || request_row.scheduled_start::date::text, 0));
  slot_end := request_row.scheduled_start + make_interval(mins => request_row.duration_minutes);
  if exists (
    select 1 from public.company_appointment_requests r
    where r.company_id = input_company_id
      and r.id <> input_request_id
      and r.status in ('awaiting_customer', 'confirmed')
      and r.scheduled_start is not null
      and r.scheduled_start < slot_end
      and r.scheduled_start + make_interval(mins => r.duration_minutes) > request_row.scheduled_start
  ) then
    raise exception 'The selected appointment slot is already occupied' using errcode = '23P01';
  end if;

  update public.company_appointment_requests
  set status = 'confirmed', handled_at = now(), handled_by = auth.uid()
  where id = input_request_id and company_id = input_company_id and status = 'awaiting_customer';
end;
$$;

revoke all on function public.confirm_proposed_company_appointment_request(uuid, uuid) from public;
grant execute on function public.confirm_proposed_company_appointment_request(uuid, uuid) to authenticated;

create or replace function public.decline_company_appointment_request(
  input_company_id uuid,
  input_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']::text[]) then
    raise exception 'Not allowed to manage appointments' using errcode = '42501';
  end if;

  update public.company_appointment_requests
  set status = 'declined', handled_at = now(), handled_by = auth.uid()
  where id = input_request_id and company_id = input_company_id and status in ('requested', 'awaiting_customer');

  if not found then
    raise exception 'Appointment request is not available' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.decline_company_appointment_request(uuid, uuid) from public;
grant execute on function public.decline_company_appointment_request(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
