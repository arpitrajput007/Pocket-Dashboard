-- ==============================================================================
-- Migration: extend products table for Shopify sync + owner-created packs
-- Run in Supabase SQL editor.
-- ==============================================================================

-- 1. Shopify product status: 'active' | 'draft' | 'archived'.
--    The pricing UI shows active products by default and routes the rest to Hidden.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. First image from Shopify (for nicer thumbnails in the pricing table).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Pack support.
--    A pack row is a child of a base product. pack_size = 2/3/5 etc.
--    Owner enters cost_price and selling_price manually for each pack.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pack_size INTEGER;

-- 4. Per-store products sync timestamp (separate from the orders' last_synced_at).
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS products_synced_at TIMESTAMPTZ;

-- 5. Indexes for fast lookups.
CREATE INDEX IF NOT EXISTS idx_products_parent ON public.products(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_products_store_status ON public.products(store_id, status);
