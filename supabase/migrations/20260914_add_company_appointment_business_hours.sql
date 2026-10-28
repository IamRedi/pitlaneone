-- Weekly opening hours drive both the staff calendar and public appointment slots.
create table if not exists public.company_appointment_business_hours (
  company_id uuid not null references public.companies(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  opens_at time not null default '08:00',
  closes_at time not null default '18:00',
  slot_minutes integer not null default 30 check (slot_minutes in (15, 20, 30, 60)),
  updated_at timestamptz not null default now(),
  primary key (company_id, weekday),
  check (closes_at > opens_at)
);

insert into public.company_appointment_business_hours (company_id, weekday, is_open)
select c.id, day.weekday, day.weekday between 1 and 5
from public.companies c
cross join generate_series(0, 6) as day(weekday)
on conflict (company_id, weekday) do nothing;

alter table public.company_appointment_business_hours enable row level security;

drop policy if exists "company managers read appointment business hours" on public.company_appointment_business_hours;
create policy "company managers read appointment business hours" on public.company_appointment_business_hours
  for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]));
drop policy if exists "company managers update appointment business hours" on public.company_appointment_business_hours;
create policy "company managers update appointment business hours" on public.company_appointment_business_hours
  for update to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]))
  with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]));

create or replace function public.get_public_appointment_business_hours(input_company_id uuid)
returns table (weekday smallint, is_open boolean, opens_at time, closes_at time, slot_minutes integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.companies c join public.company_profiles p on p.company_id = c.id
    where c.id = input_company_id and c.status = 'active' and p.is_public = true
  ) then raise exception 'Company is not accepting public appointment requests' using errcode = '42501'; end if;
  return query select h.weekday, h.is_open, h.opens_at, h.closes_at, h.slot_minutes
  from public.company_appointment_business_hours h where h.company_id = input_company_id order by h.weekday;
end;
$$;
revoke all on function public.get_public_appointment_business_hours(uuid) from public;
grant execute on function public.get_public_appointment_business_hours(uuid) to anon, authenticated;

create or replace function public.update_company_appointment_business_hours(
  input_company_id uuid,
  input_hours jsonb
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare hour_row jsonb;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]) then
    raise exception 'Not allowed to manage appointment hours' using errcode = '42501';
  end if;
  if jsonb_typeof(input_hours) <> 'array' or jsonb_array_length(input_hours) <> 7 then raise exception 'Invalid business hours' using errcode = '22023'; end if;
  for hour_row in select value from jsonb_array_elements(input_hours) loop
    if (hour_row->>'weekday') !~ '^[0-6]$' or coalesce((hour_row->>'opens_at')::time >= (hour_row->>'closes_at')::time, false) then
      raise exception 'Invalid business hours' using errcode = '22023';
    end if;
    insert into public.company_appointment_business_hours (company_id, weekday, is_open, opens_at, closes_at, slot_minutes, updated_at)
    values (input_company_id, (hour_row->>'weekday')::smallint, coalesce((hour_row->>'is_open')::boolean, false), coalesce((hour_row->>'opens_at')::time, '08:00'), coalesce((hour_row->>'closes_at')::time, '18:00'), coalesce((hour_row->>'slot_minutes')::integer, 30), now())
    on conflict (company_id, weekday) do update set is_open = excluded.is_open, opens_at = excluded.opens_at, closes_at = excluded.closes_at, slot_minutes = excluded.slot_minutes, updated_at = now();
  end loop;
end;
$$;
revoke all on function public.update_company_appointment_business_hours(uuid, jsonb) from public;
grant execute on function public.update_company_appointment_business_hours(uuid, jsonb) to authenticated;

-- Confirmation also enforces the business timetable, not just collision avoidance.
create or replace function public.schedule_company_appointment_request(
  input_company_id uuid, input_request_id uuid, input_date date, input_time time, input_duration_minutes integer default 60
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare slot_start timestamp := input_date + input_time;
declare slot_end timestamp := input_date + input_time + make_interval(mins => input_duration_minutes);
declare business_hours public.company_appointment_business_hours%rowtype;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]) then raise exception 'Not allowed to manage appointments' using errcode = '42501'; end if;
  if input_date is null or input_time is null or input_date < current_date or input_duration_minutes not between 15 and 480 then raise exception 'Invalid appointment slot' using errcode = '22023'; end if;
  select * into business_hours from public.company_appointment_business_hours where company_id = input_company_id and weekday = extract(dow from input_date)::smallint;
  if not found or not business_hours.is_open or input_time < business_hours.opens_at or (input_time + make_interval(mins => input_duration_minutes))::time > business_hours.closes_at then raise exception 'The selected appointment slot is outside business hours' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(input_company_id::text || ':' || input_date::text, 0));
  if not exists (select 1 from public.company_appointment_requests where id = input_request_id and company_id = input_company_id and status = 'requested') then raise exception 'Appointment request is not available' using errcode = 'P0002'; end if;
  if exists (select 1 from public.company_appointment_requests r where r.company_id = input_company_id and r.status = 'confirmed' and r.scheduled_start is not null and r.scheduled_start < slot_end and r.scheduled_start + make_interval(mins => r.duration_minutes) > slot_start) then raise exception 'The selected appointment slot is already occupied' using errcode = '23P01'; end if;
  update public.company_appointment_requests set status = 'confirmed', scheduled_start = slot_start, duration_minutes = input_duration_minutes, handled_at = now(), handled_by = auth.uid() where id = input_request_id and company_id = input_company_id;
end;
$$;

notify pgrst, 'reload schema';
