-- BusinessSite owns visual template families that are intentionally separate
-- from the automotive PitlaneOne presets. Legacy workshop presets remain valid.

alter table public.company_theme_settings
  drop constraint if exists company_theme_settings_theme_preset_check;

alter table public.company_theme_settings
  add constraint company_theme_settings_theme_preset_check
  check (theme_preset in (
    'steel-copper', 'chrome', 'light-metal', 'crimson',
    'atelier', 'velocity',
    'studio', 'clarity', 'forge',
    'custom'
  ));

notify pgrst, 'reload schema';
