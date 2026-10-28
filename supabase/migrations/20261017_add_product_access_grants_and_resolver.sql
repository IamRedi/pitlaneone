-- Central, product-scoped free access. This is intentionally separate from
-- public.customer invoices/payments and from legacy billing_grants, which was
-- account-only and cannot represent a pre-registration email safely.

create table if not exists public.billing_grant_subjects (
  id uuid primary key default gen_random_uuid(),
  email text,
  user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or user_id is not null),
  check (email is null or lower(btrim(email)) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create unique index if not exists billing_grant_subjects_email_lower_unique
  on public.billing_grant_subjects (lower(btrim(email))) where email is not null;
create unique index if not exists billing_grant_subjects_user_unique
  on public.billing_grant_subjects (user_id) where user_id is not null;

create table if not exists public.billing_access_grants (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.billing_grant_subjects(id) on delete restrict,
  product_key text not null check (product_key in ('businesssite', 'pitlane')),
  entitlement_level text not null check (entitlement_level in ('core', 'team', 'internal')),
  source text not null check (source in ('vip_free', 'internal_free', 'promo_grant', 'founder_grant', 'support_grant')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  revoked_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 16 and 160),
  check (expires_at is null or expires_at > starts_at),
  check (revoked_at is null or revoked_at >= starts_at),
  check (revocation_reason is null or char_length(btrim(revocation_reason)) between 3 and 500)
);

create index if not exists billing_access_grants_resolver_idx
  on public.billing_access_grants (subject_id, product_key, starts_at, expires_at)
  where revoked_at is null;
create unique index if not exists billing_access_grants_active_idempotency_unique
  on public.billing_access_grants (idempotency_key) where revoked_at is null;

alter table public.billing_grant_subjects enable row level security;
alter table public.billing_access_grants enable row level security;
revoke all on public.billing_grant_subjects, public.billing_access_grants from authenticated;

drop policy if exists "super admins read billing grant subjects" on public.billing_grant_subjects;
create policy "super admins read billing grant subjects" on public.billing_grant_subjects
for select to authenticated using (public.is_super_admin(auth.uid()));
drop policy if exists "super admins read billing access grants" on public.billing_access_grants;
create policy "super admins read billing access grants" on public.billing_access_grants
for select to authenticated using (public.is_super_admin(auth.uid()));

-- Upsert-style subject creation is centrally managed through one function.
-- It intentionally permits only product/level/source values declared above.
create or replace function public.upsert_billing_access_grant(
  input_email text,
  input_user_id uuid,
  input_product_key text,
  input_entitlement_level text,
  input_source text,
  input_reason text,
  input_starts_at timestamptz,
  input_expires_at timestamptz,
  input_idempotency_key text
)
returns public.billing_access_grants
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized_email text := nullif(lower(btrim(input_email)), '');
  subject public.billing_grant_subjects;
  existing_grant public.billing_access_grants;
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    raise exception 'Only a platform super administrator can manage billing grants.' using errcode = '42501';
  end if;
  if normalized_email is null and input_user_id is null then raise exception 'A target email or user is required.' using errcode = '22023'; end if;
  if normalized_email is not null and normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'A valid target email is required.' using errcode = '22023'; end if;
  if input_product_key not in ('businesssite', 'pitlane') then raise exception 'Unsupported billing product.' using errcode = '22023'; end if;
  if input_entitlement_level not in ('core', 'team', 'internal') then raise exception 'Unsupported entitlement level.' using errcode = '22023'; end if;
  if input_source not in ('vip_free', 'internal_free', 'promo_grant', 'founder_grant', 'support_grant') then raise exception 'Unsupported grant source.' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(input_reason, ''))) not between 3 and 500 then raise exception 'A grant reason is required.' using errcode = '22023'; end if;
  if input_expires_at is not null and input_expires_at <= coalesce(input_starts_at, now()) then raise exception 'The expiration must be after the start.' using errcode = '22023'; end if;

  select * into existing_grant from public.billing_access_grants where idempotency_key = input_idempotency_key and revoked_at is null;
  if existing_grant.id is not null then return existing_grant; end if;

  if normalized_email is not null then
    select * into subject from public.billing_grant_subjects where lower(btrim(email)) = normalized_email for update;
  elsif input_user_id is not null then
    select * into subject from public.billing_grant_subjects where user_id = input_user_id for update;
  end if;

  if subject.id is null then
    insert into public.billing_grant_subjects (email, user_id, created_by)
    values (normalized_email, input_user_id, auth.uid()) returning * into subject;
  elsif subject.user_id is null and input_user_id is not null then
    update public.billing_grant_subjects set user_id = input_user_id, updated_at = now() where id = subject.id returning * into subject;
  end if;

  insert into public.billing_access_grants (
    subject_id, product_key, entitlement_level, source, reason, starts_at, expires_at, created_by, idempotency_key
  ) values (
    subject.id, input_product_key, input_entitlement_level, input_source, btrim(input_reason), coalesce(input_starts_at, now()), input_expires_at, auth.uid(), input_idempotency_key
  ) returning * into existing_grant;
  return existing_grant;
end;
$$;

create or replace function public.revoke_billing_access_grant(input_grant_id uuid, input_reason text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    raise exception 'Only a platform super administrator can revoke billing grants.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(input_reason, ''))) not between 3 and 500 then raise exception 'A revocation reason is required.' using errcode = '22023'; end if;
  update public.billing_access_grants
  set revoked_at = coalesce(revoked_at, now()), revoked_by = coalesce(revoked_by, auth.uid()), revocation_reason = coalesce(revocation_reason, btrim(input_reason))
  where id = input_grant_id;
  if not found then raise exception 'Billing grant was not found.' using errcode = 'P0002'; end if;
end;
$$;

-- The one authoritative access decision. It takes a product key and resolves
-- a valid product entitlement from Stripe or one active grant for the current
-- auth user/email. Product rows never cross-unlock another surface.
create or replace function public.resolve_product_entitlement(input_product_key text)
returns table (
  is_active boolean,
  product_key text,
  entitlement_level text,
  source text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with caller_user as (
    select id, lower(email) as email from auth.users where id = auth.uid()
  ), grant_match as (
    select g.entitlement_level, g.source, g.expires_at, 1 as priority
    from public.billing_access_grants g
    join public.billing_grant_subjects subject on subject.id = g.subject_id
    join caller_user u on (subject.user_id = u.id or (subject.email is not null and lower(subject.email) = u.email))
    where g.product_key = input_product_key
      and g.revoked_at is null and g.starts_at <= now()
      and (g.expires_at is null or g.expires_at > now())
  ), stripe_match as (
    select entitlement.plan_code as entitlement_level,
      case entitlement.source when 'stripe' then 'stripe_subscription' else entitlement.source end as source,
      entitlement.current_period_ends_at as expires_at,
      2 as priority
    from public.billing_product_entitlements entitlement
    join public.billing_accounts account on account.id = entitlement.billing_account_id
    where account.owner_user_id = auth.uid()
      and entitlement.product_key = input_product_key
      and entitlement.state in ('active', 'grace', 'manual')
      and (entitlement.current_period_ends_at is null or entitlement.current_period_ends_at > now())
  ), resolved as (
    select * from grant_match union all select * from stripe_match order by priority asc limit 1
  )
  select coalesce((select true from resolved), false), input_product_key,
    (select entitlement_level from resolved), coalesce((select source from resolved), 'none'), (select expires_at from resolved);
$$;

create or replace function public.list_billing_access_grants()
returns table (
  id uuid,
  email text,
  user_id uuid,
  product_key text,
  entitlement_level text,
  source text,
  reason text,
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select access_grant.id, subject.email, subject.user_id, access_grant.product_key, access_grant.entitlement_level,
    access_grant.source, access_grant.reason, access_grant.starts_at, access_grant.expires_at, access_grant.revoked_at, access_grant.revocation_reason, access_grant.created_at
  from public.billing_access_grants access_grant
  join public.billing_grant_subjects subject on subject.id = access_grant.subject_id
  where public.is_super_admin(auth.uid())
  order by access_grant.created_at desc;
$$;

revoke all on function public.upsert_billing_access_grant(text, uuid, text, text, text, text, timestamptz, timestamptz, text) from public;
revoke all on function public.revoke_billing_access_grant(uuid, text) from public;
revoke all on function public.resolve_product_entitlement(text) from public;
revoke all on function public.list_billing_access_grants() from public;
grant execute on function public.upsert_billing_access_grant(text, uuid, text, text, text, text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.revoke_billing_access_grant(uuid, text) to authenticated;
grant execute on function public.resolve_product_entitlement(text) to authenticated;
grant execute on function public.list_billing_access_grants() to authenticated;

notify pgrst, 'reload schema';
