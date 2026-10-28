-- Phase 2, step 1: introduce tenant scope without changing the legacy
-- single-workshop authorization path yet. Existing owner_id columns stay in
-- place until operational reads, writes, and RLS have moved to company scope.

alter table public.clients
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.vehicles
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.services
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.service_items
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.reminders
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.invoices
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.client_intake_notes
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

alter table public.gallery_images
  add column if not exists company_id uuid references public.companies (id) on delete restrict;

-- The old global phone constraint is incompatible with SaaS: different
-- companies may legitimately have clients with the same contact number.
alter table public.clients
  drop constraint if exists clients_phone_key;

create unique index if not exists clients_company_phone_unique_idx
  on public.clients (company_id, phone)
  where company_id is not null;

-- Legacy rows remain unique while they have no company scope. This partial
-- index is removed only after the explicit backfill and reconciliation step.
create unique index if not exists clients_legacy_phone_unique_idx
  on public.clients (phone)
  where company_id is null;

create index if not exists clients_company_id_idx on public.clients (company_id);
create index if not exists vehicles_company_id_idx on public.vehicles (company_id);
create index if not exists services_company_id_idx on public.services (company_id);
create index if not exists service_items_company_id_idx on public.service_items (company_id);
create index if not exists reminders_company_id_idx on public.reminders (company_id);
create index if not exists invoices_company_id_idx on public.invoices (company_id);
create index if not exists client_intake_notes_company_id_idx on public.client_intake_notes (company_id);
create index if not exists gallery_images_company_id_idx on public.gallery_images (company_id);

-- Composite keys make the tenant relationship explicit. Because company_id is
-- nullable during the staged migration, existing workshop rows are unaffected;
-- once scoped, each child must reference a parent from the same company.
create unique index if not exists clients_id_company_id_key
  on public.clients (id, company_id);
create unique index if not exists vehicles_id_company_id_key
  on public.vehicles (id, company_id);
create unique index if not exists services_id_company_id_key
  on public.services (id, company_id);

alter table public.vehicles
  drop constraint if exists vehicles_client_company_id_fkey,
  add constraint vehicles_client_company_id_fkey
    foreign key (client_id, company_id)
    references public.clients (id, company_id)
    on delete cascade;

alter table public.services
  drop constraint if exists services_vehicle_company_id_fkey,
  add constraint services_vehicle_company_id_fkey
    foreign key (vehicle_id, company_id)
    references public.vehicles (id, company_id)
    on delete cascade;

alter table public.service_items
  drop constraint if exists service_items_service_company_id_fkey,
  add constraint service_items_service_company_id_fkey
    foreign key (service_id, company_id)
    references public.services (id, company_id)
    on delete cascade;

alter table public.reminders
  drop constraint if exists reminders_vehicle_company_id_fkey,
  add constraint reminders_vehicle_company_id_fkey
    foreign key (vehicle_id, company_id)
    references public.vehicles (id, company_id)
    on delete cascade;

alter table public.invoices
  drop constraint if exists invoices_client_company_id_fkey,
  add constraint invoices_client_company_id_fkey
    foreign key (client_id, company_id)
    references public.clients (id, company_id)
    on delete cascade,
  drop constraint if exists invoices_service_company_id_fkey,
  add constraint invoices_service_company_id_fkey
    foreign key (service_id, company_id)
    references public.services (id, company_id)
    on delete set null (service_id);

alter table public.client_intake_notes
  drop constraint if exists client_intake_notes_client_company_id_fkey,
  add constraint client_intake_notes_client_company_id_fkey
    foreign key (client_id, company_id)
    references public.clients (id, company_id)
    on delete cascade;
