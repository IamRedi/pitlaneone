-- Immutable payment ledger. Existing invoice amounts remain unchanged; only
-- newly recorded payments create ledger rows because historical payment dates
-- and authors are unknown.
create table if not exists public.company_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'bank_transfer', 'other')),
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists company_invoice_payments_daily_idx
  on public.company_invoice_payments(company_id, paid_at desc);
create index if not exists company_invoice_payments_recorder_idx
  on public.company_invoice_payments(company_id, recorded_by, paid_at desc);

alter table public.company_invoice_payments enable row level security;
grant select on public.company_invoice_payments to authenticated;

drop policy if exists "members read company payment ledger" on public.company_invoice_payments;
create policy "members read company payment ledger"
on public.company_invoice_payments for select to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff', 'accounting', 'viewer']));

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
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']::text[]) then
    raise exception 'Company finance access is required.' using errcode = '42501';
  end if;
  if input_amount is null or input_amount <= 0 then
    raise exception 'Payment amount must be positive.' using errcode = '22023';
  end if;

  select * into target_invoice from public.invoices
  where id = input_invoice_id and company_id = input_company_id for update;
  if not found then raise exception 'Invoice is outside the active company.' using errcode = '23503'; end if;
  if target_invoice.status not in ('issued', 'partial') then raise exception 'Only issued or partial invoices can receive a payment.' using errcode = '55000'; end if;

  next_amount_paid := target_invoice.amount_paid + input_amount;
  if next_amount_paid > target_invoice.total_amount then raise exception 'Payment exceeds the remaining invoice balance.' using errcode = '22023'; end if;

  insert into public.company_invoice_payments (company_id, invoice_id, amount, recorded_by)
  values (input_company_id, target_invoice.id, input_amount, auth.uid());

  update public.invoices set amount_paid = next_amount_paid,
    status = case when next_amount_paid = total_amount then 'paid'::public.invoice_status else 'partial'::public.invoice_status end
  where id = target_invoice.id and company_id = input_company_id;
  return target_invoice.id;
end;
$$;

drop function if exists public.company_daily_creator_summary(uuid, date);
create function public.company_daily_creator_summary(input_company_id uuid, input_day date default current_date)
returns table (
  creator_id uuid,
  services_created bigint,
  invoices_created bigint,
  payments_recorded bigint,
  invoiced_total numeric,
  paid_total numeric,
  open_total numeric
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff', 'accounting', 'viewer']::text[]) then
    raise exception 'Company access is required.' using errcode = '42501';
  end if;
  return query
  with activity as (
    select created_by as creator_id, count(*)::bigint as services_created, 0::bigint as invoices_created, 0::bigint as payments_recorded,
      0::numeric as invoiced_total, 0::numeric as paid_total, 0::numeric as open_total
    from public.services where company_id = input_company_id and date = input_day group by created_by
    union all
    select created_by, 0, count(*)::bigint, 0, coalesce(sum(total_amount), 0)::numeric, 0::numeric, coalesce(sum(total_amount - amount_paid), 0)::numeric
    from public.invoices where company_id = input_company_id and issued_at = input_day group by created_by
    union all
    select recorded_by, 0, 0, count(*)::bigint, 0::numeric, coalesce(sum(amount), 0)::numeric, 0::numeric
    from public.company_invoice_payments where company_id = input_company_id and paid_at::date = input_day group by recorded_by
  )
  select creator_id, sum(services_created)::bigint, sum(invoices_created)::bigint, sum(payments_recorded)::bigint,
    sum(invoiced_total)::numeric, sum(paid_total)::numeric, sum(open_total)::numeric
  from activity group by creator_id;
end;
$$;

revoke all on function public.record_company_invoice_payment(uuid, uuid, numeric) from public, anon, authenticated, service_role;
grant execute on function public.record_company_invoice_payment(uuid, uuid, numeric) to authenticated;
revoke all on function public.company_daily_creator_summary(uuid, date) from public, anon;
grant execute on function public.company_daily_creator_summary(uuid, date) to authenticated;
notify pgrst, 'reload schema';
