-- ==============================================================================
-- Migration: time-effective cost-price history
-- Run in Supabase SQL editor.
--
-- WHY: cost prices change over time. Historical orders must keep the cost that
-- was in effect on the order date, while new orders use the latest cost. The
-- products.cost_price column still holds the CURRENT (latest) cost for display;
-- this table holds the dated history that the dashboard/PNL resolves per order.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.product_cost_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  shipping_cost NUMERIC(10, 2),
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- one cost entry per product per effective date (re-saving the same date updates it)
  UNIQUE (product_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_cost_history_product
  ON public.product_cost_history (product_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_cost_history_store
  ON public.product_cost_history (store_id);

ALTER TABLE public.product_cost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost history for their stores" ON public.product_cost_history
  FOR SELECT USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can insert cost history for their stores" ON public.product_cost_history
  FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update cost history for their stores" ON public.product_cost_history
  FOR UPDATE USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete cost history for their stores" ON public.product_cost_history
  FOR DELETE USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
  );

-- ------------------------------------------------------------------------------
-- OPTIONAL backfill: seed the current cost_price as the baseline entry,
-- effective from far in the past, so every existing/historical order resolves
-- to today's cost until a newer dated cost is added. Safe to run once.
-- ------------------------------------------------------------------------------
INSERT INTO public.product_cost_history (product_id, store_id, cost_price, shipping_cost, effective_from)
SELECT id, store_id, COALESCE(cost_price, 0), COALESCE(shipping_cost, 0), DATE '2000-01-01'
FROM public.products
WHERE cost_price IS NOT NULL
ON CONFLICT (product_id, effective_from) DO NOTHING;
