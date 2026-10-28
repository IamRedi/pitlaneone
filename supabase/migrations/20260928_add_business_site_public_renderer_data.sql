-- Public BusinessSite pages use the shared website and booking engine, but
-- receive their own product/industry context. Public booking RPCs also require
-- the appointments capability so a website-only customer cannot accept forms.

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
  has_appointments boolean
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
    c.product_surface, c.industry_key,
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

create or replace function public.create_public_appointment_request(
  input_company_id uuid, input_customer_name text, input_phone text,
  input_service_interest text, input_preferred_date date, input_preferred_time time,
  input_note text, input_vehicle_description text, input_vehicle_plate text
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare request_id uuid;
begin
  if not exists (
    select 1 from public.companies c
    join public.company_profiles p on p.company_id = c.id
    join public.company_modules cm on cm.company_id = c.id and cm.module_key = 'appointments'
    where c.id = input_company_id and c.status = 'active' and p.is_public = true
  ) then
    raise exception 'Company is not accepting public appointment requests' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(input_customer_name, ''))) not between 2 and 120
    or char_length(btrim(coalesce(input_phone, ''))) not between 5 and 40
    or char_length(btrim(coalesce(input_service_interest, ''))) not between 2 and 120 then
    raise exception 'Invalid appointment request' using errcode = '22023';
  end if;
  insert into public.company_appointment_requests (
    company_id, customer_name, phone, service_interest, preferred_date,
    preferred_time, note, vehicle_description, vehicle_plate
  ) values (
    input_company_id, btrim(input_customer_name), btrim(input_phone),
    btrim(input_service_interest), input_preferred_date, input_preferred_time,
    nullif(btrim(coalesce(input_note, '')), ''),
    nullif(btrim(coalesce(input_vehicle_description, '')), ''),
    nullif(btrim(coalesce(input_vehicle_plate, '')), '')
  ) returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.list_public_appointment_slots(
  input_company_id uuid, input_from date, input_to date
)
returns table (scheduled_date date, scheduled_time time, duration_minutes integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if input_from is null or input_to is null or input_to < input_from or input_to > input_from + 90 then
    raise exception 'Invalid appointment availability range' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.companies c
    join public.company_profiles p on p.company_id = c.id
    join public.company_modules cm on cm.company_id = c.id and cm.module_key = 'appointments'
    where c.id = input_company_id and c.status = 'active' and p.is_public = true
  ) then
    raise exception 'Company is not accepting public appointment requests' using errcode = '42501';
  end if;
  return query
  select r.scheduled_start::date, r.scheduled_start::time, r.duration_minutes
  from public.company_appointment_requests r
  where r.company_id = input_company_id
    and r.status in ('awaiting_customer', 'confirmed')
    and r.scheduled_start is not null
    and r.scheduled_start::date between input_from and input_to
  order by r.scheduled_start;
end;
$$;

drop function if exists public.get_public_appointment_business_hours(uuid);

create function public.get_public_appointment_business_hours(input_company_id uuid)
returns table (weekday integer, is_open boolean, opens_at time, closes_at time, slot_minutes integer)
language sql stable security definer set search_path = public, pg_temp
as $$
  select h.weekday, h.is_open, h.opens_at, h.closes_at, h.slot_minutes
  from public.company_appointment_business_hours h
  where h.company_id = input_company_id
    and exists (
      select 1 from public.companies c
      join public.company_profiles p on p.company_id = c.id
      join public.company_modules cm on cm.company_id = c.id and cm.module_key = 'appointments'
      where c.id = input_company_id and c.status = 'active' and p.is_public = true
    )
  order by h.weekday;
$$;

revoke all on function public.create_public_appointment_request(uuid, text, text, text, date, time, text, text, text) from public;
grant execute on function public.create_public_appointment_request(uuid, text, text, text, date, time, text, text, text) to anon, authenticated;
revoke all on function public.list_public_appointment_slots(uuid, date, date) from public;
grant execute on function public.list_public_appointment_slots(uuid, date, date) to anon, authenticated;
revoke all on function public.get_public_appointment_business_hours(uuid) from public;
grant execute on function public.get_public_appointment_business_hours(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
