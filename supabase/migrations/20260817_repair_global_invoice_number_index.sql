-- Production repair for legacy schema drift: remove any unique constraint
-- that applies to invoice_number alone. Invoice identifiers are tenant-scoped.
do $$
declare
  invoice_number_attnum smallint;
  legacy_constraint record;
begin
  select attnum into invoice_number_attnum
  from pg_attribute
  where attrelid = 'public.invoices'::regclass
    and attname = 'invoice_number'
    and not attisdropped;

  for legacy_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.invoices'::regclass
      and contype = 'u'
      and conkey = array[invoice_number_attnum]::smallint[]
  loop
    execute format('alter table public.invoices drop constraint if exists %I', legacy_constraint.conname);
  end loop;
end;
$$;

-- Covers a legacy manually-created index that may not have had a constraint.
drop index if exists public.invoices_invoice_number_key;

-- Keep the intended tenant-scoped uniqueness, including legacy rows with NULLs.
create unique index if not exists invoices_company_number_once_idx
on public.invoices (company_id, invoice_number)
where company_id is not null and invoice_number is not null;

notify pgrst, 'reload schema';
