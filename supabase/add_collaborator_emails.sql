-- Add collaborator_emails to stores so team members can view a store they don't own.
-- Collaborators are matched by their auth email (case-insensitive array lookup in App.jsx).
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS collaborator_emails text[] DEFAULT '{}';

-- Index to speed up the "find stores where I'm a collaborator" query
CREATE INDEX IF NOT EXISTS idx_stores_collaborator_emails
  ON stores USING GIN (collaborator_emails);

-- Existing RLS: owner can SELECT their store.
-- Grant collaborators read-only access: they may SELECT but NOT modify.
-- (Store owners can still UPDATE, DELETE via their own policy.)
CREATE POLICY IF NOT EXISTS "Collaborators can view store"
  ON stores FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.email() = ANY(collaborator_emails)
  );
