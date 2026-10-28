-- Italy is available as a registration country for new invoices. The country
-- is snapshotted on each invoice by apply_invoice_registration_context, so
-- invoices issued before a settings change preserve their original format.
--
-- This migration enables the Italian print/PDF presentation only. It does not
-- create or send the XML required for Italian Sistema di Interscambio (SdI).

alter table public.company_invoice_settings
  drop constraint if exists company_invoice_settings_registration_country_check,
  add constraint company_invoice_settings_registration_country_check
    check (registration_country in ('DE', 'AL', 'IT'));

alter table public.invoices
  drop constraint if exists invoices_registration_country_check,
  add constraint invoices_registration_country_check
    check (registration_country in ('DE', 'AL', 'IT'));

notify pgrst, 'reload schema';
