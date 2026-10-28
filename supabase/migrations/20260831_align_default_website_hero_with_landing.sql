-- The first public website should open with the same dark premium palette as
-- the SaaS landing page. Companies can still select another preset or customize
-- every color later in the website editor.
alter table public.company_theme_settings
  alter column primary_color set default '#090C11',
  alter column accent_color set default '#C96F3B',
  alter column background_color set default '#090C11',
  alter column surface_color set default '#141B22',
  alter column text_color set default '#F8FAFC';

update public.company_theme_settings
set
  primary_color = '#090C11',
  accent_color = '#C96F3B',
  background_color = '#090C11',
  surface_color = '#141B22',
  text_color = '#F8FAFC'
where theme_preset = 'steel-copper';
