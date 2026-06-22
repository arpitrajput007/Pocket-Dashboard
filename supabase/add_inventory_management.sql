-- Inventory Management: vendor bills + parsed line items
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.inventory_bills (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bill_date   DATE,
  vendor      TEXT,
  bill_number TEXT,
  source_type TEXT NOT NULL DEFAULT 'text',   -- 'text' | 'pdf' | 'doc' | 'url'
  source_url  TEXT,
  raw_text    TEXT,
  total_amount DECIMAL(12,2),
  currency    TEXT DEFAULT 'INR',
  status      TEXT DEFAULT 'parsed',          -- 'parsed' | 'error'
  parse_error TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bill_line_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id      UUID NOT NULL REFERENCES public.inventory_bills(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL,
  product_name TEXT NOT NULL,
  sku          TEXT,
  quantity     INTEGER NOT NULL DEFAULT 0,
  unit_cost    DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_bills_store ON public.inventory_bills(store_id);
CREATE INDEX IF NOT EXISTS idx_bill_line_items_store ON public.bill_line_items(store_id);
CREATE INDEX IF NOT EXISTS idx_bill_line_items_bill  ON public.bill_line_items(bill_id);

-- Row-Level Security
ALTER TABLE public.inventory_bills  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_line_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_owner_bills"       ON public.inventory_bills;
DROP POLICY IF EXISTS "store_owner_line_items"  ON public.bill_line_items;

CREATE POLICY "store_owner_bills" ON public.inventory_bills
  FOR ALL USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "store_owner_line_items" ON public.bill_line_items
  FOR ALL USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );
