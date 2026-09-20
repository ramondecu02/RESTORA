-- Cloudflare D1 schema for RESTORA leads.
-- Apply with: npx wrangler d1 execute restora-leads --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  restaurant TEXT NOT NULL,
  role       TEXT NOT NULL,          -- jefe_cocina | gestor | propietario (or the kind for non-demo rows)
  city       TEXT NOT NULL,
  pos        TEXT,                   -- TPV actual (nullable)
  lang       TEXT NOT NULL,          -- es | ca
  status     TEXT NOT NULL DEFAULT 'nuevo',  -- nuevo | contactado | descartado
  message    TEXT,                   -- pregunta / mensaje del visitante (opcional)
  notes      TEXT,
  source     TEXT NOT NULL DEFAULT 'landing',
  ip         TEXT,
  kind       TEXT NOT NULL DEFAULT 'demo',   -- demo | mensaje | newsletter
  name       TEXT,                   -- nombre de contacto (mensaje)
  email      TEXT                    -- email de contacto (mensaje / newsletter)
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_kind ON leads(kind);
