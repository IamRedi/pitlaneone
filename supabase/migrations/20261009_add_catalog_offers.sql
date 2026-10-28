alter table public.company_catalog_items
  add column if not exists original_price numeric(12,2),
  add column if not exists is_featured boolean not null default false;

alter table public.company_catalog_items
  drop constraint if exists company_catalog_items_offer_price_check,
  add constraint company_catalog_items_offer_price_check
    check (original_price is null or original_price >= price);
