-- Base de datos D1 de la app RESTORA (un restaurante).
-- Aplicar con:
--   npx wrangler d1 execute restora-app-db --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS app_state (
  id         TEXT PRIMARY KEY,   -- siempre 'default' (un restaurante)
  data       TEXT NOT NULL,      -- estado completo de la app en JSON
  updated_at TEXT NOT NULL
);
