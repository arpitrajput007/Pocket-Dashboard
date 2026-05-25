-- =============================================================================
-- PERFORMANCE INDEXES — run once in Supabase SQL editor
-- =============================================================================

-- 1. Composite index for all date-range order queries (store_id + created_at)
--    Covers: DailyDashboard, WeeklyView, MonthlyView, AllTimeView, AI Copilot
CREATE INDEX IF NOT EXISTS idx_orders_store_created
  ON public.orders(store_id, created_at DESC);

-- 2. Index for RLS policy subquery (auth.uid() → owner_id → store_id)
--    Without this, every order row access does a full scan of stores table
CREATE INDEX IF NOT EXISTS idx_stores_owner_id
  ON public.stores(owner_id);

-- 3. Index for products queries (PricingView, loadPricing in all views)
CREATE INDEX IF NOT EXISTS idx_products_store_id
  ON public.products(store_id);

-- 4. Index for ad_costs queries (DailyDashboard fetches by store + date range)
CREATE INDEX IF NOT EXISTS idx_ad_costs_store_date
  ON public.ad_costs(store_id, date);

-- 5. Track last successful sync time per store (enables incremental sync)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Verify indexes were created
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_orders_store_created',
    'idx_stores_owner_id',
    'idx_products_store_id',
    'idx_ad_costs_store_date'
  );
