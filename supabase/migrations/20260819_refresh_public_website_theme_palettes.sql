-- Refresh existing branded sites with the premium template palettes.
-- Preset ids stay stable so no existing company selection is lost.
update public.company_theme_settings
set
  primary_color = case theme_preset
    when 'steel-copper' then '#0A0A0B'
    when 'chrome' then '#27313A'
    when 'light-metal' then '#1D1D1F'
    else primary_color
  end,
  accent_color = case theme_preset
    when 'steel-copper' then '#F5F5F7'
    when 'chrome' then '#3A7CA5'
    when 'light-metal' then '#0071E3'
    else accent_color
  end,
  background_color = case theme_preset
    when 'steel-copper' then '#090A0C'
    when 'chrome' then '#E9EEF1'
    when 'light-metal' then '#F5F5F7'
    else background_color
  end,
  surface_color = case theme_preset
    when 'steel-copper' then '#18181B'
    when 'chrome' then '#FFFFFF'
    when 'light-metal' then '#FFFFFF'
    else surface_color
  end,
  text_color = case theme_preset
    when 'steel-copper' then '#F5F5F7'
    when 'chrome' then '#18212B'
    when 'light-metal' then '#1D1D1F'
    else text_color
  end
where theme_preset in ('steel-copper', 'chrome', 'light-metal');
