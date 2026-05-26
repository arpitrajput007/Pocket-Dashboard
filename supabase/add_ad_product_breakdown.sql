-- ==============================================================================
-- Per-product ad-spend breakdown — moves localStorage `dailyProductAdCosts`
-- into a synced column so splits persist across browsers/devices.
-- Safe to re-run.
-- ==============================================================================

ALTER TABLE public.ad_costs
  ADD COLUMN IF NOT EXISTS product_breakdown JSONB DEFAULT '{}'::jsonb;
