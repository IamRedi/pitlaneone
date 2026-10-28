-- SaaS billing foundation. This migration does not call Stripe and does not
-- touch workshop invoices. It creates entitlement records that Stripe webhooks
-- will manage in a later migration.

create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete restrict,
  stripe_customer_id text unique,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'manual')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'trialing' and trial_started_at is not null and trial_ends_at is not null)
    or status <> 'trialing'
  )
);

create table if not exists public.billing_entitlements (
  billing_account_id uuid primary key references public.billing_accounts (id) on delete cascade,
  plan_code text not null default 'trial'
    check (plan_code in ('trial', 'solo_monthly', 'solo_annual', 'two_company_monthly', 'two_company_annual', 'manual')),
  company_limit integer not null default 1 check (company_limit between 1 and 2),
  custom_domain_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_billing_accounts (
  company_id uuid primary key references public.companies (id) on delete cascade,
  billing_account_id uuid not null references public.billing_accounts (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists company_billing_accounts_billing_account_idx
on public.company_billing_accounts (billing_account_id);

create table if not exists public.company_seat_entitlements (
  company_id uuid primary key references public.companies (id) on delete cascade,
  included_seat_limit integer not null default 4 check (included_seat_limit >= 4),
  additional_worker_bundles integer not null default 0 check (additional_worker_bundles between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.billing_accounts (id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete')),
  interval text check (interval in ('month', 'year')),
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  billing_account_id uuid references public.billing_accounts (id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

-- Existing companies stay usable. They are represented as manual accounts
-- until their owner is deliberately moved to Stripe; no one loses access from
-- a schema migration.
insert into public.billing_accounts (owner_user_id, status)
select distinct c.created_by, 'manual'
from public.companies c
on conflict (owner_user_id) do nothing;

insert into public.billing_entitlements (billing_account_id, plan_code, company_limit)
select ba.id, 'manual', greatest(1, least(2, count(c.id)::integer))
from public.billing_accounts ba
left join public.companies c on c.created_by = ba.owner_user_id
where ba.status = 'manual'
group by ba.id
on conflict (billing_account_id) do nothing;

insert into public.company_billing_accounts (company_id, billing_account_id)
select c.id, ba.id
from public.companies c
join public.billing_accounts ba on ba.owner_user_id = c.created_by
on conflict (company_id) do nothing;

insert into public.company_seat_entitlements (company_id, included_seat_limit)
select c.id, greatest(4, count(cu.user_id) filter (where cu.is_active))::integer
from public.companies c
left join public.company_users cu on cu.company_id = c.id
group by c.id
on conflict (company_id) do nothing;

drop trigger if exists set_billing_accounts_updated_at on public.billing_accounts;
create trigger set_billing_accounts_updated_at before update on public.billing_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_entitlements_updated_at on public.billing_entitlements;
create trigger set_billing_entitlements_updated_at before update on public.billing_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists set_company_seat_entitlements_updated_at on public.company_seat_entitlements;
create trigger set_company_seat_entitlements_updated_at before update on public.company_seat_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_subscriptions_updated_at on public.billing_subscriptions;
create trigger set_billing_subscriptions_updated_at before update on public.billing_subscriptions
for each row execute function public.set_updated_at();

alter table public.billing_accounts enable row level security;
alter table public.billing_entitlements enable row level security;
alter table public.company_billing_accounts enable row level security;
alter table public.company_seat_entitlements enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "billing owners read accounts" on public.billing_accounts;
create policy "billing owners read accounts" on public.billing_accounts
for select to authenticated using (owner_user_id = auth.uid());

drop policy if exists "billing owners read entitlements" on public.billing_entitlements;
create policy "billing owners read entitlements" on public.billing_entitlements
for select to authenticated using (
  exists (
    select 1 from public.billing_accounts ba
    where ba.id = billing_entitlements.billing_account_id
      and ba.owner_user_id = auth.uid()
  )
);

drop policy if exists "company owners read billing binding" on public.company_billing_accounts;
create policy "company owners read billing binding" on public.company_billing_accounts
for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner']));

drop policy if exists "company owners read seat entitlement" on public.company_seat_entitlements;
create policy "company owners read seat entitlement" on public.company_seat_entitlements
for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner']));

drop policy if exists "billing owners read subscriptions" on public.billing_subscriptions;
create policy "billing owners read subscriptions" on public.billing_subscriptions
for select to authenticated using (
  exists (
    select 1 from public.billing_accounts ba
    where ba.id = billing_subscriptions.billing_account_id
      and ba.owner_user_id = auth.uid()
  )
);

revoke all on public.billing_accounts, public.billing_entitlements,
  public.company_billing_accounts, public.company_seat_entitlements,
  public.billing_subscriptions, public.billing_events from authenticated;
grant select on public.billing_accounts, public.billing_entitlements,
  public.company_billing_accounts, public.company_seat_entitlements,
  public.billing_subscriptions to authenticated;

-- Browser clients must create companies through this guarded function. It
-- starts exactly one trial per owner and binds every owned company to the
-- owner's billing account.
create or replace function public.create_trial_company(
  input_name text,
  input_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  account public.billing_accounts;
  entitlement public.billing_entitlements;
  new_company_id uuid;
  owned_company_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if input_name is null or char_length(trim(input_name)) not between 2 and 80 then
    raise exception 'Enter a valid company name.';
  end if;

  if input_slug is null or lower(trim(input_slug)) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(input_slug)) not between 3 and 63 then
    raise exception 'Enter a valid company identifier.';
  end if;

  select * into account
  from public.billing_accounts
  where owner_user_id = auth.uid()
  for update;

  if account.id is null then
    insert into public.billing_accounts (owner_user_id, status, trial_started_at, trial_ends_at)
    values (auth.uid(), 'trialing', now(), now() + interval '10 days')
    returning * into account;

    insert into public.billing_entitlements (billing_account_id, plan_code, company_limit)
    values (account.id, 'trial', 1);
  end if;

  if account.status = 'trialing' and account.trial_ends_at <= now() then
    update public.billing_accounts set status = 'paused' where id = account.id;
    raise exception 'Your 10-day trial has ended. Choose a plan to create another company.';
  end if;

  if account.status not in ('trialing', 'active', 'manual') then
    raise exception 'An active Makinaime plan is required to create a company.';
  end if;

  select * into entitlement
  from public.billing_entitlements
  where billing_account_id = account.id;

  if entitlement.billing_account_id is null then
    raise exception 'Billing entitlement is unavailable.';
  end if;

  select count(*)::integer into owned_company_count
  from public.company_billing_accounts
  where billing_account_id = account.id;

  if owned_company_count >= entitlement.company_limit then
    raise exception 'Your current plan includes one company. Activate the second-company plan to add another.';
  end if;

  insert into public.companies (name, slug, created_by)
  values (trim(input_name), lower(trim(input_slug)), auth.uid())
  returning id into new_company_id;

  insert into public.company_billing_accounts (company_id, billing_account_id)
  values (new_company_id, account.id);

  insert into public.company_seat_entitlements (company_id)
  values (new_company_id);

  return new_company_id;
end;
$$;

create or replace function public.company_seat_limit(input_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select cse.included_seat_limit + (cse.additional_worker_bundles * 5)
  from public.company_seat_entitlements cse
  where cse.company_id = input_company_id;
$$;

create or replace function public.assert_company_seat_capacity(
  input_company_id uuid,
  include_pending_invitations boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  seat_limit integer;
  active_members integer;
  pending_invitations integer := 0;
begin
  select public.company_seat_limit(input_company_id) into seat_limit;
  if seat_limit is null then
    raise exception 'Company seat entitlement is unavailable.';
  end if;

  select count(*)::integer into active_members
  from public.company_users
  where company_id = input_company_id and is_active = true;

  if include_pending_invitations then
    select count(*)::integer into pending_invitations
    from public.company_invitations
    where company_id = input_company_id
      and status = 'pending'
      and expires_at > now();
  end if;

  if active_members + pending_invitations >= seat_limit then
    raise exception 'The active team has reached this plan''s seat limit.';
  end if;
end;
$$;

-- Direct company creation would bypass trial and company-limit checks.
drop policy if exists "authenticated create companies" on public.companies;
revoke insert on public.companies from authenticated;

-- Keep the existing permissions logic, but enforce the paid-seat cap in the
-- database for both direct member adds and email invitations.
create or replace function public.add_company_member_by_email(
  input_company_id uuid,
  input_email text,
  input_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  target_user_id uuid;
  target_email text;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin']) then
    raise exception 'Only a company owner or administrator can manage members.';
  end if;

  select role into caller_role from public.company_users
  where company_id = input_company_id and user_id = auth.uid() and is_active = true;
  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'Only a company owner or administrator can manage members.';
  end if;
  if input_role not in ('admin', 'manager', 'staff', 'accounting', 'viewer') then
    raise exception 'Choose a valid non-owner company role.';
  end if;
  if caller_role = 'admin' and input_role = 'admin' then
    raise exception 'Only the company owner can add an administrator.';
  end if;

  select id, lower(email) into target_user_id, target_email
  from auth.users where lower(email) = lower(trim(input_email)) limit 1;
  if target_user_id is null then
    raise exception 'The user must create a Makinaime account before being added to a company.';
  end if;
  if exists (select 1 from public.company_users where company_id = input_company_id and user_id = target_user_id) then
    raise exception 'This user is already part of the company.';
  end if;

  perform public.assert_company_seat_capacity(input_company_id, false);
  insert into public.company_users (company_id, user_id, role, member_email, is_active)
  values (input_company_id, target_user_id, input_role, target_email, true);
end;
$$;

create or replace function public.create_company_invitation(
  input_company_id uuid,
  input_email text,
  input_role text
)
returns public.company_invitations
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  normalized_email text := lower(trim(input_email));
  invitation public.company_invitations;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin']) then
    raise exception 'Only a company owner or administrator can invite members.';
  end if;
  select role into caller_role from public.company_users
  where company_id = input_company_id and user_id = auth.uid() and is_active = true;
  if caller_role is null then raise exception 'Only an active company manager can invite members.'; end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid email address.'; end if;
  if input_role not in ('admin', 'manager', 'staff', 'accounting', 'viewer') then raise exception 'Choose a valid non-owner company role.'; end if;
  if caller_role = 'admin' and input_role = 'admin' then raise exception 'Only the company owner can invite an administrator.'; end if;
  if exists (select 1 from public.company_users cu join auth.users au on au.id = cu.user_id where cu.company_id = input_company_id and lower(au.email) = normalized_email) then
    raise exception 'This email already belongs to a company member.';
  end if;

  update public.company_invitations set status = 'revoked'
  where company_id = input_company_id and email = normalized_email and status = 'pending';
  perform public.assert_company_seat_capacity(input_company_id, true);

  insert into public.company_invitations (company_id, email, role, invited_by)
  values (input_company_id, normalized_email, input_role, auth.uid()) returning * into invitation;
  return invitation;
end;
$$;

create or replace function public.accept_company_invitation(input_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  invitation public.company_invitations;
  authenticated_email text;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  select lower(email) into authenticated_email from auth.users where id = auth.uid();
  select * into invitation from public.company_invitations
  where id = input_invitation_id and status = 'pending' for update;
  if invitation.id is null then raise exception 'This invitation is unavailable.'; end if;
  if invitation.expires_at <= now() then raise exception 'This invitation has expired.'; end if;
  if authenticated_email is null or invitation.email <> authenticated_email then raise exception 'This invitation belongs to a different email address.'; end if;

  if not exists (select 1 from public.company_users where company_id = invitation.company_id and user_id = auth.uid()) then
    perform public.assert_company_seat_capacity(invitation.company_id, false);
    insert into public.company_users (company_id, user_id, role, member_email, is_active)
    values (invitation.company_id, auth.uid(), invitation.role, authenticated_email, true);
  end if;

  update public.company_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invitation.id;
  return invitation.company_id;
end;
$$;

create or replace function public.update_company_member_access(
  input_company_id uuid,
  input_user_id uuid,
  input_role text,
  input_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
  target_role text;
  target_is_active boolean;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin']) then raise exception 'Only a company owner or administrator can manage members.'; end if;
  select role into caller_role from public.company_users where company_id = input_company_id and user_id = auth.uid() and is_active = true;
  if caller_role is null or caller_role not in ('owner', 'admin') then raise exception 'Only a company owner or administrator can manage members.'; end if;
  if input_user_id = auth.uid() then raise exception 'Use a separate ownership and access flow to change your own company access.'; end if;
  select role, is_active into target_role, target_is_active from public.company_users where company_id = input_company_id and user_id = input_user_id;
  if target_role is null then raise exception 'Company member was not found.'; end if;
  if target_role = 'owner' then raise exception 'Company owner access cannot be changed here.'; end if;
  if input_role not in ('admin', 'manager', 'staff', 'accounting', 'viewer') then raise exception 'Choose a valid non-owner company role.'; end if;
  if caller_role = 'admin' and (target_role = 'admin' or input_role = 'admin') then raise exception 'Only the company owner can manage administrator access.'; end if;
  if input_is_active and not target_is_active then perform public.assert_company_seat_capacity(input_company_id, false); end if;
  update public.company_users set role = input_role, is_active = input_is_active
  where company_id = input_company_id and user_id = input_user_id;
end;
$$;

revoke all on function public.create_trial_company(text, text) from public;
revoke all on function public.company_seat_limit(uuid) from public;
revoke all on function public.assert_company_seat_capacity(uuid, boolean) from public;
grant execute on function public.create_trial_company(text, text) to authenticated;
grant execute on function public.company_seat_limit(uuid) to authenticated;
grant execute on function public.assert_company_seat_capacity(uuid, boolean) to authenticated;
grant execute on function public.add_company_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.create_company_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_company_invitation(uuid) to authenticated;
grant execute on function public.update_company_member_access(uuid, uuid, text, boolean) to authenticated;

notify pgrst, 'reload schema';
