-- Production can still contain check constraints created before the repository
-- migrations were standardized.  Those unconditional checks reject the
-- deliberately negative total of a German Storno invoice, even though the
-- canonical invoices_signed_totals_check handles invoice kinds correctly.

alter table public.invoices
  drop constraint if exists invoices_amount_paid_not_over_total,
  drop constraint if exists invoices_amounts_nonnegative;

-- Fail the migration if the canonical kind-aware accounting invariant is not
-- present.  Removing the legacy constraints must never leave totals unguarded.
do $verify_signed_invoice_totals$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_record
    where constraint_record.conrelid = 'public.invoices'::regclass
      and constraint_record.contype = 'c'
      and constraint_record.conname = 'invoices_signed_totals_check'
  ) then
    raise exception 'Canonical signed invoice totals constraint is missing.';
  end if;
end;
$verify_signed_invoice_totals$;

notify pgrst, 'reload schema';
