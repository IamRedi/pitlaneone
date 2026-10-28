-- A BusinessSite is a separate product surface. Workshop companies must not
-- consume its slot, including for older accounts whose workshop count exceeds
-- the current generic company_limit.

create or replace function public.create_self_service_business_site(
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
  account public.billing_accounts;
  new_company_id uuid;
  owned_business_site_count integer;
  normalized_name text := btrim(coalesce(input_name, ''));
  normalized_slug text := lower(btrim(coalesce(input_slug, '')));
  normalized_industry text := btrim(coalesce(input_industry_key, ''));
  normalized_subcategory text := btrim(coalesce(input_subcategory_key, ''));
  profile_payload jsonb := coalesce(input_generation_payload -> 'profile', '{}'::jsonb);
  theme_payload jsonb := coalesce(input_generation_payload -> 'theme', '{}'::jsonb);
  features_payload jsonb := coalesce(input_generation_payload -> 'features', '{}'::jsonb);
  appointments_enabled boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if char_length(normalized_name) not between 2 and 80
    or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(normalized_slug) not between 3 and 63 then
    raise exception 'Enter valid business details.' using errcode = '22023';
  end if;

  if not (
    (normalized_industry = 'beauty_grooming' and normalized_subcategory in ('hair_salon', 'barber', 'nail_studio', 'lashes_brows', 'beauty_studio'))
    or (normalized_industry = 'wellness_therapy' and normalized_subcategory in ('massage', 'physiotherapy', 'osteopathy', 'nutrition', 'wellness_studio'))
    or (normalized_industry = 'professional_services' and normalized_subcategory in ('lawyer', 'accountant', 'insurance', 'consultant', 'architect'))
    or (normalized_industry = 'pet_services' and normalized_subcategory in ('pet_grooming', 'veterinary', 'dog_training', 'pet_wellness'))
    or (normalized_industry = 'cleaning_services' and normalized_subcategory in ('home_cleaning', 'office_cleaning', 'window_cleaning', 'facility_service'))
    or (normalized_industry = 'trade_services' and normalized_subcategory in ('locksmith', 'electrician', 'plumbing_heating', 'handyman'))
    or (normalized_industry = 'delivery_transport' and normalized_subcategory in ('local_delivery', 'courier', 'moving_transport'))
    or (normalized_industry = 'garden_landscape' and normalized_subcategory in ('garden_maintenance', 'landscaping', 'tree_service', 'irrigation'))
  ) then
    raise exception 'Unsupported BusinessSite category.' using errcode = '22023';
  end if;

  if input_website_locale not in ('sq', 'en', 'de', 'it', 'tr', 'pl')
    or jsonb_typeof(coalesce(input_generation_payload, 'null'::jsonb)) <> 'object'
    or octet_length(input_generation_payload::text) > 65536
    or jsonb_typeof(profile_payload) <> 'object'
    or jsonb_typeof(theme_payload) <> 'object'
    or jsonb_typeof(features_payload) <> 'object' then
    raise exception 'Invalid BusinessSite generation input.' using errcode = '22023';
  end if;

  appointments_enabled := case
    when jsonb_typeof(features_payload -> 'appointments') = 'boolean'
      then (features_payload ->> 'appointments')::boolean
    else false
  end;

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
    raise exception 'An active plan is required to create a BusinessSite.';
  end if;

  select count(*)::integer into owned_business_site_count
  from public.company_billing_accounts company_account
  join public.companies company on company.id = company_account.company_id
  where company_account.billing_account_id = account.id
    and company.product_surface = 'business_site';

  if owned_business_site_count >= 1 then
    raise exception 'Your account already includes one BusinessSite. Activate the BusinessSite multi-business plan to add another.';
  end if;

  insert into public.companies (
    name, slug, status, created_by, product_surface, industry_key,
    industry_subcategory_key, lifecycle_status, demo_expires_at,
    business_site_generation_source, business_site_generation_version,
    business_site_intake
  ) values (
    normalized_name, normalized_slug, 'active', auth.uid(), 'business_site',
    normalized_industry, normalized_subcategory,
    case when account.status = 'trialing' then 'demo_trial' else 'active' end,
    case when account.status = 'trialing' then account.trial_ends_at else null end,
    'manual_wizard', coalesce((input_generation_payload ->> 'version')::integer, 1),
    coalesce(input_generation_payload -> 'intake', '{}'::jsonb)
  ) returning id into new_company_id;

  insert into public.company_billing_accounts (company_id, billing_account_id)
  values (new_company_id, account.id);

  insert into public.company_seat_entitlements (company_id)
  values (new_company_id);

  insert into public.company_modules (company_id, module_key, enabled_by)
  values (new_company_id, 'website', 'manual_wizard');

  if appointments_enabled then
    insert into public.company_modules (company_id, module_key, enabled_by)
    values (new_company_id, 'appointments', 'manual_wizard');
  end if;

  update public.company_profiles set
    is_public = false,
    display_name = coalesce(nullif(profile_payload ->> 'displayName', ''), normalized_name),
    description = nullif(profile_payload ->> 'description', ''),
    phone = nullif(profile_payload ->> 'phone', ''),
    email = nullif(profile_payload ->> 'email', ''),
    address = nullif(profile_payload ->> 'address', ''),
    city = nullif(profile_payload ->> 'city', ''),
    country = nullif(profile_payload ->> 'country', ''),
    website_locale = input_website_locale,
    hero_eyebrow = nullif(profile_payload ->> 'heroEyebrow', ''),
    hero_title = nullif(profile_payload ->> 'heroTitle', ''),
    hero_subtitle = nullif(profile_payload ->> 'heroSubtitle', ''),
    about_title = nullif(profile_payload ->> 'aboutTitle', ''),
    about_body = nullif(profile_payload ->> 'aboutBody', ''),
    services_title = nullif(profile_payload ->> 'servicesTitle', ''),
    service_one_title = nullif(profile_payload ->> 'serviceOneTitle', ''),
    service_one_description = coalesce(profile_payload ->> 'serviceOneDescription', ''),
    service_two_title = nullif(profile_payload ->> 'serviceTwoTitle', ''),
    service_two_description = coalesce(profile_payload ->> 'serviceTwoDescription', ''),
    service_three_title = nullif(profile_payload ->> 'serviceThreeTitle', ''),
    service_three_description = coalesce(profile_payload ->> 'serviceThreeDescription', ''),
    gallery_title = nullif(profile_payload ->> 'galleryTitle', ''),
    gallery_subtitle = nullif(profile_payload ->> 'gallerySubtitle', ''),
    contact_title = nullif(profile_payload ->> 'contactTitle', ''),
    contact_body = nullif(profile_payload ->> 'contactBody', '')
  where company_id = new_company_id;

  update public.company_theme_settings set
    theme_preset = coalesce(nullif(theme_payload ->> 'themePreset', ''), 'clarity'),
    primary_color = coalesce(nullif(theme_payload ->> 'primaryColor', ''), primary_color),
    accent_color = coalesce(nullif(theme_payload ->> 'accentColor', ''), accent_color),
    background_color = coalesce(nullif(theme_payload ->> 'backgroundColor', ''), background_color),
    surface_color = coalesce(nullif(theme_payload ->> 'surfaceColor', ''), surface_color),
    text_color = coalesce(nullif(theme_payload ->> 'textColor', ''), text_color),
    button_radius = coalesce(nullif(theme_payload ->> 'buttonRadius', ''), button_radius),
    font_style = coalesce(nullif(theme_payload ->> 'fontStyle', ''), font_style),
    hero_image_url = coalesce(nullif(theme_payload ->> 'heroImageUrl', ''), hero_image_url)
  where company_id = new_company_id;

  return new_company_id;
end;
$$;

revoke all on function public.create_self_service_business_site(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_self_service_business_site(text, text, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
