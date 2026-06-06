-- ── Money In My Pocket tables ────────────────────────────────────────────────
-- Run once in Supabase SQL editor.

-- Manual expense entries (team salaries, warehouse, subscriptions, etc.)
CREATE TABLE IF NOT EXISTS monthly_expenses (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id     UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  month        TEXT        NOT NULL,  -- YYYY-MM
  category     TEXT        NOT NULL DEFAULT 'other',
  label        TEXT        NOT NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_expenses_store_month
  ON monthly_expenses(store_id, month);

ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_expenses" ON monthly_expenses;
CREATE POLICY "owners_manage_expenses" ON monthly_expenses
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );

-- Per-store configurable cost rates
CREATE TABLE IF NOT EXISTS store_cost_config (
  store_id              UUID        REFERENCES stores(id) ON DELETE CASCADE PRIMARY KEY,
  shopify_monthly       NUMERIC(10,2) DEFAULT 0,
  cod_charge_per_order  NUMERIC(8,2)  DEFAULT 29,
  gateway_pct           NUMERIC(6,3)  DEFAULT 2.0,
  rto_cost_per_order    NUMERIC(8,2)  DEFAULT 135,
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE store_cost_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_cost_config" ON store_cost_config;
CREATE POLICY "owners_manage_cost_config" ON store_cost_config
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  );
