-- RLS policies do not grant table access by themselves. Keep grants broad only
-- enough for the policies below and let RLS decide the final row-level access.
grant select, insert, update on public.companies to authenticated;
grant select, insert, update, delete on public.company_users to authenticated;
grant select, insert, update on public.company_profiles to authenticated;
grant select, insert, update on public.company_theme_settings to authenticated;
grant select, insert, update, delete on public.company_domains to authenticated;

-- Public company profile and theme pages rely on their existing public-read RLS
-- policies. Anonymous users receive no write privileges.
grant select on public.company_profiles to anon;
grant select on public.company_theme_settings to anon;

-- Domain records contain a verification token. They are platform-sensitive and
-- must not be visible to ordinary staff or managers.
drop policy if exists "members read company domains" on public.company_domains;
drop policy if exists "company admins insert domains" on public.company_domains;
drop policy if exists "company admins update domains" on public.company_domains;

create policy "company owners read domains"
on public.company_domains
for select to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner']));

create policy "company owners insert domains"
on public.company_domains
for insert to authenticated
with check (public.has_company_role(company_id, auth.uid(), array['owner']));

create policy "company owners update domains"
on public.company_domains
for update to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner']))
with check (public.has_company_role(company_id, auth.uid(), array['owner']));
