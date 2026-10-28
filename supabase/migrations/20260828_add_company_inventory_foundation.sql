-- Inventory and POS foundation. No existing service or invoice data changes.
create table if not exists public.company_inventory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku text not null,
  barcode text,
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  unit text not null default 'pcs' check (char_length(trim(unit)) between 1 and 24),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  stock_quantity numeric(12,3) not null default 0 check (stock_quantity >= 0),
  reorder_level numeric(12,3) not null default 0 check (reorder_level >= 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, sku)
);
create unique index if not exists company_inventory_items_barcode_unique
  on public.company_inventory_items(company_id, barcode) where barcode is not null;

create table if not exists public.company_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid not null references public.company_inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('receive', 'sale', 'adjustment', 'return')),
  quantity_delta numeric(12,3) not null check (quantity_delta <> 0),
  note text,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists company_inventory_movements_item_created_idx on public.company_inventory_movements(company_id, item_id, created_at desc);

create table if not exists public.company_counter_sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  receipt_number text not null,
  currency text not null default 'EUR' check (currency in ('EUR', 'ALL')),
  status text not null default 'paid' check (status in ('paid', 'partial', 'open', 'void')),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0 and amount_paid <= total_amount),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(company_id, receipt_number)
);

create table if not exists public.company_counter_sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.company_counter_sales(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  item_id uuid references public.company_inventory_items(id) on delete set null,
  item_name text not null,
  sku text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  line_total numeric(12,2) not null check (line_total >= 0)
);

alter table public.company_inventory_items enable row level security;
alter table public.company_inventory_movements enable row level security;
alter table public.company_counter_sales enable row level security;
alter table public.company_counter_sale_lines enable row level security;
grant select on public.company_inventory_items, public.company_inventory_movements, public.company_counter_sales, public.company_counter_sale_lines to authenticated;

create policy "members read inventory items" on public.company_inventory_items for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner','admin','manager','staff','accounting','viewer']));
create policy "members read inventory movements" on public.company_inventory_movements for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner','admin','manager','staff','accounting','viewer']));
create policy "members read counter sales" on public.company_counter_sales for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner','admin','manager','staff','accounting','viewer']));
create policy "members read counter sale lines" on public.company_counter_sale_lines for select to authenticated using (public.has_company_role(company_id, auth.uid(), array['owner','admin','manager','staff','accounting','viewer']));

notify pgrst, 'reload schema';
