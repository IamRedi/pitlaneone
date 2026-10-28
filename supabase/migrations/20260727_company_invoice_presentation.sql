-- Human-readable invoice identifiers are allocated inside the existing
-- finance RPC. They are scoped to one company and cannot be forged by a
-- browser client.

alter table public.invoices
  add column if not exists invoice_number text,
  add column if not exists currency text not null default 'EUR';

alter table public.invoices
  drop constraint if exists invoices_currency_code;

alter table public.invoices
  add constraint invoices_currency_code
  check (currency ~ '^[A-Z]{3}$') not valid;

create unique index if not exists invoices_company_number_once_idx
on public.invoices (company_id, invoice_number)
where company_id is not null and invoice_number is not null;

create table if not exists public.company_invoice_sequences (
  company_id uuid primary key references public.companies(id) on delete cascade,
  next_number integer not null default 1 check (next_number > 0)
);

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
  sequence_number integer;
  generated_invoice_number text;
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if input_due_date is not null and input_due_date < current_date then
    raise exception 'The due date cannot be in the past.' using errcode = '22007';
  end if;
  select service.id, vehicle.client_id, service.total_amount into source_service
  from public.services service join public.vehicles vehicle
    on vehicle.id = service.vehicle_id and vehicle.company_id = service.company_id
  where service.id = input_service_id and service.company_id = input_company_id;
  if not found then raise exception 'Service is outside the active company.' using errcode = '23503'; end if;
  if source_service.total_amount <= 0 then raise exception 'A service needs a positive total before invoicing.' using errcode = '22023'; end if;
  insert into public.company_invoice_sequences (company_id, next_number)
  values (input_company_id, 2)
  on conflict (company_id) do update set next_number = public.company_invoice_sequences.next_number + 1
  returning next_number - 1 into sequence_number;
  generated_invoice_number := format('F-%s-%s', to_char(current_date, 'YYYY'), lpad(sequence_number::text, 6, '0'));
  insert into public.invoices (company_id, client_id, service_id, invoice_number, currency, issued_at, due_date, status, amount_paid, total_amount)
  values (input_company_id, source_service.client_id, input_service_id, generated_invoice_number, 'EUR', current_date, input_due_date, 'issued', 0, source_service.total_amount)
  returning id into created_invoice_id;
  return created_invoice_id;
end;
$$;

revoke all on public.company_invoice_sequences from anon, authenticated;
