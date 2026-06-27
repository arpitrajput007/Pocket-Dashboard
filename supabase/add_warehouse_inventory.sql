-- Warehouse Inventory — live stock tracking per store
-- Run this in Supabase SQL Editor

create table if not exists warehouse_inventory (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references stores(id) on delete cascade,
  product_name      text not null,
  sku               text,
  current_stock     integer not null default 0,
  reserved_stock    integer not null default 0,
  reorder_threshold integer not null default 10,
  unit_cost         numeric(12,2),
  sync_source       text not null default 'manual', -- 'manual' | 'csv' | 'api' | 'sheets'
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Speed up per-store lookups and SKU matching
create index if not exists warehouse_inventory_store_id_idx on warehouse_inventory(store_id);
create index if not exists warehouse_inventory_sku_idx      on warehouse_inventory(store_id, sku);

-- Auto-update updated_at on every row change
create or replace function set_warehouse_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists warehouse_inventory_updated_at on warehouse_inventory;
create trigger warehouse_inventory_updated_at
  before update on warehouse_inventory
  for each row execute function set_warehouse_updated_at();

-- RLS: store owners can only see their own inventory
alter table warehouse_inventory enable row level security;

create policy "owner can manage warehouse inventory"
  on warehouse_inventory
  using (
    store_id in (
      select id from stores where owner_id = auth.uid()
    )
  );

-- Service role bypasses RLS automatically (no extra policy needed)
