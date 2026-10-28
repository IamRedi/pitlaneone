-- A confirmed appointment must be cancellable without erasing its operational
-- history. Cancellation releases the slot because availability considers only
-- rows still in the confirmed state.

alter table public.company_appointment_requests
  drop constraint if exists company_appointment_requests_status_check,
  add constraint company_appointment_requests_status_check
    check (status in ('requested', 'awaiting_customer', 'confirmed', 'declined', 'cancelled'));

create or replace function public.cancel_company_appointment_request(
  input_company_id uuid,
  input_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff']::text[]
  ) then
    raise exception 'Not allowed to cancel appointments' using errcode = '42501';
  end if;

  update public.company_appointment_requests
  set status = 'cancelled', handled_at = now(), handled_by = auth.uid()
  where id = input_request_id
    and company_id = input_company_id
    and status = 'confirmed';

  if not found then
    raise exception 'Confirmed appointment is not available' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.cancel_company_appointment_request(uuid, uuid) from public;
grant execute on function public.cancel_company_appointment_request(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
