-- Move operational authorization from the retired single-workshop admin model
-- to the active company membership model. This migration is intended for the
-- SaaS cutover database only; do not apply it to the archived workshop app.

-- A SaaS company member is an auth user and does not need a legacy admins row.
-- Keep owner_id as nullable audit/rollback metadata until the legacy schema is
-- formally retired, but never use it for SaaS authorization.
alter table public.clients alter column owner_id drop not null;
alter table public.vehicles alter column owner_id drop not null;
alter table public.services alter column owner_id drop not null;
alter table public.service_items alter column owner_id drop not null;
alter table public.reminders alter column owner_id drop not null;
alter table public.invoices alter column owner_id drop not null;
alter table public.client_intake_notes alter column owner_id drop not null;
alter table public.gallery_images alter column owner_id drop not null;

-- RLS does not grant relation privileges. These grants are intentionally broad
-- only at the relation layer; every operational row remains constrained by the
-- company-scoped policies below.
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.service_items to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.client_intake_notes to authenticated;
grant select, insert, update, delete on public.gallery_images to authenticated;
grant select on public.gallery_images to anon;

-- Remove every legacy policy that authorizes through public.admins.owner_id.
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

-- All active company members may read their company's operational data.
-- Mutations use role-specific policies below and always derive authorization
-- from the row's company_id, never a value supplied by the browser alone.
create policy "company members read clients"
on public.clients for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own profile"
on public.clients for select to authenticated
using (auth_user_id = auth.uid());

create policy "company operators manage clients"
on public.clients for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']));

create policy "company members read vehicles"
on public.vehicles for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own vehicles"
on public.vehicles for select to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.id = vehicles.client_id
      and c.company_id = vehicles.company_id
      and c.auth_user_id = auth.uid()
  )
);

create policy "company operators manage vehicles"
on public.vehicles for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']));

create policy "company members read services"
on public.services for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own services"
on public.services for select to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id and c.company_id = v.company_id
    where v.id = services.vehicle_id
      and v.company_id = services.company_id
      and c.auth_user_id = auth.uid()
  )
);

create policy "company operators manage services"
on public.services for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']));

create policy "company members read service items"
on public.service_items for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own service items"
on public.service_items for select to authenticated
using (
  exists (
    select 1
    from public.services s
    join public.vehicles v on v.id = s.vehicle_id and v.company_id = s.company_id
    join public.clients c on c.id = v.client_id and c.company_id = v.company_id
    where s.id = service_items.service_id
      and s.company_id = service_items.company_id
      and c.auth_user_id = auth.uid()
  )
);

create policy "company operators manage service items"
on public.service_items for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']));

create policy "company members read reminders"
on public.reminders for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own reminders"
on public.reminders for select to authenticated
using (
  exists (
    select 1
    from public.vehicles v
    join public.clients c on c.id = v.client_id and c.company_id = v.company_id
    where v.id = reminders.vehicle_id
      and v.company_id = reminders.company_id
      and c.auth_user_id = auth.uid()
  )
);

create policy "company operators manage reminders"
on public.reminders for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']));

create policy "company members read invoices"
on public.invoices for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "clients read own invoices"
on public.invoices for select to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.id = invoices.client_id
      and c.company_id = invoices.company_id
      and c.auth_user_id = auth.uid()
  )
);

create policy "company finance manage invoices"
on public.invoices for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'accounting']));

create policy "company members read intake notes"
on public.client_intake_notes for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "company operators manage intake notes"
on public.client_intake_notes for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff']));

-- Gallery items remain public only when the company has explicitly published
-- its profile. Members can still read private draft assets for their company.
create policy "public read published company gallery"
on public.gallery_images for select to anon, authenticated
using (
  exists (
    select 1 from public.company_profiles cp
    where cp.company_id = gallery_images.company_id
      and cp.is_public = true
  )
);

create policy "company members read gallery"
on public.gallery_images for select to authenticated
using (public.is_company_member(company_id, auth.uid()));

create policy "company operators manage gallery"
on public.gallery_images for all to authenticated
using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin', 'manager']));
