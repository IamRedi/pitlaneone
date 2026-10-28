-- Public company branding assets are isolated by company UUID at the first
-- path segment. This bucket must never be used for invoices or private files.
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do update set public = true;

-- The legacy gallery policies referenced public.admins directly. PostgreSQL
-- evaluates relation permissions while planning storage policies, so that
-- direct reference can reject unrelated company-assets uploads. Preserve the
-- legacy gallery behavior behind a narrowly scoped security-definer helper.
create or replace function public.is_active_workshop_admin(input_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = input_user_id
      and a.is_active = true
  );
$$;

revoke all on function public.is_active_workshop_admin(uuid) from public;
grant execute on function public.is_active_workshop_admin(uuid) to authenticated;

drop policy if exists "gallery storage authenticated upload" on storage.objects;
drop policy if exists "gallery storage owner update" on storage.objects;
drop policy if exists "gallery storage owner delete" on storage.objects;

create policy "gallery storage authenticated upload"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'gallery'
  and public.is_active_workshop_admin(auth.uid())
);

create policy "gallery storage owner update"
on storage.objects
for update to authenticated
using (
  bucket_id = 'gallery'
  and owner = auth.uid()
  and public.is_active_workshop_admin(auth.uid())
)
with check (
  bucket_id = 'gallery'
  and owner = auth.uid()
  and public.is_active_workshop_admin(auth.uid())
);

create policy "gallery storage owner delete"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'gallery'
  and owner = auth.uid()
  and public.is_active_workshop_admin(auth.uid())
);

create or replace function public.company_id_from_asset_path(object_name text)
returns uuid
language sql
immutable
strict
set search_path = public
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function public.company_id_from_asset_path(text) from public;
grant execute on function public.company_id_from_asset_path(text) to authenticated;

drop policy if exists "company assets public read" on storage.objects;
drop policy if exists "company admins upload assets" on storage.objects;
drop policy if exists "company admins update assets" on storage.objects;
drop policy if exists "company admins delete assets" on storage.objects;

create policy "company assets public read"
on storage.objects
for select
using (bucket_id = 'company-assets');

create policy "company admins upload assets"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and name ~ '^[0-9a-f-]{36}/brand/(logo|hero)/[^/]+$'
  and public.has_company_role(
    public.company_id_from_asset_path(name),
    auth.uid(),
    array['owner', 'admin']
  )
);

create policy "company admins update assets"
on storage.objects
for update to authenticated
using (
  bucket_id = 'company-assets'
  and name ~ '^[0-9a-f-]{36}/brand/(logo|hero)/[^/]+$'
  and public.has_company_role(
    public.company_id_from_asset_path(name),
    auth.uid(),
    array['owner', 'admin']
  )
)
with check (
  bucket_id = 'company-assets'
  and name ~ '^[0-9a-f-]{36}/brand/(logo|hero)/[^/]+$'
  and public.has_company_role(
    public.company_id_from_asset_path(name),
    auth.uid(),
    array['owner', 'admin']
  )
);

create policy "company admins delete assets"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'company-assets'
  and name ~ '^[0-9a-f-]{36}/brand/(logo|hero)/[^/]+$'
  and public.has_company_role(
    public.company_id_from_asset_path(name),
    auth.uid(),
    array['owner', 'admin']
  )
);
