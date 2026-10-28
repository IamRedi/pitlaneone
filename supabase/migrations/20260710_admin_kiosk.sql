create table if not exists public.client_intake_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid not null references public.admins (id) on delete cascade,
  created_by uuid references public.admins (id) on delete set null,
  note text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_intake_notes
add column if not exists owner_id uuid references public.admins (id) on delete cascade;

alter table public.client_intake_notes
add column if not exists created_by uuid references public.admins (id) on delete set null;

alter table public.client_intake_notes
add column if not exists status text not null default 'open';

alter table public.client_intake_notes
add column if not exists updated_at timestamptz not null default now();

create index if not exists client_intake_notes_client_id_idx on public.client_intake_notes (client_id);
create index if not exists client_intake_notes_owner_id_idx on public.client_intake_notes (owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_intake_notes_updated_at on public.client_intake_notes;
create trigger set_client_intake_notes_updated_at
before update on public.client_intake_notes
for each row execute function public.set_updated_at();

alter table public.client_intake_notes enable row level security;

create or replace function public.is_super_admin(input_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = input_user_id
      and a.role = 'super_admin'
      and a.is_active = true
  );
$$;

grant execute on function public.is_super_admin(uuid) to authenticated;

drop policy if exists "super admins read admins" on public.admins;
create policy "super admins read admins"
on public.admins
for select
using (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
);

drop policy if exists "super admins insert admins" on public.admins;
create policy "super admins insert admins"
on public.admins
for insert
with check (public.is_super_admin(auth.uid()));

drop policy if exists "super admins update admins" on public.admins;
create policy "super admins update admins"
on public.admins
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists "intake notes visible to owner" on public.client_intake_notes;
create policy "intake notes visible to owner"
on public.client_intake_notes
for select
using (owner_id = auth.uid());

drop policy if exists "intake notes writable by owner" on public.client_intake_notes;
create policy "intake notes writable by owner"
on public.client_intake_notes
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Public export: personal legacy administrator bootstrap removed.
-- Provision evaluation administrators explicitly in your isolated database.
