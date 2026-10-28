-- Deliberate human access grants for founder customers, support recovery and
-- approved promotions. Paid Stripe subscriptions remain separate; a grant is
-- never created by a browser client.

create table if not exists public.billing_grants (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.billing_accounts(id) on delete cascade,
  grant_type text not null check (grant_type in ('founder', 'support', 'promotion')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (revoked_at is null or revoked_at >= starts_at)
);

create index if not exists billing_grants_account_active_idx
  on public.billing_grants (billing_account_id, starts_at, ends_at)
  where revoked_at is null;

alter table public.billing_grants enable row level security;

create policy "billing owners read own grants" on public.billing_grants
for select to authenticated using (
  exists (
    select 1 from public.billing_accounts account
    where account.id = billing_grants.billing_account_id
      and account.owner_user_id = auth.uid()
  )
);

revoke all on public.billing_grants from authenticated;
grant select on public.billing_grants to authenticated;

notify pgrst, 'reload schema';
