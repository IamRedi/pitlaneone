-- Private legal and payment identity used only inside a company workspace.
-- Keep these fields separate from company_profiles, which has a public read policy.
create table if not exists public.company_invoice_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  legal_name text,
  tax_id text,
  registration_number text,
  bank_name text,
  bank_iban text,
  invoice_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_invoice_settings_legal_name_length check (legal_name is null or char_length(legal_name) <= 160),
  constraint company_invoice_settings_tax_id_length check (tax_id is null or char_length(tax_id) <= 80),
  constraint company_invoice_settings_registration_number_length check (registration_number is null or char_length(registration_number) <= 80),
  constraint company_invoice_settings_bank_name_length check (bank_name is null or char_length(bank_name) <= 120),
  constraint company_invoice_settings_bank_iban_length check (bank_iban is null or char_length(bank_iban) <= 80),
  constraint company_invoice_settings_footer_length check (invoice_footer is null or char_length(invoice_footer) <= 600)
);

insert into public.company_invoice_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

create or replace function public.bootstrap_company_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.company_users (company_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (company_id, user_id) do nothing;

  insert into public.company_profiles (company_id, display_name)
  values (new.id, new.name)
  on conflict (company_id) do nothing;

  insert into public.company_theme_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  insert into public.company_invoice_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  return new;
end;
$$;

drop trigger if exists set_company_invoice_settings_updated_at on public.company_invoice_settings;
create trigger set_company_invoice_settings_updated_at
before update on public.company_invoice_settings
for each row execute function public.set_updated_at();

alter table public.company_invoice_settings enable row level security;

drop policy if exists "members read company invoice settings" on public.company_invoice_settings;
create policy "members read company invoice settings" on public.company_invoice_settings
for select to authenticated using (public.is_company_member(company_id, auth.uid()));

drop policy if exists "company admins insert invoice settings" on public.company_invoice_settings;
create policy "company admins insert invoice settings" on public.company_invoice_settings
for insert to authenticated with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

drop policy if exists "company admins update invoice settings" on public.company_invoice_settings;
create policy "company admins update invoice settings" on public.company_invoice_settings
for update to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']))
with check (public.has_company_role(company_id, auth.uid(), array['owner', 'admin']));

grant select, insert, update on public.company_invoice_settings to authenticated;
