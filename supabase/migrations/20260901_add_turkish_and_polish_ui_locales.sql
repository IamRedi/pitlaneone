alter table public.user_preferences
  drop constraint if exists user_preferences_ui_locale_check;

alter table public.user_preferences
  add constraint user_preferences_ui_locale_check
  check (ui_locale in ('sq', 'en', 'de', 'it', 'tr', 'pl'));
