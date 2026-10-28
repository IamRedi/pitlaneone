-- Apply the lighter Arctic Grid palette for installations where 20260819
-- was already run before the final visual refinement.
update public.company_theme_settings
set
  primary_color = '#27313A',
  accent_color = '#3A7CA5',
  background_color = '#E9EEF1',
  surface_color = '#FFFFFF',
  text_color = '#18212B'
where theme_preset = 'chrome';
