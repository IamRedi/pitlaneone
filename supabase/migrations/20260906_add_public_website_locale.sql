-- The public website language belongs to the company, not to the signed-in
-- staff member's UI preference. It controls only platform-owned website copy;
-- workshop-authored text remains exactly as entered by the workshop.
alter table public.company_profiles
  add column if not exists website_locale text not null default 'sq'
  check (website_locale in ('sq', 'en', 'de', 'it', 'tr', 'pl'));

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
  button_radius text, font_style text
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
    t.gallery_three_image_url, t.button_radius, t.font_style
  from public.companies c
  join public.company_profiles p on p.company_id = c.id
  join public.company_theme_settings t on t.company_id = c.id
  where c.slug = lower(trim(input_slug)) and c.status = 'active' and p.is_public = true;
$$;

revoke all on function public.get_public_company_by_slug(text) from public;
grant execute on function public.get_public_company_by_slug(text) to anon, authenticated;
