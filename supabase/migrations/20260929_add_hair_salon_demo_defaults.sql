-- Hair & beauty demos should look usable before a prospect changes any copy.
-- These defaults are limited to BusinessSite demo tenants; they do not alter
-- live PitlaneOne workshop branding or customer-selected themes.

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

  update public.company_profiles
  set
    is_public = false,
    website_locale = case when normalized_industry = 'hair_beauty' then 'de' else website_locale end,
    description = case when normalized_industry = 'hair_beauty' then 'Individuelle Haarschnitte, Farbe und Styling in entspannter Atmosphäre.' else description end,
    hero_eyebrow = case when normalized_industry = 'hair_beauty' then 'Hair & Beauty Studio' else hero_eyebrow end,
    hero_title = case when normalized_industry = 'hair_beauty' then 'Haare, die sich nach Ihnen anfühlen.' else hero_title end,
    hero_subtitle = case when normalized_industry = 'hair_beauty' then 'Individuelle Beratung, sorgfältige Technik und ein Look, der zu Ihnen passt.' else hero_subtitle end,
    about_title = case when normalized_industry = 'hair_beauty' then 'Schönheit mit Blick fürs Detail.' else about_title end,
    about_body = case when normalized_industry = 'hair_beauty' then 'Wir nehmen uns Zeit für ehrliche Beratung, sorgfältige Arbeit und einen entspannten Besuch im Studio.' else about_body end,
    services_title = case when normalized_industry = 'hair_beauty' then 'Für Ihren persönlichen Look' else services_title end,
    service_one_title = case when normalized_industry = 'hair_beauty' then 'Schnitt & Styling' else service_one_title end,
    service_one_description = case when normalized_industry = 'hair_beauty' then 'Ein Schnitt, der im Alltag funktioniert und zu Ihnen passt.' else service_one_description end,
    service_two_title = case when normalized_industry = 'hair_beauty' then 'Farbe & Highlights' else service_two_title end,
    service_two_description = case when normalized_industry = 'hair_beauty' then 'Dimension, Glanz und eine Farbe mit natürlichem Ausdruck.' else service_two_description end,
    service_three_title = case when normalized_industry = 'hair_beauty' then 'Pflege & Finish' else service_three_title end,
    service_three_description = case when normalized_industry = 'hair_beauty' then 'Pflege, die Ihr Haar stärkt, und ein Finish mit Haltung.' else service_three_description end,
    contact_title = case when normalized_industry = 'hair_beauty' then 'Ihren Termin anfragen' else contact_title end,
    contact_body = case when normalized_industry = 'hair_beauty' then 'Senden Sie uns Ihren Wunschtermin. Wir bestätigen den passenden Zeitpunkt persönlich.' else contact_body end
  where company_id = new_company_id;

  if normalized_industry = 'hair_beauty' then
    update public.company_theme_settings
    set
      theme_preset = 'studio',
      primary_color = '#31231F',
      accent_color = '#C66A43',
      background_color = '#FBF7F2',
      surface_color = '#FFFDFC',
      text_color = '#201916'
    where company_id = new_company_id;
  end if;

  return new_company_id;
end;
$$;

-- Bring only existing, not-yet-published hair demos onto the new ready-to-use
-- starter. Live sites keep their selected branding unchanged.
update public.company_theme_settings theme
set
  theme_preset = 'studio',
  primary_color = '#31231F',
  accent_color = '#C66A43',
  background_color = '#FBF7F2',
  surface_color = '#FFFDFC',
  text_color = '#201916'
from public.companies company
join public.company_profiles profile on profile.company_id = company.id
where theme.company_id = company.id
  and company.product_surface = 'business_site'
  and company.industry_key = 'hair_beauty'
  and company.lifecycle_status = 'demo_trial'
  and profile.is_public = false
  and theme.theme_preset not in ('studio', 'clarity', 'forge');

notify pgrst, 'reload schema';
