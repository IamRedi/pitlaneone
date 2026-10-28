-- Phase 1 of the operational-workspace rebuild: immutable record authorship.
-- No existing business data is deleted or rewritten.
alter table public.services
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.invoices
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists services_company_created_by_date_idx
  on public.services(company_id, created_by, date desc);

create index if not exists invoices_company_created_by_issued_idx
  on public.invoices(company_id, created_by, issued_at desc);

create or replace function public.assign_company_record_creator()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.created_by is null and auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists assign_company_service_creator on public.services;
create trigger assign_company_service_creator
before insert on public.services
for each row execute function public.assign_company_record_creator();

drop trigger if exists assign_company_invoice_creator on public.invoices;
create trigger assign_company_invoice_creator
before insert on public.invoices
for each row execute function public.assign_company_record_creator();

-- A concise, company-isolated source for the future daily dashboard.
create or replace function public.company_daily_creator_summary(
  input_company_id uuid,
  input_day date default current_date
)
returns table (
  creator_id uuid,
  services_created bigint,
  invoices_created bigint,
  invoiced_total numeric,
  paid_total numeric,
  open_total numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(
    input_company_id,
    auth.uid(),
    array['owner', 'admin', 'manager', 'staff', 'accounting', 'viewer']::text[]
  ) then
    raise exception 'Company access is required.' using errcode = '42501';
  end if;

  return query
  with service_counts as (
    select created_by as creator_id, count(*)::bigint as services_created
    from public.services
    where company_id = input_company_id and date = input_day
    group by created_by
  ), invoice_totals as (
    select created_by as creator_id,
      count(*)::bigint as invoices_created,
      coalesce(sum(total_amount), 0)::numeric as invoiced_total,
      coalesce(sum(amount_paid), 0)::numeric as paid_total,
      coalesce(sum(total_amount - amount_paid), 0)::numeric as open_total
    from public.invoices
    where company_id = input_company_id and issued_at = input_day
    group by created_by
  )
  select coalesce(s.creator_id, i.creator_id),
    coalesce(s.services_created, 0), coalesce(i.invoices_created, 0),
    coalesce(i.invoiced_total, 0), coalesce(i.paid_total, 0), coalesce(i.open_total, 0)
  from service_counts s full join invoice_totals i on i.creator_id is not distinct from s.creator_id;
end;
$$;

revoke all on function public.company_daily_creator_summary(uuid, date) from public, anon;
grant execute on function public.company_daily_creator_summary(uuid, date) to authenticated;

notify pgrst, 'reload schema';
