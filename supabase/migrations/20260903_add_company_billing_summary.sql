-- Owner-only billing summary for the application UI. The source of truth stays
-- in billing_accounts and entitlements; this function exposes only the values
-- needed to explain the current plan to the owner.

create or replace function public.get_company_billing_summary(input_company_id uuid)
returns table (
  account_status text,
  trial_ends_at timestamptz,
  plan_code text,
  company_limit integer,
  company_count integer,
  seat_limit integer,
  active_seat_count integer,
  additional_worker_bundles integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null
    or not public.has_company_role(input_company_id, auth.uid(), array['owner']) then
    raise exception 'Only the company owner can view subscription details.';
  end if;

  return query
  select
    ba.status,
    ba.trial_ends_at,
    be.plan_code,
    be.company_limit,
    count(distinct cba.company_id)::integer,
    cse.included_seat_limit + (cse.additional_worker_bundles * 5),
    count(distinct cu.user_id) filter (where cu.is_active)::integer,
    cse.additional_worker_bundles
  from public.company_billing_accounts current_binding
  join public.billing_accounts ba on ba.id = current_binding.billing_account_id
  join public.billing_entitlements be on be.billing_account_id = ba.id
  join public.company_seat_entitlements cse on cse.company_id = current_binding.company_id
  left join public.company_billing_accounts cba on cba.billing_account_id = ba.id
  left join public.company_users cu on cu.company_id = current_binding.company_id
  where current_binding.company_id = input_company_id
  group by
    ba.status, ba.trial_ends_at, be.plan_code, be.company_limit,
    cse.included_seat_limit, cse.additional_worker_bundles;
end;
$$;

revoke all on function public.get_company_billing_summary(uuid) from public;
grant execute on function public.get_company_billing_summary(uuid) to authenticated;

notify pgrst, 'reload schema';
