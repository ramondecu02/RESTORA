-- Adds the columns used by the light contact form and the newsletter block.
-- The Pages Function applies these automatically the first time it needs them;
-- run it by hand if you prefer to migrate explicitly:
--   npx wrangler d1 execute restora-leads --remote --file=./cloudflare/migrations/0002_contact_kinds.sql
ALTER TABLE leads ADD COLUMN kind  TEXT NOT NULL DEFAULT 'demo';  -- demo | mensaje | newsletter
ALTER TABLE leads ADD COLUMN name  TEXT;                          -- contact name (mensaje)
ALTER TABLE leads ADD COLUMN email TEXT;                          -- contact email (mensaje / newsletter)
CREATE INDEX IF NOT EXISTS idx_leads_kind ON leads(kind);
