-- Operational authorship is evidence, not editable business content.
-- A record may be updated by an authorised colleague, but its original creator
-- must remain intact for daily activity and audit views.

create or replace function public.protect_operational_record_creator()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
    and auth.role() <> 'service_role'
    and new.created_by is distinct from old.created_by then
    raise exception 'The original creator of an operational record cannot be changed.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_company_service_creator on public.services;
create trigger protect_company_service_creator
before update on public.services
for each row execute function public.protect_operational_record_creator();

drop trigger if exists protect_company_invoice_creator on public.invoices;
create trigger protect_company_invoice_creator
before update on public.invoices
for each row execute function public.protect_operational_record_creator();

notify pgrst, 'reload schema';
