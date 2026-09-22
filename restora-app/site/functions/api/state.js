// API del estado de la app. La sesión ya la valida _middleware.js.
//   GET  /api/state -> { ok, data, updated_at }   (data = null la primera vez)
//   PUT  /api/state  (cuerpo = JSON del estado) -> lo guarda en D1
// Modelo simple para UN restaurante: una sola fila (id='default') con todo el
// estado como JSON. Última escritura gana; suficiente para un equipo pequeño.
const MAX_BYTES = 4_000_000; // ~4 MB de margen de sobra para el estado

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Crea la tabla si no existe: así la app funciona sin pasos manuales de SQL.
async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)",
  ).run();
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 500);
  try {
    await ensureTable(env);
    const row = await env.DB.prepare("SELECT data, updated_at FROM app_state WHERE id = 'default'").first();
    if (!row) return json({ ok: true, data: null });
    return json({ ok: true, data: JSON.parse(row.data), updated_at: row.updated_at });
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 500);

  let text;
  try {
    text = await request.text();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }
  if (text.length > MAX_BYTES) return json({ ok: false, error: "too_large" }, 413);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  // Validación mínima: que se parezca al estado de RESTORA (evita machacar con basura).
  if (!parsed || typeof parsed !== "object" || !parsed.productos || !Array.isArray(parsed.platos)) {
    return json({ ok: false, error: "invalid_state" }, 400);
  }

  const now = new Date().toISOString();
  try {
    await ensureTable(env);
    await env.DB.prepare(
      "INSERT INTO app_state (id, data, updated_at) VALUES ('default', ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    )
      .bind(text, now)
      .run();
    return json({ ok: true, updated_at: now });
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}
