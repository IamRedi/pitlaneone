-- Final commercial catalog and product-specific lifecycle controls. Amounts
-- are stored in currency minor units. ALL uses the fixed commercial rule
-- EUR 1 = ALL 100 and approximately 30% lower local-market pricing.

create table if not exists public.billing_price_catalog (
  price_key text primary key,
  product_key text not null check (product_key in ('businesssite', 'pitlane')),
  plan_key text not null,
  market_country text not null check (market_country in ('DE', 'AL')),
  currency text not null check (currency in ('EUR', 'ALL')),
  amount_minor integer not null check (amount_minor > 0),
  interval text not null default 'month' check (interval in ('month')),
  campaign_key text,
  campaign_duration_months integer check (campaign_duration_months is null or campaign_duration_months between 1 and 24),
  active_for_sale boolean not null default false,
  included_features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check ((market_country = 'DE' and currency = 'EUR') or (market_country = 'AL' and currency = 'ALL'))
);

-- Safe if an earlier manual execution created the table before the catalogue
-- seed failed: existing and future rows both receive the monthly interval.
alter table public.billing_price_catalog alter column interval set default 'month';
update public.billing_price_catalog set interval = 'month' where interval is null;

insert into public.billing_price_catalog (price_key, product_key, plan_key, market_country, currency, amount_minor, interval, active_for_sale, included_features, campaign_key, campaign_duration_months) values
  ('businesssite.start.monthly.de', 'businesssite', 'start', 'DE', 'EUR', 2990, 'month', true, '["multilingual","private_preview","public_website"]', null, null),
  ('businesssite.start.monthly.al', 'businesssite', 'start', 'AL', 'ALL', 210000, 'month', true, '["multilingual","private_preview","public_website"]', null, null),
  ('businesssite.booking.monthly.de', 'businesssite', 'booking', 'DE', 'EUR', 3990, 'month', true, '["multilingual","private_preview","public_website","appointments"]', null, null),
  ('businesssite.booking.monthly.al', 'businesssite', 'booking', 'AL', 'ALL', 280000, 'month', true, '["multilingual","private_preview","public_website","appointments"]', null, null),
  ('businesssite.booking.founder_12m.de', 'businesssite', 'booking', 'DE', 'EUR', 2990, 'month', false, '["multilingual","private_preview","public_website","appointments"]', 'founder_12m', 12),
  ('businesssite.booking.founder_12m.al', 'businesssite', 'booking', 'AL', 'ALL', 210000, 'month', false, '["multilingual","private_preview","public_website","appointments"]', 'founder_12m', 12),
  ('pitlane.core.monthly.de', 'pitlane', 'core', 'DE', 'EUR', 3990, 'month', true, '["workshop_operations","invoicing","multilingual"]', null, null),
  ('pitlane.core.monthly.al', 'pitlane', 'core', 'AL', 'ALL', 280000, 'month', true, '["workshop_operations","invoicing","multilingual"]', null, null),
  ('pitlane.complete.monthly.de', 'pitlane', 'complete', 'DE', 'EUR', 6990, 'month', true, '["workshop_operations","invoicing","inventory","appointments","multilingual"]', null, null),
  ('pitlane.complete.monthly.al', 'pitlane', 'complete', 'AL', 'ALL', 490000, 'month', true, '["workshop_operations","invoicing","inventory","appointments","multilingual"]', null, null),
  ('pitlane.complete.founder_12m.de', 'pitlane', 'complete', 'DE', 'EUR', 4990, 'month', false, '["workshop_operations","invoicing","inventory","appointments","multilingual"]', 'founder_12m', 12),
  ('pitlane.complete.founder_12m.al', 'pitlane', 'complete', 'AL', 'ALL', 350000, 'month', false, '["workshop_operations","invoicing","inventory","appointments","multilingual"]', 'founder_12m', 12)
on conflict (price_key) do update set amount_minor = excluded.amount_minor, active_for_sale = excluded.active_for_sale, included_features = excluded.included_features;

alter table public.billing_price_catalog enable row level security;
drop policy if exists "authenticated read billing price catalog" on public.billing_price_catalog;
create policy "authenticated read billing price catalog" on public.billing_price_catalog for select to authenticated using (true);
revoke all on public.billing_price_catalog from authenticated;
grant select on public.billing_price_catalog to authenticated;

-- Checkout and future pricing UI read a single active market row rather than
-- embedding amounts in application components. Stripe IDs remain environment
-- configuration because they are deployment secrets/identifiers.
create function public.get_active_billing_price(input_product_key text, input_plan_key text, input_market_country text)
returns table (price_key text, currency text, amount_minor integer, included_features jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  select catalog.price_key, catalog.currency, catalog.amount_minor, catalog.included_features
  from public.billing_price_catalog catalog
  where catalog.product_key = input_product_key
    and catalog.plan_key = input_plan_key
    and catalog.market_country = input_market_country
    and catalog.active_for_sale = true
    and catalog.campaign_key is null
  limit 1;
$$;
revoke all on function public.get_active_billing_price(text, text, text) from public;
grant execute on function public.get_active_billing_price(text, text, text) to authenticated;

create table if not exists public.billing_product_trials (
  billing_account_id uuid not null references public.billing_accounts(id) on delete cascade,
  product_key text not null check (product_key in ('pitlane')),
  entitlement_level text not null check (entitlement_level in ('core')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (billing_account_id, product_key),
  check (ends_at = starts_at + interval '7 days')
);

alter table public.billing_product_trials enable row level security;
drop policy if exists "owners read own product trials" on public.billing_product_trials;
create policy "owners read own product trials" on public.billing_product_trials for select to authenticated using (
  exists (select 1 from public.billing_accounts account where account.id = billing_product_trials.billing_account_id and account.owner_user_id = auth.uid())
);
revoke all on public.billing_product_trials from authenticated;
grant select on public.billing_product_trials to authenticated;

-- BusinessSite has a free demo, not a timed subscription trial. Retain the
-- existing validated creator and normalize its resulting account/company state.
alter function public.create_self_service_business_site(text, text, text, text, text, jsonb)
  rename to create_self_service_business_site_pre_commercial_lifecycle;

create function public.create_self_service_business_site(
  input_name text, input_slug text, input_industry_key text, input_subcategory_key text, input_website_locale text, input_generation_payload jsonb
)
returns uuid language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare created_company_id uuid; account_id uuid;
begin
  created_company_id := public.create_self_service_business_site_pre_commercial_lifecycle(input_name, input_slug, input_industry_key, input_subcategory_key, input_website_locale, input_generation_payload);
  select billing_account_id into account_id from public.company_billing_accounts where company_id = created_company_id;
  -- The legacy creator used a global 10-day state. BusinessSite now uses its
  -- own non-expiring private demo state and never receives paid entitlement.
  update public.billing_accounts set status = 'manual', trial_started_at = null, trial_ends_at = null where id = account_id and status = 'trialing';
  update public.billing_entitlements set plan_code = 'manual' where billing_account_id = account_id and plan_code = 'trial';
  update public.companies set lifecycle_status = 'conversion_pending', demo_expires_at = null where id = created_company_id;
  update public.company_profiles set is_public = false where company_id = created_company_id;
  return created_company_id;
end;
$$;
revoke all on function public.create_self_service_business_site(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_self_service_business_site(text, text, text, text, text, jsonb) to authenticated;

-- One Pitlane trial per billing account, stored separately from every other
-- product. The legacy company creator keeps its tenancy validation.
create or replace function public.create_pitlane_trial_company(input_name text, input_slug text)
returns uuid language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare account public.billing_accounts; created_company_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into account from public.billing_accounts where owner_user_id = auth.uid() for update;
  if account.id is null then
    insert into public.billing_accounts (owner_user_id, status) values (auth.uid(), 'manual') returning * into account;
    insert into public.billing_entitlements (billing_account_id, plan_code, company_limit) values (account.id, 'manual', 1);
  else
    update public.billing_accounts set status = 'manual', trial_started_at = null, trial_ends_at = null where id = account.id and status in ('trialing', 'paused', 'canceled', 'incomplete');
  end if;
  if exists (select 1 from public.billing_product_trials where billing_account_id = account.id and product_key = 'pitlane') then
    raise exception 'The introductory PitlaneOne trial was already used.' using errcode = '42501';
  end if;
  insert into public.billing_product_trials (billing_account_id, product_key, entitlement_level, starts_at, ends_at)
  values (account.id, 'pitlane', 'core', now(), now() + interval '7 days');
  created_company_id := public.create_trial_company(input_name, input_slug);
  return created_company_id;
end;
$$;
revoke all on function public.create_pitlane_trial_company(text, text) from public;
grant execute on function public.create_pitlane_trial_company(text, text) to authenticated;
-- Do not leave the former generic trial entry point callable by browser users:
-- it cannot enforce the product-specific once-only trial record above.
revoke all on function public.create_trial_company(text, text) from authenticated;

-- Replace the prior resolver with lifecycle-aware output. Only the caller's
-- own user is considered; trials are product-scoped and BusinessSite demos are
-- explicitly inactive/non-publishable.
drop function if exists public.resolve_product_entitlement(text);
create function public.resolve_product_entitlement(input_product_key text)
returns table (is_active boolean, product_key text, entitlement_level text, source text, expires_at timestamptz, lifecycle text, may_publish boolean)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  with grant_match as (
    select g.entitlement_level, g.source, g.expires_at, 1 as priority, true as active, true as publishable
    from public.billing_access_grants g join public.billing_grant_subjects subject on subject.id = g.subject_id
    join auth.users u on (subject.user_id = u.id or (subject.email is not null and lower(subject.email) = lower(u.email)))
    where u.id = auth.uid() and g.product_key = input_product_key and g.revoked_at is null and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now())
  ), stripe_match as (
    select entitlement.plan_code as entitlement_level, case entitlement.source when 'stripe' then 'stripe_subscription' else entitlement.source end as source, entitlement.current_period_ends_at as expires_at, 2 as priority, true as active, true as publishable
    from public.billing_product_entitlements entitlement join public.billing_accounts account on account.id = entitlement.billing_account_id
    where account.owner_user_id = auth.uid() and entitlement.product_key = input_product_key and entitlement.state in ('active', 'grace', 'manual') and (entitlement.current_period_ends_at is null or entitlement.current_period_ends_at > now())
  ), trial_match as (
    select trial.entitlement_level, 'trial'::text as source, trial.ends_at as expires_at, 3 as priority, true as active, true as publishable
    from public.billing_product_trials trial join public.billing_accounts account on account.id = trial.billing_account_id
    where account.owner_user_id = auth.uid() and trial.product_key = input_product_key and trial.starts_at <= now() and trial.ends_at > now()
  ), resolved as (
    select * from grant_match union all select * from stripe_match union all select * from trial_match order by priority limit 1
  ), demo_exists as (
    select exists(select 1 from public.companies company where company.created_by = auth.uid() and company.product_surface = 'business_site' and company.lifecycle_status in ('demo_trial', 'conversion_pending') and input_product_key = 'businesssite') as value
  )
  select coalesce((select active from resolved), false), input_product_key, coalesce((select entitlement_level from resolved), case when (select value from demo_exists) then 'demo' end), coalesce((select source from resolved), 'none'), (select expires_at from resolved),
    case when exists(select 1 from resolved) and (select source from resolved) = 'trial' then 'trialing' when exists(select 1 from resolved) then 'active' when (select value from demo_exists) then 'demo' else 'inactive' end,
    coalesce((select publishable from resolved), false);
$$;
revoke all on function public.resolve_product_entitlement(text) from public;
grant execute on function public.resolve_product_entitlement(text) to authenticated;

create or replace function public.enforce_public_profile_entitlement()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare product text; permitted boolean;
begin
  if new.is_public and not old.is_public and auth.role() <> 'service_role' then
    select case when company.product_surface = 'business_site' then 'businesssite' else 'pitlane' end into product from public.companies company where company.id = new.company_id;
    select may_publish into permitted from public.resolve_product_entitlement(product);
    if not coalesce(permitted, false) then raise exception 'A paid or granted product entitlement is required before public publishing.' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_public_profile_entitlement on public.company_profiles;
create trigger enforce_public_profile_entitlement before update of is_public on public.company_profiles for each row execute function public.enforce_public_profile_entitlement();

notify pgrst, 'reload schema';
