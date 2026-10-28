-- BusinessSite is a separate product surface from the workshop workspace.
-- A workshop customer's existing company must not consume their first
-- BusinessSite slot during the manual pilot. Keep the normal entitlement
-- unchanged after creation and still allow only one BusinessSite per account.

do $rename_self_service_business_site$
begin
  if to_regprocedure('public.create_self_service_business_site_legacy(text,text,text,text,text,jsonb)') is null then
    alter function public.create_self_service_business_site(text, text, text, text, text, jsonb)
      rename to create_self_service_business_site_legacy;
  end if;
end;
$rename_self_service_business_site$;

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
  account_id uuid;
  original_company_limit integer;
  owned_company_count integer;
  created_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select id into account_id
  from public.billing_accounts
  where owner_user_id = auth.uid()
  for update;

  if account_id is null then
    return public.create_self_service_business_site_legacy(
      input_name, input_slug, input_industry_key, input_subcategory_key,
      input_website_locale, input_generation_payload
    );
  end if;

  if exists (
    select 1
    from public.company_billing_accounts company_account
    join public.companies company on company.id = company_account.company_id
    where company_account.billing_account_id = account_id
      and company.product_surface = 'business_site'
  ) then
    raise exception 'Your account already includes one BusinessSite. Activate the BusinessSite multi-business plan to add another.';
  end if;

  select company_limit into original_company_limit
  from public.billing_entitlements
  where billing_account_id = account_id
  for update;

  if original_company_limit is null then
    raise exception 'Billing entitlement is unavailable.';
  end if;

  select count(*)::integer into owned_company_count
  from public.company_billing_accounts
  where billing_account_id = account_id;

  update public.billing_entitlements
  set company_limit = greatest(company_limit, owned_company_count + 1)
  where billing_account_id = account_id;

  created_company_id := public.create_self_service_business_site_legacy(
    input_name, input_slug, input_industry_key, input_subcategory_key,
    input_website_locale, input_generation_payload
  );

  update public.billing_entitlements
  set company_limit = original_company_limit
  where billing_account_id = account_id;

  return created_company_id;
end;
$$;

revoke all on function public.create_self_service_business_site(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_self_service_business_site(text, text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
