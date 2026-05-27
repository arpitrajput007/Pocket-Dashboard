-- ==============================================================================
-- Per-store ad-platform whitelist — owners pick which platforms appear in
-- the Ad Spend modal. Default = Meta only (most common entry point in India).
-- Safe to re-run.
-- ==============================================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS enabled_ad_platforms JSONB DEFAULT '["meta"]'::jsonb;

-- Backfill any existing rows that ended up NULL (older Postgres + jsonb default quirk).
UPDATE public.stores
   SET enabled_ad_platforms = '["meta"]'::jsonb
 WHERE enabled_ad_platforms IS NULL;
