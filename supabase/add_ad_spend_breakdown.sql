-- ==============================================================================
-- Ad-spend per-platform breakdown
-- Adds:
--   ad_costs.breakdown   JSONB: { meta: 1240, google: 500, youtube: 0, tiktok: 0, other: 0 }
--   ad_costs.source      TEXT: 'manual' | 'screenshot_ocr' | 'meta_api' | 'google_api' | 'email_inbound'
-- Safe to re-run.
-- ==============================================================================

ALTER TABLE public.ad_costs
  ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.ad_costs
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- For filtering automated vs manual entries (admin/debugging).
CREATE INDEX IF NOT EXISTS idx_ad_costs_source ON public.ad_costs(source);
