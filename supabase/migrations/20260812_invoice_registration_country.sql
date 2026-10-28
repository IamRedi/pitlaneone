-- Invoice presentation follows the company's legal registration country, not
-- the language currently selected in the application UI.

alter table public.company_invoice_settings
  add column if not exists registration_country text not null default 'DE',
  add column if not exists tax_rate_configured boolean not null default false;

alter table public.company_invoice_settings
  drop constraint if exists company_invoice_settings_registration_country_check,
  add constraint company_invoice_settings_registration_country_check
    check (registration_country in ('DE', 'AL'));

-- Tax rates are business configuration. Do not choose a fiscal rate for newly
-- created companies; owners must enter the value supplied by their accountant.
alter table public.company_invoice_settings
  alter column default_tax_rate set default 0;

-- The previous migration supplied 19% only as a temporary presentation
-- default. Clear that setting now; already-issued invoice snapshots remain
-- unchanged, while each company can explicitly save its accountant's rate.
update public.company_invoice_settings
set default_tax_rate = 0
where not tax_rate_configured;

alter table public.invoices
  add column if not exists registration_country text not null default 'DE';

alter table public.invoices
  drop constraint if exists invoices_registration_country_check,
  add constraint invoices_registration_country_check
    check (registration_country in ('DE', 'AL'));

update public.invoices invoice
set registration_country = coalesce(settings.registration_country, 'DE')
from public.company_invoice_settings settings
where settings.company_id = invoice.company_id
  and coalesce(invoice.invoice_snapshot ->> 'registration_country', '') = '';

create or replace function public.apply_invoice_registration_context()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  configured_country text;
  configured_currency text;
begin
  select settings.registration_country
    into configured_country
  from public.company_invoice_settings settings
  where settings.company_id = new.company_id;

  configured_country := coalesce(configured_country, 'DE');
  configured_currency := case when configured_country = 'AL' then 'ALL' else 'EUR' end;

  new.registration_country := configured_country;
  new.currency := configured_currency;
  new.invoice_snapshot := coalesce(new.invoice_snapshot, '{}'::jsonb) || jsonb_build_object(
    'registration_country', configured_country,
    'currency', configured_currency
  );

  return new;
end;
$$;

drop trigger if exists apply_invoice_registration_context on public.invoices;
create trigger apply_invoice_registration_context
before insert on public.invoices
for each row execute function public.apply_invoice_registration_context();

notify pgrst, 'reload schema';
