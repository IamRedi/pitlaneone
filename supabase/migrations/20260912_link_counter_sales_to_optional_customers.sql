-- A counter sale may be anonymous (walk-in) or optionally linked to an
-- existing company customer. Historical receipts remain unchanged.
alter table public.company_counter_sales
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists company_counter_sales_client_created_idx
  on public.company_counter_sales(company_id, client_id, created_at desc);

create or replace function public.create_company_counter_sale(
  input_company_id uuid,
  input_lines jsonb,
  input_amount_paid numeric default null,
  input_client_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare line jsonb; item record; sale_id uuid; sequence_number integer; receipt text; quantity numeric; total numeric := 0; paid numeric; sale_currency text := 'EUR';
begin
  if not public.has_company_role(input_company_id, auth.uid(), array['owner','admin','manager','staff']::text[]) then raise exception 'Company inventory access is required.' using errcode = '42501'; end if;
  if input_client_id is not null and not exists (select 1 from public.clients where id = input_client_id and company_id = input_company_id) then raise exception 'Customer is outside the active company.' using errcode = '23503'; end if;
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
  select case when registration_country = 'AL' then default_currency else 'EUR' end into sale_currency from public.company_invoice_settings where company_id = input_company_id;
  insert into public.company_counter_sale_sequences(company_id,next_number) values(input_company_id,2) on conflict(company_id) do update set next_number = public.company_counter_sale_sequences.next_number + 1 returning next_number - 1 into sequence_number;
  receipt := format('POS-%s-%s', to_char(current_date,'YYYY'), lpad(sequence_number::text,6,'0'));
  insert into public.company_counter_sales(company_id,client_id,receipt_number,currency,status,total_amount,amount_paid,created_by) values(input_company_id,input_client_id,receipt,coalesce(sale_currency,'EUR'),case when paid = total then 'paid' when paid = 0 then 'open' else 'partial' end,total,paid,auth.uid()) returning id into sale_id;
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

revoke all on function public.create_company_counter_sale(uuid,jsonb,numeric,uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_company_counter_sale(uuid,jsonb,numeric,uuid) to authenticated;
notify pgrst, 'reload schema';
