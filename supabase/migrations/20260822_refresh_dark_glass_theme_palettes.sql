update public.company_theme_settings
set primary_color = case theme_preset when 'chrome' then '#10170F' when 'light-metal' then '#0C1721' when 'crimson' then '#1E1014' else primary_color end,
    accent_color = case theme_preset when 'chrome' then '#B9CF84' when 'light-metal' then '#8CC8EE' when 'crimson' then '#E78A8A' else accent_color end,
    background_color = case theme_preset when 'chrome' then '#0C120C' when 'light-metal' then '#091119' when 'crimson' then '#130A0D' else background_color end,
    surface_color = case theme_preset when 'chrome' then '#182117' when 'light-metal' then '#132432' when 'crimson' then '#281419' else surface_color end,
    text_color = case theme_preset when 'chrome' then '#F1F6EA' when 'light-metal' then '#EDF7FE' when 'crimson' then '#FFF1F1' else text_color end
where theme_preset in ('chrome', 'light-metal', 'crimson');
