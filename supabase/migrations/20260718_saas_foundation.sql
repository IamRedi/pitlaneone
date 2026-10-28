create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_users (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'manager', 'staff', 'accounting', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_profiles (
  company_id uuid primary key references public.companies (id) on delete cascade,
  display_name text not null,
  description text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  country text,
  working_hours jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_theme_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  theme_preset text not null default 'steel-copper' check (theme_preset in ('steel-copper', 'chrome', 'light-metal', 'custom')),
  primary_color text not null default '#BD6D40' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#D17C4C' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#111417' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  surface_color text not null default '#1B2025' check (surface_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#F1F4F5' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  hero_image_url text,
  button_radius text not null default 'soft' check (button_radius in ('sharp', 'soft', 'rounded')),
  font_style text not null default 'system' check (font_style in ('system', 'technical', 'editorial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  hostname text not null unique check (hostname = lower(hostname) and hostname ~ '^[a-z0-9.-]+$'),
  domain_type text not null default 'custom' check (domain_type in ('platform', 'subdomain', 'custom')),
  is_primary boolean not null default false,
  is_verified boolean not null default false,
  verification_token text not null default encode(gen_random_bytes(24), 'hex'),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists company_domains_one_primary_idx
on public.company_domains (company_id)
where is_primary = true;

create index if not exists company_users_user_id_idx on public.company_users (user_id);
create index if not exists company_domains_company_id_idx on public.company_domains (company_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_company_member(input_company_id uuid, input_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.company_users cu
    join public.companies c on c.id = cu.company_id
    where cu.company_id = input_company_id
      and cu.user_id = input_user_id
      and cu.is_active = true
      and c.status = 'active'
  );
$$;

create or replace function public.has_company_role(input_company_id uuid, input_user_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.company_users cu
    join public.companies c on c.id = cu.company_id
    where cu.company_id = input_company_id
      and cu.user_id = input_user_id
      and cu.role = any(allowed_roles)
      and cu.is_active = true
      and c.status = 'active'
  );
$$;

revoke all on function public.is_company_member(uuid, uuid) from public;
revoke all on function public.has_company_role(uuid, uuid, text[]) from public;
grant execute on function public.is_company_member(uuid, uuid) to authenticated;
grant execute on function public.has_company_role(uuid, uuid, text[]) to authenticated;

create or replace function public.bootstrap_company_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.company_users (company_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (company_id, user_id) do nothing;

  insert into public.company_profiles (company_id, display_name)
  values (new.id, new.name)
  on conflict (company_id) do nothing;

  insert into public.company_theme_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  return new;
end;
$$;

create or replace function public.protect_last_company_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removes_owner boolean;
begin
  if tg_op = 'INSERT' then
    if new.role = 'owner'
      and exists (
        select 1 from public.company_users cu
        where cu.company_id = new.company_id
          and cu.role = 'owner'
          and cu.is_active = true
      )
      and auth.uid() is not null
      and not public.has_company_role(new.company_id, auth.uid(), array['owner']) then
      raise exception 'Only a company owner can add another owner.';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (old.role = 'owner' or new.role = 'owner')
      and (old.role <> new.role or old.is_active <> new.is_active)
      and auth.uid() is not null
      and not public.has_company_role(old.company_id, auth.uid(), array['owner']) then
      raise exception 'Only a company owner can change owner membership.';
    end if;
  end if;

  if old.role = 'owner' and old.is_active = true then
    if tg_op = 'DELETE' then
      removes_owner := true;
    else
      removes_owner := new.role <> 'owner'
        or new.is_active = false
        or new.company_id <> old.company_id
        or new.user_id <> old.user_id;
    end if;
  else
    removes_owner := false;
  end if;

  if removes_owner and not exists (
    select 1
    from public.company_users cu
    where cu.company_id = old.company_id
      and cu.user_id <> old.user_id
      and cu.role = 'owner'
      and cu.is_active = true
  ) then
    raise exception 'A company must keep at least one active owner.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.protect_company_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
    and auth.role() <> 'service_role'
    and (new.created_by <> old.created_by or new.status <> old.status) then
    raise exception 'Company creator and platform status are managed by the platform.';
  end if;

  return new;
end;
$$;

create or replace function public.protect_domain_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
    and auth.role() <> 'service_role'
    and (
      new.is_verified <> old.is_verified
      or new.verification_token <> old.verification_token
      or new.verified_at is distinct from old.verified_at
    ) then
    raise exception 'Domain verification is managed by the platform.';
  end if;

  return new;
end;
$$;

drop trigger if exists bootstrap_company_defaults on public.companies;
create trigger bootstrap_company_defaults
after insert on public.companies
for each row execute function public.bootstrap_company_defaults();

drop trigger if exists protect_last_company_owner on public.company_users;
create trigger protect_last_company_owner
before insert or update or delete on public.company_users
for each row execute function public.protect_last_company_owner();

drop trigger if exists protect_company_system_fields on public.companies;
create trigger protect_company_system_fields
before update on public.companies
for each row execute function public.protect_company_system_fields();

drop trigger if exists protect_domain_verification_fields on public.company_domains;
create trigger protect_domain_verification_fields
before update on public.company_domains
for each row execute function public.protect_domain_verification_fields();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['companies', 'company_users', 'company_profiles', 'company_theme_settings', 'company_domains']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.company_profiles enable row level security;
alter table public.company_theme_settings enable row level security;
alter table public.company_domains enable row level security;

drop policy if exists "members read companies" on public.companies;
create policy "members read companies" on public.companies
for select to authenticated using (public.is_company_member(id, auth.uid()));

drop policy if exists "authenticated create companies" on public.companies;
create policy "authenticated create companies" on public.companies
for insert to authenticated with check (created_by = auth.uid() and status = 'active');

drop policy if exists "company admins update companies" on public.companies;
create policy "company admins update companies" on public.companies
for update to authenticated using (public.has_company_role(id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(id, auth.uid(), array['owner', 'admin']));

drop policy if exists "members read company users" on public.company_users;
create policy "members read company users" on public.company_users
for select to authenticated using (public.is_company_member(company_id, auth.uid()));

drop policy if exists "company admins add users" on public.company_users;
create policy "company admins add users" on public.company_users
for insert to authenticated with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company admins update users" on public.company_users;
create policy "company admins update users" on public.company_users
for update to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company owners remove users" on public.company_users;
create policy "company owners remove users" on public.company_users
for delete to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner']));

drop policy if exists "public read published profiles" on public.company_profiles;
create policy "public read published profiles" on public.company_profiles
for select to anon, authenticated using (is_public);

drop policy if exists "members read company profiles" on public.company_profiles;
create policy "members read company profiles" on public.company_profiles
for select to authenticated using (public.is_company_member(company_id, auth.uid()));

drop policy if exists "company admins insert profiles" on public.company_profiles;
create policy "company admins insert profiles" on public.company_profiles
for insert to authenticated with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company admins update profiles" on public.company_profiles;
create policy "company admins update profiles" on public.company_profiles
for update to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "public read published company themes" on public.company_theme_settings;
create policy "public read published company themes" on public.company_theme_settings
for select to anon, authenticated using (
  exists (
    select 1
    from public.company_profiles cp
    where cp.company_id = company_theme_settings.company_id
      and cp.is_public = true
  )
);

drop policy if exists "members read company themes" on public.company_theme_settings;
create policy "members read company themes" on public.company_theme_settings
for select to authenticated using (public.is_company_member(company_id, auth.uid()));

drop policy if exists "company admins insert themes" on public.company_theme_settings;
create policy "company admins insert themes" on public.company_theme_settings
for insert to authenticated with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company admins update themes" on public.company_theme_settings;
create policy "company admins update themes" on public.company_theme_settings
for update to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "members read company domains" on public.company_domains;
create policy "members read company domains" on public.company_domains
for select to authenticated using (public.is_company_member(company_id, auth.uid()));

drop policy if exists "company admins insert domains" on public.company_domains;
create policy "company admins insert domains" on public.company_domains
for insert to authenticated with check (
  public.has_company_role(company_id, auth.uid(), array['owner', 'admin'])
  and is_verified = false
  and verified_at is null
);

drop policy if exists "company admins update domains" on public.company_domains;
create policy "company admins update domains" on public.company_domains
for update to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company owners delete domains" on public.company_domains;
create policy "company owners delete domains" on public.company_domains
for delete to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner']));
