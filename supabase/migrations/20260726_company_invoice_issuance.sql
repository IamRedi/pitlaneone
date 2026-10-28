-- Invoices are immutable financial snapshots of a company service. Browser
-- clients may read invoices through RLS, but all financial mutations go
-- through the guarded RPCs below.

create unique index if not exists invoices_company_service_once_idx
on public.invoices (company_id, service_id)
where company_id is not null and service_id is not null;

alter table public.invoices
  drop constraint if exists invoices_non_negative_amounts,
  drop constraint if exists invoices_paid_amount_within_total;

alter table public.invoices
  add constraint invoices_non_negative_amounts
  check (total_amount >= 0 and amount_paid >= 0) not valid,
  add constraint invoices_paid_amount_within_total
  check (amount_paid <= total_amount) not valid;

create or replace function public.prevent_invoiced_service_item_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_service_id uuid := case when tg_op = 'DELETE' then old.service_id else new.service_id end;
  target_company_id uuid := case when tg_op = 'DELETE' then old.company_id else new.company_id end;
begin
  if target_company_id is not null and exists (
    select 1 from public.invoices invoice
    where invoice.company_id = target_company_id
      and invoice.service_id = target_service_id
      and invoice.status in ('issued', 'partial', 'paid')
  ) then
    raise exception 'An invoiced service cannot be changed.' using errcode = '55000';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists prevent_invoiced_service_item_mutation on public.service_items;
create trigger prevent_invoiced_service_item_mutation
before insert or update or delete on public.service_items
for each row execute function public.prevent_invoiced_service_item_mutation();

create or replace function public.prevent_invoiced_service_total_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.company_id is not null
    and new.total_amount is distinct from old.total_amount
    and exists (
      select 1 from public.invoices invoice
      where invoice.company_id = old.company_id
        and invoice.service_id = old.id
        and invoice.status in ('issued', 'partial', 'paid')
    ) then
    raise exception 'The total of an invoiced service cannot be changed.' using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_invoiced_service_total_change on public.services;
create trigger prevent_invoiced_service_total_change
before update on public.services
for each row execute function public.prevent_invoiced_service_total_change();

create or replace function public.create_company_invoice_from_service(
  input_company_id uuid,
  input_service_id uuid,
  input_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_service record;
  created_invoice_id uuid;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;

  if input_due_date is not null and input_due_date < current_date then
    raise exception 'The due date cannot be in the past.' using errcode = '22007';
  end if;

  select service.id, vehicle.client_id, service.total_amount
  into source_service
  from public.services service
  join public.vehicles vehicle
    on vehicle.id = service.vehicle_id and vehicle.company_id = service.company_id
  where service.id = input_service_id
    and service.company_id = input_company_id;

  if not found then
    raise exception 'Service is outside the active company.' using errcode = '23503';
  end if;

  if source_service.total_amount <= 0 then
    raise exception 'A service needs a positive total before invoicing.' using errcode = '22023';
  end if;

  insert into public.invoices (
    company_id, client_id, service_id, issued_at, due_date, status, amount_paid, total_amount
  ) values (
    input_company_id, source_service.client_id, input_service_id, current_date, input_due_date, 'issued', 0, source_service.total_amount
  ) returning id into created_invoice_id;

  return created_invoice_id;
end;
$$;

create or replace function public.record_company_invoice_payment(
  input_company_id uuid,
  input_invoice_id uuid,
  input_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_invoice public.invoices%rowtype;
  next_amount_paid numeric;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;

  if input_amount is null or input_amount <= 0 then
    raise exception 'Payment amount must be positive.' using errcode = '22023';
  end if;

  select * into target_invoice
  from public.invoices
  where id = input_invoice_id and company_id = input_company_id
  for update;

  if not found then
    raise exception 'Invoice is outside the active company.' using errcode = '23503';
  end if;

  if target_invoice.status not in ('issued', 'partial') then
    raise exception 'Only issued or partial invoices can receive a payment.' using errcode = '55000';
  end if;

  next_amount_paid := target_invoice.amount_paid + input_amount;
  if next_amount_paid > target_invoice.total_amount then
    raise exception 'Payment exceeds the remaining invoice balance.' using errcode = '22023';
  end if;

  update public.invoices
  set amount_paid = next_amount_paid,
      status = case when next_amount_paid = total_amount then 'paid'::public.invoice_status else 'partial'::public.invoice_status end
  where id = target_invoice.id and company_id = input_company_id;

  return target_invoice.id;
end;
$$;

revoke insert, update, delete on public.invoices from authenticated;
grant select on public.invoices to authenticated;
grant execute on function public.create_company_invoice_from_service(uuid, uuid, date) to authenticated;
grant execute on function public.record_company_invoice_payment(uuid, uuid, numeric) to authenticated;
