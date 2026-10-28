-- Product-neutral Stripe lifecycle. This deliberately stays separate from
-- workshop invoices: it records what the SaaS customer may use, not what that
-- customer's own business charges to its clients.

alter table public.billing_accounts
  drop constraint if exists billing_accounts_status_check;

alter table public.billing_accounts
  add constraint billing_accounts_status_check
  check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete', 'manual'));

create table if not exists public.billing_product_entitlements (
  billing_account_id uuid not null references public.billing_accounts(id) on delete cascade,
  product_key text not null check (product_key in ('businesssite', 'pitlane')),
  plan_code text not null,
  state text not null check (state in ('active', 'grace', 'read_only', 'suspended', 'manual')),
  source text not null check (source in ('stripe', 'founder_grant', 'support_grant', 'manual')),
  price_key text,
  current_period_ends_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (billing_account_id, product_key)
);

create index if not exists billing_product_entitlements_account_state_idx
  on public.billing_product_entitlements (billing_account_id, state);

alter table public.billing_subscriptions
  add column if not exists product_key text,
  add column if not exists price_key text,
  add column if not exists stripe_customer_id text;

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_product_key_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_product_key_check
  check (product_key is null or product_key in ('businesssite', 'pitlane'));

-- Existing manual accounts remain usable and visible under both known product
-- surfaces until an owner is deliberately migrated to a paid Stripe product.
insert into public.billing_product_entitlements (
  billing_account_id, product_key, plan_code, state, source
)
select ba.id, product.product_key, 'manual', 'manual', 'manual'
from public.billing_accounts ba
cross join (values ('businesssite'::text), ('pitlane'::text)) as product(product_key)
where ba.status = 'manual'
on conflict (billing_account_id, product_key) do nothing;

alter table public.billing_product_entitlements enable row level security;

drop policy if exists "billing owners read product entitlements" on public.billing_product_entitlements;
create policy "billing owners read product entitlements" on public.billing_product_entitlements
for select to authenticated using (
  exists (
    select 1 from public.billing_accounts account
    where account.id = billing_product_entitlements.billing_account_id
      and account.owner_user_id = auth.uid()
  )
);

revoke all on public.billing_product_entitlements from authenticated;
grant select on public.billing_product_entitlements to authenticated;

-- This function accepts data only from a server using the Supabase service key.
-- It provides idempotency: a replayed Stripe event returns false and cannot
-- apply a second entitlement transition.
create or replace function public.apply_stripe_subscription_event(
  input_event_id text,
  input_event_type text,
  input_billing_account_id uuid,
  input_product_key text,
  input_plan_code text,
  input_price_key text,
  input_stripe_customer_id text,
  input_stripe_subscription_id text,
  input_stripe_price_id text,
  input_status text,
  input_interval text,
  input_current_period_ends_at timestamptz,
  input_cancel_at_period_end boolean default false,
  input_payload jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  entitlement_state text;
  event_inserted_count bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Stripe lifecycle updates require the service role.';
  end if;

  if input_event_id is null or char_length(trim(input_event_id)) < 8 then
    raise exception 'Stripe event identifier is required.';
  end if;
  if input_product_key not in ('businesssite', 'pitlane') then
    raise exception 'Unknown billing product.';
  end if;
  if input_status not in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete') then
    raise exception 'Unsupported Stripe subscription status.';
  end if;
  if input_interval is not null and input_interval not in ('month', 'year') then
    raise exception 'Unsupported billing interval.';
  end if;

  insert into public.billing_events (stripe_event_id, event_type, billing_account_id, payload, processed_at)
  values (input_event_id, input_event_type, input_billing_account_id, coalesce(input_payload, '{}'::jsonb), now())
  on conflict (stripe_event_id) do nothing;
  get diagnostics event_inserted_count = row_count;
  if event_inserted_count = 0 then return false; end if;

  entitlement_state := case
    when input_status in ('active', 'trialing') then 'active'
    when input_status = 'past_due' then 'grace'
    when input_status = 'incomplete' then 'read_only'
    else 'suspended'
  end;

  insert into public.billing_subscriptions (
    billing_account_id, stripe_subscription_id, stripe_price_id, stripe_customer_id,
    product_key, price_key, status, interval, current_period_ends_at, cancel_at_period_end
  ) values (
    input_billing_account_id, input_stripe_subscription_id, input_stripe_price_id, input_stripe_customer_id,
    input_product_key, input_price_key, input_status, input_interval, input_current_period_ends_at, input_cancel_at_period_end
  ) on conflict (stripe_subscription_id) do update set
    stripe_price_id = excluded.stripe_price_id,
    stripe_customer_id = excluded.stripe_customer_id,
    product_key = excluded.product_key,
    price_key = excluded.price_key,
    status = excluded.status,
    interval = excluded.interval,
    current_period_ends_at = excluded.current_period_ends_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();

  insert into public.billing_product_entitlements (
    billing_account_id, product_key, plan_code, state, source, price_key, current_period_ends_at
  ) values (
    input_billing_account_id, input_product_key, input_plan_code, entitlement_state, 'stripe', input_price_key, input_current_period_ends_at
  ) on conflict (billing_account_id, product_key) do update set
    plan_code = excluded.plan_code,
    state = excluded.state,
    source = 'stripe',
    price_key = excluded.price_key,
    current_period_ends_at = excluded.current_period_ends_at,
    updated_at = now();

  update public.billing_accounts
    set stripe_customer_id = coalesce(input_stripe_customer_id, stripe_customer_id),
        status = input_status,
        updated_at = now()
  where id = input_billing_account_id;

  return true;
end;
$$;

revoke all on function public.apply_stripe_subscription_event(text, text, uuid, text, text, text, text, text, text, text, text, timestamptz, boolean, jsonb) from public;
grant execute on function public.apply_stripe_subscription_event(text, text, uuid, text, text, text, text, text, text, text, text, timestamptz, boolean, jsonb) to service_role;

notify pgrst, 'reload schema';
