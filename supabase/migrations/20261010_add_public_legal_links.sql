-- Business owners remain responsible for their own legal notices. The platform
-- stores only optional HTTPS links and never manufactures legal content.

alter table public.company_profiles
  add column if not exists legal_notice_url text,
  add column if not exists privacy_policy_url text;

alter table public.company_profiles
  drop constraint if exists company_profiles_legal_notice_url_check,
  add constraint company_profiles_legal_notice_url_check
    check (legal_notice_url is null or legal_notice_url ~ '^https://[^[:space:]]+$');

alter table public.company_profiles
  drop constraint if exists company_profiles_privacy_policy_url_check,
  add constraint company_profiles_privacy_policy_url_check
    check (privacy_policy_url is null or privacy_policy_url ~ '^https://[^[:space:]]+$');

drop function if exists public.get_public_company_by_slug(text);

create function public.get_public_company_by_slug(input_slug text)
returns table (
  company_id uuid, slug text, display_name text, description text, phone text,
  whatsapp text, email text, address text, city text, country text,
  website_locale text, hero_eyebrow text, hero_title text, hero_subtitle text,
  about_title text, about_body text, services_title text, service_one_title text,
  service_one_description text, service_two_title text, service_two_description text,
  service_three_title text, service_three_description text, gallery_title text,
  gallery_subtitle text, contact_title text, contact_body text, legal_notice_url text,
  privacy_policy_url text, theme_preset text, primary_color text, accent_color text,
  background_color text, surface_color text, text_color text, logo_url text,
  hero_image_url text, hero_mobile_image_url text, service_one_image_url text,
  service_two_image_url text, service_three_image_url text, gallery_one_image_url text,
  gallery_two_image_url text, gallery_three_image_url text, button_radius text,
  font_style text, product_surface text, industry_key text,
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
    p.legal_notice_url, p.privacy_policy_url, t.theme_preset, t.primary_color,
    t.accent_color, t.background_color, t.surface_color, t.text_color, t.logo_url,
    t.hero_image_url, t.hero_mobile_image_url, t.service_one_image_url,
    t.service_two_image_url, t.service_three_image_url, t.gallery_one_image_url,
    t.gallery_two_image_url, t.gallery_three_image_url, t.button_radius, t.font_style,
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
