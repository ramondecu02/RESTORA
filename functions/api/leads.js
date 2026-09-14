// Cloudflare Pages Function — POST /api/leads
// Public endpoint for the static landing: validates, stores the lead in D1
// (binding: DB) and, if configured, sends an email notification via Resend.

const ROLES = ["jefe_cocina", "gestor", "propietario"];

const ROLE_LABELS = {
  jefe_cocina: "Jefe de cocina",
  gestor: "Gestor / responsable de costes",
  propietario: "Propietario",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  // Honeypot — silently accept so bots don't learn they were filtered.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true }, 201);
  }

  const restaurant = String(body.restaurant ?? "").trim().slice(0, 120);
  const city = String(body.city ?? "").trim().slice(0, 120);
  const roleRaw = String(body.role ?? "").trim();
  const role = ROLES.includes(roleRaw) ? roleRaw : null;
  const pos = String(body.pos ?? "").trim().slice(0, 120) || null;
  const lang = String(body.lang ?? "").trim() === "ca" ? "ca" : "es";

  const errors = {};
  if (!restaurant) errors.restaurant = "required";
  if (!city) errors.city = "required";
  if (!role) errors.role = "invalid";
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, errors }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  // Light rate limit: max 5 submissions / 60s per IP.
  try {
    const since = new Date(Date.now() - 60_000).toISOString();
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM leads WHERE ip = ? AND created_at >= ?",
    )
      .bind(ip, since)
      .first();
    if (recent && Number(recent.n) >= 5) {
      return json({ ok: false, error: "rate_limited" }, 429, { "Retry-After": "60" });
    }
  } catch {
    /* non-fatal: proceed even if the pre-check fails */
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      "INSERT INTO leads (id, created_at, restaurant, role, city, pos, lang, status, notes, source, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(id, createdAt, restaurant, role, city, pos, lang, "nuevo", null, "landing", ip)
      .run();
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }

  // Best-effort email notification — never blocks the response.
  await notify(env, { restaurant, role, city, pos, lang, createdAt }).catch(() => {});

  return json({ ok: true, id }, 201);
}

export function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

async function notify(env, lead) {
  if (!env.RESEND_API_KEY || !env.LEAD_NOTIFY_TO) return;
  const from = env.LEAD_NOTIFY_FROM || "RESTORA <onboarding@resend.dev>";
  const rows = [
    ["Restaurante", lead.restaurant],
    ["Rol", ROLE_LABELS[lead.role] || lead.role],
    ["Ciudad", lead.city],
    ["TPV actual", lead.pos || "—"],
    ["Idioma", lead.lang],
    ["Fecha", lead.createdAt],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#75786b">${k}</td><td style="padding:4px 0"><b>${escapeHtml(v)}</b></td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:system-ui,sans-serif"><h2>Nuevo socio fundador</h2><table style="font-size:14px;border-collapse:collapse">${rows}</table></div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [env.LEAD_NOTIFY_TO],
      subject: `Nuevo lead RESTORA: ${lead.restaurant}`,
      html,
    }),
  });
}
