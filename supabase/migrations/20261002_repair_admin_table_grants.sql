-- RLS policies alone do not grant PostgREST access. Keep authenticated admin
-- management policy-controlled, while allowing trusted server-side bootstrap
-- and maintenance through the service role.
grant select, insert, update on table public.admins to authenticated;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
grant all privileges on tables to service_role;

alter default privileges in schema public
grant all privileges on sequences to service_role;

revoke all on table public.admins from anon;

-- BusinessSite presets use the simplified public typography tokens while
-- existing workshop themes keep their legacy tokens.
alter table public.company_theme_settings
drop constraint if exists company_theme_settings_font_style_check;

alter table public.company_theme_settings
add constraint company_theme_settings_font_style_check
check (font_style in ('system', 'technical', 'editorial', 'modern', 'serif'));
