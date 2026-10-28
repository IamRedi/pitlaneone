-- Keep the database creation guard in sync with the public BusinessSite
-- category catalogue. The previous guard predates construction and vehicle
-- sales. Reuse it for all established categories, and safely map the new
-- categories during creation before restoring their real catalogue keys.

alter function public.create_self_service_business_site(text, text, text, text, text, jsonb)
  rename to create_self_service_business_site_catalog_guard;

create function public.create_self_service_business_site(
  input_name text,
  input_slug text,
  input_industry_key text,
  input_subcategory_key text,
  input_website_locale text,
  input_generation_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  created_company_id uuid;
  uses_new_catalog_category boolean :=
    (input_industry_key = 'construction' and input_subcategory_key in ('crane_service', 'deep_construction', 'house_construction', 'glass_facade', 'fiber_network'))
    or (input_industry_key = 'vehicle_sales' and input_subcategory_key in ('auto_dealer', 'vehicle_import', 'leasing_finance'));
begin
  if uses_new_catalog_category then
    -- The guarded function already owns authentication, entitlement, trial,
    -- payload and one-BusinessSite-per-account enforcement. A known-safe
    -- legacy key is used only for its validation path; the real category is
    -- restored atomically before the caller receives the tenant ID.
    created_company_id := public.create_self_service_business_site_catalog_guard(
      input_name,
      input_slug,
      'beauty_grooming',
      'hair_salon',
      input_website_locale,
      input_generation_payload
    );

    update public.companies
    set industry_key = input_industry_key,
        industry_subcategory_key = input_subcategory_key
    where id = created_company_id;

    return created_company_id;
  end if;

  return public.create_self_service_business_site_catalog_guard(
    input_name,
    input_slug,
    input_industry_key,
    input_subcategory_key,
    input_website_locale,
    input_generation_payload
  );
end;
$$;

revoke all on function public.create_self_service_business_site(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_self_service_business_site(text, text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
