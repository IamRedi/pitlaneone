-- Public catalog items shown on each published company website.
create table if not exists public.company_catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_type text not null default 'product' check (item_type in ('product', 'service')),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'ALL')),
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_catalog_items_company_created_idx
on public.company_catalog_items(company_id, created_at desc);

alter table public.company_catalog_items enable row level security;

grant select, insert, update, delete on public.company_catalog_items to authenticated;
grant select on public.company_catalog_items to anon;

drop policy if exists "members read company catalog items" on public.company_catalog_items;
create policy "members read company catalog items"
on public.company_catalog_items for select to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff', 'accounting', 'viewer']));

drop policy if exists "public read published company catalog items" on public.company_catalog_items;
create policy "public read published company catalog items"
on public.company_catalog_items for select to anon
using (exists (select 1 from public.company_profiles p where p.company_id = company_catalog_items.company_id and p.is_public));

drop policy if exists "company admins manage catalog items" on public.company_catalog_items;
create policy "company admins manage catalog items"
on public.company_catalog_items for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company admins upload brand assets" on storage.objects;
create policy "company admins upload brand assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and name ~ '^[0-9a-f-]{36}/brand/(logo|hero|service-1|service-2|service-3|gallery-1|gallery-2|gallery-3|gallery-extra|catalog)/[^/]+$'
  and public.has_company_role(public.company_id_from_asset_path(name), auth.uid(), array['owner', 'admin'])
);
