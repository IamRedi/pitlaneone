-- Service prices are customer-facing gross prices. VAT is included in the
-- entered material and labor amounts and must be extracted, never added on top.

create or replace function public.apply_gross_invoice_pricing()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  gross_material numeric(12,2);
  gross_total numeric(12,2);
  extracted_net numeric(12,2);
  extracted_tax numeric(12,2);
begin
  gross_material := round(coalesce(new.material_total, 0) + coalesce(new.fee_total, 0), 2);
  gross_total := round(gross_material + coalesce(new.labor_total, 0), 2);

  if coalesce(new.tax_rate, 0) > 0 then
    extracted_net := round(gross_total / (1 + new.tax_rate / 100), 2);
  else
    extracted_net := gross_total;
  end if;
  extracted_tax := gross_total - extracted_net;

  new.material_total := gross_material;
  new.fee_total := 0;
  new.net_amount := extracted_net;
  new.tax_amount := extracted_tax;
  new.total_amount := gross_total;
  new.invoice_snapshot := coalesce(new.invoice_snapshot, '{}'::jsonb) || jsonb_build_object(
    'version', 3,
    'pricing_mode', 'gross_inclusive',
    'material_total', gross_material,
    'labor_total', new.labor_total,
    'fee_total', 0,
    'net_amount', extracted_net,
    'tax_rate', new.tax_rate,
    'tax_amount', extracted_tax,
    'total_amount', gross_total
  );

  return new;
end;
$$;

drop trigger if exists apply_gross_invoice_pricing on public.invoices;
create trigger apply_gross_invoice_pricing
before insert on public.invoices
for each row execute function public.apply_gross_invoice_pricing();

-- Repair invoices produced by the earlier net-plus-tax implementation. These
-- rows already contain the original entered gross amount in net_amount.
with corrected as (
  select
    invoice.id,
    round(invoice.material_total + invoice.fee_total, 2) as gross_material,
    round(invoice.material_total + invoice.fee_total + invoice.labor_total, 2) as gross_total,
    case
      when invoice.tax_rate > 0 then round(
        (invoice.material_total + invoice.fee_total + invoice.labor_total)
        / (1 + invoice.tax_rate / 100), 2
      )
      else round(invoice.material_total + invoice.fee_total + invoice.labor_total, 2)
    end as extracted_net
  from public.invoices invoice
  where coalesce(invoice.invoice_snapshot ->> 'version', '') = '2'
    and coalesce(invoice.invoice_snapshot ->> 'pricing_mode', '') <> 'gross_inclusive'
)
update public.invoices invoice
set material_total = corrected.gross_material,
    fee_total = 0,
    net_amount = corrected.extracted_net,
    tax_amount = corrected.gross_total - corrected.extracted_net,
    total_amount = corrected.gross_total,
    amount_paid = least(invoice.amount_paid, corrected.gross_total),
    status = case
      when least(invoice.amount_paid, corrected.gross_total) >= corrected.gross_total then 'paid'::public.invoice_status
      when least(invoice.amount_paid, corrected.gross_total) > 0 then 'partial'::public.invoice_status
      else 'issued'::public.invoice_status
    end,
    invoice_snapshot = invoice.invoice_snapshot || jsonb_build_object(
      'version', 3,
      'pricing_mode', 'gross_inclusive',
      'material_total', corrected.gross_material,
      'labor_total', invoice.labor_total,
      'fee_total', 0,
      'net_amount', corrected.extracted_net,
      'tax_rate', invoice.tax_rate,
      'tax_amount', corrected.gross_total - corrected.extracted_net,
      'total_amount', corrected.gross_total
    )
from corrected
where corrected.id = invoice.id;

notify pgrst, 'reload schema';
