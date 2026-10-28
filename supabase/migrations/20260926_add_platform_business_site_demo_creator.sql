-- Controlled internal creator for private BusinessSite demos. It is deliberately
-- limited to super-admins; prospect automation is added only after this path
-- has browser and RLS evidence.

create or replace function public.create_platform_business_site_demo(
  input_name text,
  input_slug text,
  input_industry_key text default 'generic',
  input_trial_days integer default 15
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_company_id uuid;
  normalized_name text := btrim(coalesce(input_name, ''));
  normalized_slug text := lower(btrim(coalesce(input_slug, '')));
  normalized_industry text := btrim(coalesce(input_industry_key, 'generic'));
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    raise exception 'Only a platform super administrator can create a BusinessSite demo.' using errcode = '42501';
  end if;

  if char_length(normalized_name) not between 2 and 80 then
    raise exception 'Enter a valid business name.' using errcode = '22023';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(normalized_slug) not between 3 and 63 then
    raise exception 'Enter a valid business identifier.' using errcode = '22023';
  end if;

  if normalized_industry not in ('hair_beauty', 'professional_services', 'construction', 'health_general', 'generic') then
    raise exception 'Unsupported BusinessSite industry.' using errcode = '22023';
  end if;

  if input_trial_days not between 1 and 31 then
    raise exception 'Demo duration must be between 1 and 31 days.' using errcode = '22023';
  end if;

  insert into public.companies (
    name, slug, status, created_by, product_surface, industry_key,
    lifecycle_status, demo_expires_at
  ) values (
    normalized_name, normalized_slug, 'active', auth.uid(), 'business_site',
    normalized_industry, 'demo_trial', now() + make_interval(days => input_trial_days)
  ) returning id into new_company_id;

  insert into public.company_modules (company_id, module_key, enabled_by)
  values
    (new_company_id, 'website', 'platform_demo_creator'),
    (new_company_id, 'appointments', 'platform_demo_creator');

  -- The default profile stays private, so /b/[slug] cannot expose it until an
  -- owner explicitly publishes the demo.
  update public.company_profiles set is_public = false where company_id = new_company_id;

  return new_company_id;
end;
$$;

revoke all on function public.create_platform_business_site_demo(text, text, text, integer) from public;
grant execute on function public.create_platform_business_site_demo(text, text, text, integer) to authenticated;

notify pgrst, 'reload schema';
