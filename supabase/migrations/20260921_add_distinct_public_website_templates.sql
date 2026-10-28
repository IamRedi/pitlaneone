-- Add two structurally distinct public website templates. Existing companies
-- keep their selected preset unchanged.

alter table public.company_theme_settings
  drop constraint if exists company_theme_settings_theme_preset_check;

alter table public.company_theme_settings
  add constraint company_theme_settings_theme_preset_check
  check (theme_preset in (
    'steel-copper', 'chrome', 'light-metal', 'crimson',
    'atelier', 'velocity',
    -- Preserve BusinessSite presets that may already exist in production.
    'studio', 'clarity', 'forge', 'custom'
  ));

notify pgrst, 'reload schema';
