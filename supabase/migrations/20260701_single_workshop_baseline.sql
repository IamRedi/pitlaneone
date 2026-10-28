create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_type') then
    create type service_type as enum ('normal', 'periodic');
  end if;

  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'issued', 'partial', 'paid');
  end if;
end $$;

alter type invoice_status add value if not exists 'partial';

create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins
add column if not exists role text not null default 'admin';

alter table public.admins
add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admins_role_check'
      and conrelid = 'public.admins'::regclass
  ) then
    alter table public.admins
    add constraint admins_role_check check (role in ('super_admin', 'admin'));
  end if;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.admins (id) on delete cascade,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text not null unique,
  pin_hash text not null default '',
  is_vip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid not null references public.admins (id) on delete cascade,
  model text not null,
  plate_number text not null,
  vin text,
  current_km integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, plate_number)
);

alter table public.vehicles
add column if not exists updated_at timestamptz not null default now();

alter table public.vehicles
add column if not exists owner_id uuid references public.admins (id) on delete cascade;

update public.vehicles v
set owner_id = c.owner_id
from public.clients c
where c.id = v.client_id
  and v.owner_id is null;

alter table public.vehicles
alter column owner_id set not null;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  owner_id uuid not null references public.admins (id) on delete cascade,
  type service_type not null default 'normal',
  date date not null,
  km integer not null,
  notes text,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services
add column if not exists updated_at timestamptz not null default now();

alter table public.services
add column if not exists owner_id uuid references public.admins (id) on delete cascade;

update public.services s
set owner_id = v.owner_id
from public.vehicles v
where v.id = s.vehicle_id
  and s.owner_id is null;

alter table public.services
alter column owner_id set not null;

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  owner_id uuid not null references public.admins (id) on delete cascade,
  name text not null,
  material_cost numeric(12,2) not null default 0,
  fee numeric(12,2) not null default 0,
  labor_cost numeric(12,2) not null default 0,
  labor_discount_percent numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.service_items
add column if not exists labor_discount_percent numeric(5,2) not null default 0;

alter table public.service_items
add column if not exists updated_at timestamptz not null default now();

alter table public.service_items
add column if not exists owner_id uuid references public.admins (id) on delete cascade;

update public.service_items si
set owner_id = s.owner_id
from public.services s
where s.id = si.service_id
  and si.owner_id is null;

alter table public.service_items
alter column owner_id set not null;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  owner_id uuid not null references public.admins (id) on delete cascade,
  type text not null,
  next_km integer,
  next_date date,
  notified boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.reminders
add column if not exists updated_at timestamptz not null default now();

alter table public.reminders
add column if not exists owner_id uuid references public.admins (id) on delete cascade;

update public.reminders r
set owner_id = v.owner_id
from public.vehicles v
where v.id = r.vehicle_id
  and r.owner_id is null;

alter table public.reminders
alter column owner_id set not null;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  owner_id uuid not null references public.admins (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  issued_at date not null default current_date,
  due_date date,
  status invoice_status not null default 'draft',
  amount_paid numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.invoices
add column if not exists amount_paid numeric(12,2) not null default 0;

alter table public.invoices
add column if not exists updated_at timestamptz not null default now();

alter table public.invoices
add column if not exists owner_id uuid references public.admins (id) on delete cascade;

update public.invoices i
set owner_id = c.owner_id
from public.clients c
where c.id = i.client_id
  and i.owner_id is null;

alter table public.invoices
alter column owner_id set not null;

create index if not exists vehicles_owner_id_idx on public.vehicles (owner_id);
create index if not exists services_owner_id_idx on public.services (owner_id);
create index if not exists service_items_owner_id_idx on public.service_items (owner_id);
create index if not exists reminders_owner_id_idx on public.reminders (owner_id);
create index if not exists invoices_owner_id_idx on public.invoices (owner_id);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.admins (id) on delete cascade,
  image_url text not null,
  title text,
  created_at timestamptz not null default now()
);

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

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admins_updated_at on public.admins;
create trigger set_admins_updated_at
before update on public.admins
for each row execute function public.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_service_items_updated_at on public.service_items;
create trigger set_service_items_updated_at
before update on public.service_items
for each row execute function public.set_updated_at();

drop trigger if exists set_reminders_updated_at on public.reminders;
create trigger set_reminders_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_client_intake_notes_updated_at on public.client_intake_notes;
create trigger set_client_intake_notes_updated_at
before update on public.client_intake_notes
for each row execute function public.set_updated_at();

create or replace function public.set_client_pin_hash(input_phone text, input_pin text, input_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients
  set pin_hash = extensions.crypt(input_pin, extensions.gen_salt('bf'))
  where phone = input_phone
    and owner_id = input_owner_id;
end;
$$;

create or replace function public.verify_client_pin(input_phone text, input_pin text)
returns table (client_id uuid, owner_id uuid, auth_user_id uuid)
language sql
security definer
set search_path = public
as $$
  select c.id, c.owner_id, c.auth_user_id
  from public.clients c
  where c.phone = input_phone
    and c.pin_hash = extensions.crypt(input_pin, c.pin_hash)
    and c.auth_user_id is not null;
$$;

grant execute on function public.verify_client_pin(text, text) to anon, authenticated;
grant execute on function public.set_client_pin_hash(text, text, uuid) to authenticated;

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

alter table public.clients enable row level security;
alter table public.admins enable row level security;
alter table public.vehicles enable row level security;
alter table public.services enable row level security;
alter table public.service_items enable row level security;
alter table public.reminders enable row level security;
alter table public.invoices enable row level security;
alter table public.gallery_images enable row level security;
alter table public.client_intake_notes enable row level security;

drop policy if exists "admins read own profile" on public.admins;
drop policy if exists "admins update own profile" on public.admins;
drop policy if exists "super admins read admins" on public.admins;
drop policy if exists "super admins insert admins" on public.admins;
drop policy if exists "super admins update admins" on public.admins;
drop policy if exists "admins read own clients" on public.clients;
drop policy if exists "admins insert own clients" on public.clients;
drop policy if exists "admins update own clients" on public.clients;
drop policy if exists "clients read self" on public.clients;
drop policy if exists "vehicles visible to owner and client" on public.vehicles;
drop policy if exists "vehicles writable by owner" on public.vehicles;
drop policy if exists "services visible to owner and client" on public.services;
drop policy if exists "services writable by owner" on public.services;
drop policy if exists "service items visible to owner and client" on public.service_items;
drop policy if exists "service items writable by owner" on public.service_items;
drop policy if exists "reminders visible to owner and client" on public.reminders;
drop policy if exists "reminders writable by owner" on public.reminders;
drop policy if exists "invoices visible to owner and client" on public.invoices;
drop policy if exists "invoices writable by owner" on public.invoices;
drop policy if exists "gallery images public read" on public.gallery_images;
drop policy if exists "gallery images admin insert" on public.gallery_images;
drop policy if exists "gallery images owner update" on public.gallery_images;
drop policy if exists "gallery images owner delete" on public.gallery_images;
drop policy if exists "intake notes visible to owner" on public.client_intake_notes;
drop policy if exists "intake notes writable by owner" on public.client_intake_notes;
drop policy if exists "gallery storage public read" on storage.objects;
drop policy if exists "gallery storage authenticated upload" on storage.objects;
drop policy if exists "gallery storage owner update" on storage.objects;
drop policy if exists "gallery storage owner delete" on storage.objects;

create policy "admins read own profile"
on public.admins
for select
using (id = auth.uid());

create policy "super admins read admins"
on public.admins
for select
using (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
);

create policy "super admins insert admins"
on public.admins
for insert
with check (public.is_super_admin(auth.uid()));

create policy "super admins update admins"
on public.admins
for update
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

create policy "admins read own clients"
on public.clients
for select
using (owner_id = auth.uid());

create policy "admins insert own clients"
on public.clients
for insert
with check (owner_id = auth.uid());

create policy "admins update own clients"
on public.clients
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "clients read self"
on public.clients
for select
using (auth_user_id = auth.uid());

create policy "vehicles visible to owner and client"
on public.vehicles
for select
using (
  exists (
    select 1
    from public.clients c
    where c.id = vehicles.client_id
      and (c.owner_id = auth.uid() or c.auth_user_id = auth.uid())
  )
);

create policy "vehicles writable by owner"
on public.vehicles
for all
using (
  exists (
    select 1 from public.clients c where c.id = vehicles.client_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clients c where c.id = vehicles.client_id and c.owner_id = auth.uid()
  )
);

create policy "services visible to owner and client"
on public.services
for select
using (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id
    where v.id = services.vehicle_id
      and (c.owner_id = auth.uid() or c.auth_user_id = auth.uid())
  )
);

create policy "services writable by owner"
on public.services
for all
using (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id
    where v.id = services.vehicle_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id
    where v.id = services.vehicle_id
      and c.owner_id = auth.uid()
  )
);

create policy "service items visible to owner and client"
on public.service_items
for select
using (
  exists (
    select 1
    from public.services s
    join public.vehicles v on v.id = s.vehicle_id
    join public.clients c on c.id = v.client_id
    where s.id = service_items.service_id
      and (c.owner_id = auth.uid() or c.auth_user_id = auth.uid())
  )
);

create policy "service items writable by owner"
on public.service_items
for all
using (
  exists (
    select 1
    from public.services s
    join public.vehicles v on v.id = s.vehicle_id
    join public.clients c on c.id = v.client_id
    where s.id = service_items.service_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.services s
    join public.vehicles v on v.id = s.vehicle_id
    join public.clients c on c.id = v.client_id
    where s.id = service_items.service_id
      and c.owner_id = auth.uid()
  )
);

create policy "reminders visible to owner and client"
on public.reminders
for select
using (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id
    where v.id = reminders.vehicle_id
      and (c.owner_id = auth.uid() or c.auth_user_id = auth.uid())
  )
);

create policy "reminders writable by owner"
on public.reminders
for all
using (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id
    where v.id = reminders.vehicle_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id
    where v.id = reminders.vehicle_id
      and c.owner_id = auth.uid()
  )
);

create policy "invoices visible to owner and client"
on public.invoices
for select
using (
  exists (
    select 1
    from public.clients c
    where c.id = invoices.client_id
      and (c.owner_id = auth.uid() or c.auth_user_id = auth.uid())
  )
);

create policy "invoices writable by owner"
on public.invoices
for all
using (
  exists (
    select 1 from public.clients c where c.id = invoices.client_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clients c where c.id = invoices.client_id and c.owner_id = auth.uid()
  )
);

create policy "gallery images public read"
on public.gallery_images
for select
using (true);

create policy "gallery images admin insert"
on public.gallery_images
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.is_active = true
  )
);

create policy "gallery images owner update"
on public.gallery_images
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "gallery images owner delete"
on public.gallery_images
for delete
using (owner_id = auth.uid());

create policy "intake notes visible to owner"
on public.client_intake_notes
for select
using (owner_id = auth.uid());

create policy "intake notes writable by owner"
on public.client_intake_notes
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "gallery storage public read"
on storage.objects
for select
using (bucket_id = 'gallery');

create policy "gallery storage authenticated upload"
on storage.objects
for insert
with check (
  bucket_id = 'gallery'
  and exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.is_active = true
  )
);

create policy "gallery storage owner update"
on storage.objects
for update
using (
  bucket_id = 'gallery'
  and owner = auth.uid()
  and exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.is_active = true
  )
)
with check (
  bucket_id = 'gallery'
  and owner = auth.uid()
  and exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.is_active = true
  )
);

create policy "gallery storage owner delete"
on storage.objects
for delete
using (
  bucket_id = 'gallery'
  and owner = auth.uid()
  and exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.is_active = true
  )
);
