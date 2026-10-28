alter table public.company_appointment_requests
  add column if not exists customer_response_token uuid,
  add column if not exists customer_response_expires_at timestamptz,
  add column if not exists customer_responded_at timestamptz;

create unique index if not exists company_appointment_requests_response_token_idx
  on public.company_appointment_requests(customer_response_token)
  where customer_response_token is not null;

create or replace function public.set_appointment_customer_response_token()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'awaiting_customer'
    and (
      old.status is distinct from new.status
      or old.scheduled_start is distinct from new.scheduled_start
      or old.duration_minutes is distinct from new.duration_minutes
    ) then
    new.customer_response_token := gen_random_uuid();
    new.customer_response_expires_at := least(
      new.scheduled_start,
      now() + interval '7 days'
    );
    new.customer_responded_at := null;
  elsif new.status <> 'awaiting_customer' then
    new.customer_response_token := null;
    new.customer_response_expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_appointment_customer_response_token
  on public.company_appointment_requests;

create trigger set_appointment_customer_response_token
before update on public.company_appointment_requests
for each row execute function public.set_appointment_customer_response_token();

update public.company_appointment_requests
set customer_response_token = gen_random_uuid(),
    customer_response_expires_at = least(
      scheduled_start,
      now() + interval '7 days'
    )
where status = 'awaiting_customer'
  and scheduled_start is not null
  and customer_response_token is null;

create or replace function public.get_public_appointment_proposal(
  input_token uuid
)
returns table (
  company_name text,
  website_locale text,
  service_interest text,
  service_price numeric,
  service_currency text,
  duration_minutes integer,
  scheduled_start timestamp
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.display_name,
    p.website_locale,
    r.service_interest,
    r.service_price,
    r.service_currency,
    r.duration_minutes,
    r.scheduled_start
  from public.company_appointment_requests r
  join public.company_profiles p on p.company_id = r.company_id
  where r.customer_response_token = input_token
    and r.status = 'awaiting_customer'
    and r.scheduled_start is not null
    and r.customer_response_expires_at > now()
  limit 1;
$$;

create or replace function public.respond_public_appointment_proposal(
  input_token uuid,
  input_response text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.company_appointment_requests%rowtype;
begin
  if input_response not in ('accepted', 'declined') then
    raise exception 'Invalid appointment response' using errcode = '22023';
  end if;

  select * into request_row
  from public.company_appointment_requests
  where customer_response_token = input_token
    and status = 'awaiting_customer'
    and scheduled_start is not null
    and customer_response_expires_at > now()
  for update;

  if not found then
    raise exception 'Appointment proposal is not available' using errcode = 'P0002';
  end if;

  if input_response = 'accepted' then
    update public.company_appointment_requests
    set status = 'confirmed',
        handled_at = now(),
        handled_by = null,
        customer_responded_at = now()
    where id = request_row.id;
  else
    update public.company_appointment_requests
    set status = 'requested',
        scheduled_start = null,
        handled_at = null,
        handled_by = null,
        customer_responded_at = now()
    where id = request_row.id;
  end if;

  return input_response;
end;
$$;

revoke all on function public.get_public_appointment_proposal(uuid) from public;
grant execute on function public.get_public_appointment_proposal(uuid)
  to anon, authenticated;

revoke all on function public.respond_public_appointment_proposal(uuid, text)
  from public;
grant execute on function public.respond_public_appointment_proposal(uuid, text)
  to anon, authenticated;
