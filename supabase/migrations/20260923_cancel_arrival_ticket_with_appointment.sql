-- Cancelling a confirmed appointment must also close any arrival ticket that
-- was materialized shortly before the cancellation. The historical ticket is
-- retained with a terminal status, but it can no longer create workshop work.

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

  update public.company_appointment_work_tickets
  set status = 'cancelled', completed_at = now()
  where company_id = input_company_id
    and appointment_request_id = input_request_id
    and status = 'ready';
end;
$$;

-- Reconcile any ticket created before the corrected function was installed.
update public.company_appointment_work_tickets ticket
set status = 'cancelled', completed_at = coalesce(ticket.completed_at, now())
from public.company_appointment_requests request
where request.id = ticket.appointment_request_id
  and request.company_id = ticket.company_id
  and request.status = 'cancelled'
  and ticket.status = 'ready';

notify pgrst, 'reload schema';
