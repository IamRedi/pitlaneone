-- Public appointment requests are deliberately requests, not confirmed bookings.
-- A workshop owner/manager must accept or decline each request from the app.

create table if not exists public.company_appointment_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  phone text not null check (char_length(btrim(phone)) between 5 and 40),
  service_interest text not null check (char_length(btrim(service_interest)) between 2 and 120),
  preferred_date date,
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);

create index if not exists company_appointment_requests_company_status_created_idx
  on public.company_appointment_requests (company_id, status, created_at desc);

alter table public.company_appointment_requests enable row level security;

drop policy if exists "company managers read appointment requests" on public.company_appointment_requests;
create policy "company managers read appointment requests"
  on public.company_appointment_requests
  for select to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]));

drop policy if exists "company managers update appointment requests" on public.company_appointment_requests;
create policy "company managers update appointment requests"
  on public.company_appointment_requests
  for update to authenticated
  using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]))
  with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']::text[]));

create or replace function public.create_public_appointment_request(
  input_company_id uuid,
  input_customer_name text,
  input_phone text,
  input_service_interest text,
  input_preferred_date date default null,
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
    select 1
    from public.companies c
    join public.company_profiles p on p.company_id = c.id
    where c.id = input_company_id
      and c.status = 'active'
      and p.is_public = true
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
    company_id, customer_name, phone, service_interest, preferred_date, note
  ) values (
    input_company_id, cleaned_name, cleaned_phone, cleaned_service, input_preferred_date, cleaned_note
  ) returning id into request_id;

  return request_id;
end;
$$;

revoke all on function public.create_public_appointment_request(uuid, text, text, text, date, text) from public;
grant execute on function public.create_public_appointment_request(uuid, text, text, text, date, text) to anon, authenticated;
