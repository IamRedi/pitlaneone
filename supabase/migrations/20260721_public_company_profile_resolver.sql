create or replace function public.get_public_company_by_slug(input_slug text)
returns table (
  company_id uuid,
  slug text,
  display_name text,
  description text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  country text,
  primary_color text,
  accent_color text,
  background_color text,
  surface_color text,
  text_color text,
  logo_url text,
  hero_image_url text,
  button_radius text,
  font_style text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.slug,
    cp.display_name,
    cp.description,
    cp.phone,
    cp.whatsapp,
    cp.email,
    cp.address,
    cp.city,
    cp.country,
    cts.primary_color,
    cts.accent_color,
    cts.background_color,
    cts.surface_color,
    cts.text_color,
    cts.logo_url,
    cts.hero_image_url,
    cts.button_radius,
    cts.font_style
  from public.companies c
  join public.company_profiles cp on cp.company_id = c.id
  join public.company_theme_settings cts on cts.company_id = c.id
  where c.slug = lower(trim(input_slug))
    and c.status = 'active'
    and cp.is_public = true
  limit 1;
$$;

revoke all on function public.get_public_company_by_slug(text) from public;
grant execute on function public.get_public_company_by_slug(text) to anon, authenticated;
