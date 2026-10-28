-- Monetary amounts are immutable accounting facts.  A later change of the
-- company registration country must never reinterpret an old EUR invoice as ALL.

alter table public.company_invoice_settings
  add column if not exists default_currency text not null default 'EUR',
  add column if not exists all_per_eur_rate numeric(12,4) not null default 100;

alter table public.company_invoice_settings
  drop constraint if exists company_invoice_settings_default_currency_check,
  add constraint company_invoice_settings_default_currency_check
    check (default_currency in ('EUR', 'ALL')),
  drop constraint if exists company_invoice_settings_all_per_eur_rate_check,
  add constraint company_invoice_settings_all_per_eur_rate_check
    check (all_per_eur_rate > 0 and all_per_eur_rate <= 1000000);

-- Existing records keep their monetary values. This only chooses a default for
-- invoices and counter-sales created after this migration.
update public.company_invoice_settings
set default_currency = case when registration_country = 'AL' then 'ALL' else 'EUR' end,
    all_per_eur_rate = coalesce(nullif(all_per_eur_rate, 0), 100)
where registration_country = 'AL'
   or all_per_eur_rate is null
   or all_per_eur_rate <= 0;

alter table public.invoices
  add column if not exists exchange_rate numeric(12,4) not null default 1;

alter table public.invoices
  drop constraint if exists invoices_exchange_rate_positive,
  add constraint invoices_exchange_rate_positive check (exchange_rate > 0 and exchange_rate <= 1000000);

create or replace function public.apply_invoice_registration_context()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  configured_country text;
  configured_currency text;
  configured_rate numeric(12,4);
begin
  select registration_country, default_currency, all_per_eur_rate
    into configured_country, configured_currency, configured_rate
  from public.company_invoice_settings
  where company_id = new.company_id;

  configured_country := coalesce(configured_country, 'DE');
  configured_currency := case
    when configured_country = 'AL' then coalesce(configured_currency, 'ALL')
    else 'EUR'
  end;
  configured_rate := coalesce(configured_rate, 100);

  new.registration_country := configured_country;
  new.currency := configured_currency;
  new.exchange_rate := case when configured_currency = 'ALL' then configured_rate else 1 end;
  new.invoice_snapshot := coalesce(new.invoice_snapshot, '{}'::jsonb) || jsonb_build_object(
    'registration_country', configured_country,
    'currency', configured_currency,
    'exchange_rate', new.exchange_rate,
    'exchange_rate_basis', 'ALL_per_EUR'
  );
  return new;
end;
$$;

-- A grouped return value is deliberate: EUR and ALL may never be summed.
drop function if exists public.company_daily_creator_summary(uuid, date);
create function public.company_daily_creator_summary(input_company_id uuid, input_day date default current_date)
returns table (
  creator_id uuid,
  currency text,
  services_created bigint,
  invoices_created bigint,
  payments_recorded bigint,
  invoiced_total numeric,
  paid_total numeric,
  open_total numeric
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner', 'admin', 'manager', 'staff', 'accounting', 'viewer']::text[]) then
    raise exception 'Company access is required.' using errcode = '42501';
  end if;
  return query
  with activity as (
    select s.created_by as creator_id, null::text as currency, count(*)::bigint as services_created, 0::bigint as invoices_created, 0::bigint as payments_recorded,
      0::numeric as invoiced_total, 0::numeric as paid_total, 0::numeric as open_total
    from public.services s
    where s.company_id = input_company_id and (s.created_at at time zone 'Europe/Berlin')::date = input_day
    group by s.created_by
    union all
    select i.created_by, i.currency, 0, count(*)::bigint, 0, coalesce(sum(i.total_amount), 0), 0::numeric, coalesce(sum(i.total_amount - i.amount_paid), 0)
    from public.invoices i
    where i.company_id = input_company_id and (i.created_at at time zone 'Europe/Berlin')::date = input_day
    group by i.created_by, i.currency
    union all
    select p.recorded_by, i.currency, 0, 0, count(*)::bigint, 0::numeric, coalesce(sum(p.amount), 0), 0::numeric
    from public.company_invoice_payments p join public.invoices i on i.id = p.invoice_id
    where p.company_id = input_company_id and (p.paid_at at time zone 'Europe/Berlin')::date = input_day
    group by p.recorded_by, i.currency
  )
  select creator_id, currency, sum(services_created)::bigint, sum(invoices_created)::bigint, sum(payments_recorded)::bigint,
    sum(invoiced_total)::numeric, sum(paid_total)::numeric, sum(open_total)::numeric
  from activity group by creator_id, currency;
end;
$$;

revoke all on function public.company_daily_creator_summary(uuid, date) from public, anon;
grant execute on function public.company_daily_creator_summary(uuid, date) to authenticated;

create or replace function public.create_company_counter_sale(input_company_id uuid, input_lines jsonb, input_amount_paid numeric default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare line jsonb; item record; sale_id uuid; sequence_number integer; receipt text; quantity numeric; total numeric := 0; paid numeric; sale_currency text := 'EUR';
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','staff']::text[]) then raise exception 'Company inventory access is required.' using errcode = '42501'; end if;
  if jsonb_typeof(input_lines) <> 'array' or jsonb_array_length(input_lines) = 0 then raise exception 'At least one sale line is required.' using errcode = '22023'; end if;
  for line in select * from jsonb_array_elements(input_lines) loop
    quantity := (line ->> 'quantity')::numeric;
    if quantity is null or quantity <= 0 then raise exception 'Sale quantity is invalid.' using errcode = '22023'; end if;
    select * into item from public.company_inventory_items where id = (line ->> 'item_id')::uuid and company_id = input_company_id and is_active for update;
    if not found then raise exception 'Inventory item is unavailable.' using errcode = '23503'; end if;
    if item.stock_quantity < quantity then raise exception 'Insufficient stock for %.', item.name using errcode = '22023'; end if;
    total := total + round(item.sale_price * quantity, 2);
  end loop;
  paid := coalesce(input_amount_paid, total);
  if paid < 0 or paid > total then raise exception 'Payment amount is invalid.' using errcode = '22023'; end if;
  select case when registration_country = 'AL' then default_currency else 'EUR' end into sale_currency
  from public.company_invoice_settings where company_id = input_company_id;
  insert into public.company_counter_sale_sequences(company_id,next_number) values(input_company_id,2) on conflict(company_id) do update set next_number = public.company_counter_sale_sequences.next_number + 1 returning next_number - 1 into sequence_number;
  receipt := format('POS-%s-%s', to_char(current_date,'YYYY'), lpad(sequence_number::text,6,'0'));
  insert into public.company_counter_sales(company_id,receipt_number,currency,status,total_amount,amount_paid,created_by) values(input_company_id,receipt,coalesce(sale_currency, 'EUR'),case when paid = total then 'paid' when paid = 0 then 'open' else 'partial' end,total,paid,auth.uid()) returning id into sale_id;
  for line in select * from jsonb_array_elements(input_lines) loop
    quantity := (line ->> 'quantity')::numeric;
    select * into item from public.company_inventory_items where id = (line ->> 'item_id')::uuid and company_id = input_company_id for update;
    update public.company_inventory_items set stock_quantity = stock_quantity - quantity, updated_at = now() where id = item.id;
    insert into public.company_counter_sale_lines(sale_id,company_id,item_id,item_name,sku,quantity,unit_price,tax_rate,line_total) values(sale_id,input_company_id,item.id,item.name,item.sku,quantity,item.sale_price,item.tax_rate,round(item.sale_price * quantity,2));
    insert into public.company_inventory_movements(company_id,item_id,movement_type,quantity_delta,reference_type,reference_id,created_by) values(input_company_id,item.id,'sale',-quantity,'counter_sale',sale_id,auth.uid());
  end loop;
  return sale_id;
end;
$$;

revoke all on function public.create_company_counter_sale(uuid,jsonb,numeric) from public, anon, authenticated, service_role;
grant execute on function public.create_company_counter_sale(uuid,jsonb,numeric) to authenticated;
notify pgrst, 'reload schema';
