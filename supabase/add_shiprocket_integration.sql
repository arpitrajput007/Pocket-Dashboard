-- ==============================================================================
-- SHIPROCKET INTEGRATION (Phase 1 — foundation)
-- Adds:
--   stores.shiprocket_*          encrypted API-user creds + cached token + flags
--   public.shipments             carrier-truth shipment status, matched to orders
-- Pocket Dashboard treats Shiprocket as the source of truth for delivery status.
-- Safe to re-run.
-- ==============================================================================

-- 1. Store-level Shiprocket connection columns ---------------------------------
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS shiprocket_email            TEXT,        -- API-user email (encrypted)
  ADD COLUMN IF NOT EXISTS shiprocket_password         TEXT,        -- API-user password (encrypted)
  ADD COLUMN IF NOT EXISTS shiprocket_token            TEXT,        -- cached bearer token (encrypted)
  ADD COLUMN IF NOT EXISTS shiprocket_token_expires_at TIMESTAMPTZ, -- token TTL (~10 days)
  ADD COLUMN IF NOT EXISTS shiprocket_connected        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shipments_synced_at         TIMESTAMPTZ; -- last successful shipment pull

-- 2. Shipments table -----------------------------------------------------------
-- One row per Shiprocket order. Matched back to Shopify orders by order name
-- (e.g. "#2606"). A standalone table so Shopify re-syncs never clobber carrier data.
CREATE TABLE IF NOT EXISTS public.shipments (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id               UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  shiprocket_order_id    TEXT NOT NULL,           -- Shiprocket's internal order id (stable key)
  shiprocket_shipment_id TEXT,
  awb                    TEXT,                    -- air waybill / tracking number
  courier                TEXT,                    -- courier company name
  shopify_order_name     TEXT,                    -- "#2606" — join key to public.orders.name
  status                 TEXT,                    -- NORMALIZED: delivered/in_transit/out_for_delivery/rto/undelivered/cancelled/pending
  raw_status             TEXT,                    -- Shiprocket's exact status string
  status_code            INTEGER,                 -- Shiprocket numeric status code
  status_updated_at      TIMESTAMPTZ,             -- when the carrier last changed status
  source                 TEXT DEFAULT 'shiprocket',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store_id, shiprocket_order_id)
);

-- Fast lookup when joining shipments → orders by name, and per-store status rollups
CREATE INDEX IF NOT EXISTS idx_shipments_store_order_name ON public.shipments(store_id, shopify_order_name);
CREATE INDEX IF NOT EXISTS idx_shipments_store_status     ON public.shipments(store_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_awb              ON public.shipments(awb);

-- 3. Row Level Security --------------------------------------------------------
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shipments for their stores" ON public.shipments;
CREATE POLICY "Users can view shipments for their stores" ON public.shipments
    FOR SELECT USING (
        store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid())
    );

-- Writes happen server-side with the service-role key (bypasses RLS), so no
-- INSERT/UPDATE policy is exposed to the anon/frontend role on purpose.
