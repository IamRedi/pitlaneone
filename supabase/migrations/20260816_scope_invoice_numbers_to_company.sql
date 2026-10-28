-- Invoice numbers are generated from a sequence per company. They must not be
-- globally unique across tenants, otherwise every new company collides with
-- the first invoice number issued by another company.
alter table public.invoices
  drop constraint if exists invoices_invoice_number_key;

alter table public.invoices
  drop constraint if exists invoices_company_invoice_number_key;

alter table public.invoices
  add constraint invoices_company_invoice_number_key
  unique (company_id, invoice_number);

notify pgrst, 'reload schema';
