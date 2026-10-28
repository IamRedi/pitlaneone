-- A UI locale belongs to a person, never to a company or an invoice.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ui_locale text not null default 'sq' check (ui_locale in ('sq', 'en', 'de', 'it')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their own locale preference" on public.user_preferences;
create policy "Users can read their own locale preference"
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own locale preference" on public.user_preferences;
create policy "Users can create their own locale preference"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own locale preference" on public.user_preferences;
create policy "Users can update their own locale preference"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
