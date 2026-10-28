-- Canonical BusinessSite generation contract. Manual onboarding and automated
-- prospect generation persist the same versioned input snapshot, then produce
-- ordinary editable profile/theme rows consumed by the existing renderer.

alter table public.companies
  drop constraint if exists companies_industry_key_check;

alter table public.companies
  add constraint companies_industry_key_check check (industry_key in (
    'workshop', 'hair_beauty', 'professional_services', 'construction',
    'health_general', 'generic', 'beauty_grooming', 'wellness_therapy',
    'pet_services', 'cleaning_services', 'trade_services',
    'delivery_transport', 'garden_landscape'
  ));

alter table public.companies
  add column if not exists industry_subcategory_key text not null default 'generic'
    check (industry_subcategory_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  add column if not exists business_site_generation_source text
    check (business_site_generation_source in ('manual_wizard', 'automated_engine', 'platform_demo')),
  add column if not exists business_site_generation_version integer
    check (business_site_generation_version between 1 and 1000),
  add column if not exists business_site_intake jsonb not null default '{}'::jsonb
    check (jsonb_typeof(business_site_intake) = 'object');

create index if not exists companies_business_site_category_idx
  on public.companies (product_surface, industry_key, industry_subcategory_key)
  where product_surface = 'business_site';

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
      or new.industry_subcategory_key <> old.industry_subcategory_key
      or new.business_site_generation_source is distinct from old.business_site_generation_source
      or new.business_site_generation_version is distinct from old.business_site_generation_version
      or new.business_site_intake <> old.business_site_intake
      or new.lifecycle_status <> old.lifecycle_status
      or new.demo_expires_at is distinct from old.demo_expires_at
    ) then
    raise exception 'Company platform fields are managed by the platform.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop function if exists public.create_platform_business_site_demo(text, text, text, integer);

create function public.create_platform_business_site_demo(
  input_name text,
  input_slug text,
  input_industry_key text,
  input_subcategory_key text,
  input_website_locale text,
  input_generation_source text,
  input_generation_payload jsonb,
  input_trial_days integer
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
  normalized_industry text := btrim(coalesce(input_industry_key, ''));
  normalized_subcategory text := btrim(coalesce(input_subcategory_key, ''));
  profile_payload jsonb := coalesce(input_generation_payload -> 'profile', '{}'::jsonb);
  theme_payload jsonb := coalesce(input_generation_payload -> 'theme', '{}'::jsonb);
  features_payload jsonb := coalesce(input_generation_payload -> 'features', '{}'::jsonb);
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

  if normalized_industry not in (
    'beauty_grooming', 'wellness_therapy', 'professional_services',
    'pet_services', 'cleaning_services', 'trade_services',
    'delivery_transport', 'garden_landscape'
  ) or normalized_subcategory !~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' then
    raise exception 'Unsupported BusinessSite category.' using errcode = '22023';
  end if;

  if input_website_locale not in ('sq', 'en', 'de', 'it', 'tr', 'pl')
    or input_generation_source not in ('manual_wizard', 'automated_engine', 'platform_demo')
    or input_trial_days not between 1 and 31
    or jsonb_typeof(coalesce(input_generation_payload, 'null'::jsonb)) <> 'object' then
    raise exception 'Invalid BusinessSite generation input.' using errcode = '22023';
  end if;

  insert into public.companies (
    name, slug, status, created_by, product_surface, industry_key,
    industry_subcategory_key, lifecycle_status, demo_expires_at,
    business_site_generation_source, business_site_generation_version,
    business_site_intake
  ) values (
    normalized_name, normalized_slug, 'active', auth.uid(), 'business_site',
    normalized_industry, normalized_subcategory, 'demo_trial',
    now() + make_interval(days => input_trial_days), input_generation_source,
    coalesce((input_generation_payload ->> 'version')::integer, 1),
    coalesce(input_generation_payload -> 'intake', '{}'::jsonb)
  ) returning id into new_company_id;

  insert into public.company_modules (company_id, module_key, enabled_by)
  values (new_company_id, 'website', input_generation_source);

  if coalesce((features_payload ->> 'appointments')::boolean, false) then
    insert into public.company_modules (company_id, module_key, enabled_by)
    values (new_company_id, 'appointments', input_generation_source);
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
    service_one_description = nullif(profile_payload ->> 'serviceOneDescription', ''),
    service_two_title = nullif(profile_payload ->> 'serviceTwoTitle', ''),
    service_two_description = nullif(profile_payload ->> 'serviceTwoDescription', ''),
    service_three_title = nullif(profile_payload ->> 'serviceThreeTitle', ''),
    service_three_description = nullif(profile_payload ->> 'serviceThreeDescription', ''),
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

revoke all on function public.create_platform_business_site_demo(text, text, text, text, text, text, jsonb, integer) from public;
grant execute on function public.create_platform_business_site_demo(text, text, text, text, text, text, jsonb, integer) to authenticated;

-- The renderer receives the subcategory so it can select the matching visual
-- system even after a customer replaces the starter photo or colours.
drop function if exists public.get_public_company_by_slug(text);

create function public.get_public_company_by_slug(input_slug text)
returns table (
  company_id uuid, slug text, display_name text, description text, phone text,
  whatsapp text, email text, address text, city text, country text,
  website_locale text, hero_eyebrow text, hero_title text, hero_subtitle text,
  about_title text, about_body text, services_title text, service_one_title text,
  service_one_description text, service_two_title text, service_two_description text,
  service_three_title text, service_three_description text, gallery_title text,
  gallery_subtitle text, contact_title text, contact_body text, theme_preset text,
  primary_color text, accent_color text, background_color text, surface_color text,
  text_color text, logo_url text, hero_image_url text, hero_mobile_image_url text,
  service_one_image_url text, service_two_image_url text, service_three_image_url text,
  gallery_one_image_url text, gallery_two_image_url text, gallery_three_image_url text,
  button_radius text, font_style text, product_surface text, industry_key text,
  industry_subcategory_key text, has_appointments boolean
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select c.id, c.slug, p.display_name, p.description, p.phone, p.whatsapp,
    p.email, p.address, p.city, p.country, p.website_locale, p.hero_eyebrow,
    p.hero_title, p.hero_subtitle, p.about_title, p.about_body, p.services_title,
    p.service_one_title, p.service_one_description, p.service_two_title,
    p.service_two_description, p.service_three_title, p.service_three_description,
    p.gallery_title, p.gallery_subtitle, p.contact_title, p.contact_body,
    t.theme_preset, t.primary_color, t.accent_color, t.background_color,
    t.surface_color, t.text_color, t.logo_url, t.hero_image_url,
    t.hero_mobile_image_url, t.service_one_image_url, t.service_two_image_url,
    t.service_three_image_url, t.gallery_one_image_url, t.gallery_two_image_url,
    t.gallery_three_image_url, t.button_radius, t.font_style,
    c.product_surface, c.industry_key, c.industry_subcategory_key,
    exists (
      select 1 from public.company_modules cm
      where cm.company_id = c.id and cm.module_key = 'appointments'
    )
  from public.companies c
  join public.company_profiles p on p.company_id = c.id
  join public.company_theme_settings t on t.company_id = c.id
  where c.slug = lower(trim(input_slug)) and c.status = 'active' and p.is_public = true;
$$;

revoke all on function public.get_public_company_by_slug(text) from public;
grant execute on function public.get_public_company_by_slug(text) to anon, authenticated;

notify pgrst, 'reload schema';
