-- The daily activity panel measures work performed in the application today,
-- not a service date that may be entered for a past or future appointment.
create or replace function public.company_daily_creator_summary(input_company_id uuid, input_day date default current_date)
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
    from public.services
    where company_id = input_company_id
      and (created_at at time zone 'Europe/Berlin')::date = input_day
    group by created_by
    union all
    select created_by, 0, count(*)::bigint, 0, coalesce(sum(total_amount), 0)::numeric, 0::numeric, coalesce(sum(total_amount - amount_paid), 0)::numeric
    from public.invoices
    where company_id = input_company_id
      and (created_at at time zone 'Europe/Berlin')::date = input_day
    group by created_by
    union all
    select recorded_by, 0, 0, count(*)::bigint, 0::numeric, coalesce(sum(amount), 0)::numeric, 0::numeric
    from public.company_invoice_payments
    where company_id = input_company_id
      and (paid_at at time zone 'Europe/Berlin')::date = input_day
    group by recorded_by
  )
  select creator_id, sum(services_created)::bigint, sum(invoices_created)::bigint, sum(payments_recorded)::bigint,
    sum(invoiced_total)::numeric, sum(paid_total)::numeric, sum(open_total)::numeric
  from activity group by creator_id;
end;
$$;

revoke all on function public.company_daily_creator_summary(uuid, date) from public, anon;
grant execute on function public.company_daily_creator_summary(uuid, date) to authenticated;
notify pgrst, 'reload schema';
