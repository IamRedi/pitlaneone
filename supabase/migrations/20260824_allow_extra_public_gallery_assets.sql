drop policy if exists "company admins upload brand assets" on storage.objects;

create policy "company admins upload brand assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and name ~ '^[0-9a-f-]{36}/brand/(logo|hero|service-1|service-2|service-3|gallery-1|gallery-2|gallery-3|gallery-extra)/[^/]+$'
  and public.has_company_role(public.company_id_from_asset_path(name), auth.uid(), array['owner', 'admin'])
);
