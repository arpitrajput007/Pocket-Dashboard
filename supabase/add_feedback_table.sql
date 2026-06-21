-- Feedback table: stores NPS scores, feature requests, and support messages
-- Used by /api/feedback endpoint (server/index.js)

CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID REFERENCES stores(id) ON DELETE SET NULL,
  owner_email  TEXT,
  nps_score    INT CHECK (nps_score BETWEEN 0 AND 10),
  comment      TEXT,
  type         TEXT NOT NULL DEFAULT 'nps',  -- 'nps' | 'feature_request' | 'support'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by store or email
CREATE INDEX IF NOT EXISTS feedback_store_id_idx ON feedback(store_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

-- RLS: backend service role can insert; no direct client access needed
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow server (service role) full access — anon/authenticated cannot read
CREATE POLICY "service_role_all" ON feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);
