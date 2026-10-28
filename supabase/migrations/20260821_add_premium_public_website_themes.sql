alter table public.company_theme_settings
  drop constraint if exists company_theme_settings_theme_preset_check;

alter table public.company_theme_settings
  add constraint company_theme_settings_theme_preset_check
  check (theme_preset in ('steel-copper', 'chrome', 'light-metal', 'crimson', 'custom'));
