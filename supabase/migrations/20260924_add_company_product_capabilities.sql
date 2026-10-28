-- BusinessSite is a product surface over the existing multi-tenant core.
-- Keep its capabilities server-managed: a browser must never be able to turn
-- on workshop, inventory or invoicing modules for its company.

alter table public.companies
  add column if not exists product_surface text not null default 'workshop'
    check (product_surface in ('workshop', 'business_site')),
  add column if not exists industry_key text not null default 'workshop'
    check (industry_key in ('workshop', 'hair_beauty', 'professional_services', 'construction', 'health_general', 'generic')),
  add column if not exists lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'demo_trial', 'conversion_pending', 'expired')),
  add column if not exists demo_expires_at timestamptz;

create index if not exists companies_lifecycle_status_idx
  on public.companies (lifecycle_status);

create table if not exists public.company_modules (
  company_id uuid not null references public.companies (id) on delete cascade,
  module_key text not null check (module_key in ('website', 'appointments', 'workshop_operations', 'inventory', 'invoicing')),
  enabled_at timestamptz not null default now(),
  enabled_by text not null default 'platform_seed' check (char_length(enabled_by) between 1 and 80),
  primary key (company_id, module_key)
);

create index if not exists company_modules_module_key_idx
  on public.company_modules (module_key);

-- Preserve every existing workshop entitlement before UI starts reading this
-- table. Re-running is harmless.
insert into public.company_modules (company_id, module_key)
select c.id, module.module_key
from public.companies c
cross join (
  values
    ('website'::text),
    ('appointments'::text),
    ('workshop_operations'::text),
    ('inventory'::text),
    ('invoicing'::text)
) as module(module_key)
on conflict (company_id, module_key) do nothing;

-- New self-service companies keep current workshop behaviour. BusinessSite
-- and demo companies are created later by a platform server workflow.
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

  insert into public.company_invoice_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  insert into public.company_appointment_business_hours (company_id, weekday, is_open)
  select new.id, day.weekday, day.weekday between 1 and 5
  from generate_series(0, 6) as day(weekday)
  on conflict (company_id, weekday) do nothing;

  insert into public.company_modules (company_id, module_key)
  select new.id, module.module_key
  from (
    values
      ('website'::text),
      ('appointments'::text),
      ('workshop_operations'::text),
      ('inventory'::text),
      ('invoicing'::text)
  ) as module(module_key)
  where new.product_surface = 'workshop'
  on conflict (company_id, module_key) do nothing;

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
    and (
      new.created_by <> old.created_by
      or new.status <> old.status
      or new.product_surface <> old.product_surface
      or new.industry_key <> old.industry_key
      or new.lifecycle_status <> old.lifecycle_status
      or new.demo_expires_at is distinct from old.demo_expires_at
    ) then
    raise exception 'Company platform fields are managed by the platform.' using errcode = '42501';
  end if;

  return new;
end;
$$;

alter table public.company_modules enable row level security;

drop policy if exists "members read company modules" on public.company_modules;
create policy "members read company modules" on public.company_modules
for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

revoke all on table public.company_modules from anon, authenticated;
grant select on table public.company_modules to authenticated;

create or replace function public.get_company_capabilities(input_company_id uuid)
returns table (module_key text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select cm.module_key
  from public.company_modules cm
  where cm.company_id = input_company_id
    and public.is_company_member(input_company_id, auth.uid())
  order by cm.module_key;
$$;

revoke all on function public.get_company_capabilities(uuid) from public;
grant execute on function public.get_company_capabilities(uuid) to authenticated;

notify pgrst, 'reload schema';
