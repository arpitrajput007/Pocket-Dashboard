-- Add sync_from_date for Shiprocket — controls how far back the initial historical
-- pull goes. Store owners set this once during onboarding. Safe to re-run.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS shiprocket_sync_from_date DATE;
