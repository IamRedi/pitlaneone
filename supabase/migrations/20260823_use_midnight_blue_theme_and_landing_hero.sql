update public.company_theme_settings
set primary_color = '#0B132B', accent_color = '#8EA9F5', background_color = '#070C1B', surface_color = '#121E38', text_color = '#EEF3FF'
where theme_preset = 'crimson';

update public.company_theme_settings
set hero_image_url = '/images/saas-hero-automotive.png'
where hero_image_url like '%1487754180451-c456f719a1fc%';
