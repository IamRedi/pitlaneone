-- A customer can use the original secure response link to cancel a future
-- confirmed appointment. The token remains valid only until its start time.

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
  elsif new.status in ('requested', 'declined', 'cancelled') then
    new.customer_response_token := null;
    new.customer_response_expires_at := null;
  end if;
  return new;
end;
$$;

drop function if exists public.get_public_appointment_proposal(uuid);

create function public.get_public_appointment_proposal(input_token uuid)
returns table (
  company_name text,
  website_locale text,
  service_interest text,
  service_price numeric,
  service_currency text,
  duration_minutes integer,
  scheduled_start timestamp,
  status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.display_name, p.website_locale, r.service_interest, r.service_price,
    r.service_currency, r.duration_minutes, r.scheduled_start, r.status
  from public.company_appointment_requests r
  join public.company_profiles p on p.company_id = r.company_id
  where r.customer_response_token = input_token
    and r.status in ('awaiting_customer', 'confirmed')
    and r.scheduled_start is not null
    and r.customer_response_expires_at > now()
  limit 1;
$$;

create or replace function public.cancel_public_appointment_proposal(input_token uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.company_appointment_requests%rowtype;
begin
  select * into request_row
  from public.company_appointment_requests
  where customer_response_token = input_token
    and status = 'confirmed'
    and scheduled_start > now()
    and customer_response_expires_at > now()
  for update;

  if not found then
    raise exception 'Confirmed appointment is not available' using errcode = 'P0002';
  end if;

  update public.company_appointment_requests
  set status = 'cancelled', handled_at = now(), handled_by = null
  where id = request_row.id;

  return 'cancelled';
end;
$$;

revoke all on function public.get_public_appointment_proposal(uuid) from public;
grant execute on function public.get_public_appointment_proposal(uuid) to anon, authenticated;

revoke all on function public.cancel_public_appointment_proposal(uuid) from public;
grant execute on function public.cancel_public_appointment_proposal(uuid) to anon, authenticated;
