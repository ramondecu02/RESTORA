// Cloudflare Pages Function — POST /api/leads
// Public endpoint for the static landing. Accepts three kinds of submission:
//   demo       — the founder / demo request form (restaurant, role, city…)
//   mensaje    — the light contact form (name + email + message)
//   newsletter — email + consent, in exchange for the food-cost checklist
// Validates, stores the row in D1 (binding: DB) and, if configured, notifies
// by email via Resend.

const ROLES = ["jefe_cocina", "gestor", "propietario"];
const ROLE_LABELS = {
  jefe_cocina: "Jefe de cocina",
  gestor: "Gestor / responsable de costes",
  propietario: "Propietario",
};
const KINDS = ["demo", "mensaje", "newsletter"];
const KIND_LABELS = { demo: "Solicitud de demo", mensaje: "Mensaje rápido", newsletter: "Alta newsletter" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

const str = (v, max) => String(v ?? "").trim().slice(0, max);

// Normalise + validate a submission. Non-demo kinds fill the legacy NOT NULL
// columns (restaurant / role / city) with readable placeholders.
function parseLead(body) {
  const kindRaw = str(body.kind, 20);
  const kind = KINDS.includes(kindRaw) ? kindRaw : "demo";
  const lang = str(body.lang, 2) === "ca" ? "ca" : "es";
  const name = str(body.name, 120) || null;
  const emailRaw = str(body.email, 160).toLowerCase();
  const email = emailRaw && EMAIL_RE.test(emailRaw) ? emailRaw : null;
  const restaurant = str(body.restaurant, 120);
  const city = str(body.city, 120);
  const roleRaw = str(body.role, 40);
  const role = ROLES.includes(roleRaw) ? roleRaw : null;
  const pos = str(body.pos, 120) || null;
  const message = str(body.message, 2000) || null;
  const consent = body.consent === true || body.consent === "true" || body.consent === 1;

  const errors = {};
  if (kind === "demo") {
    if (!restaurant) errors.restaurant = "required";
    if (!city) errors.city = "required";
    if (!role) errors.role = "invalid";
  } else if (kind === "mensaje") {
    if (!name) errors.name = "required";
    if (!email) errors.email = emailRaw ? "invalid" : "required";
    if (!message) errors.message = "required";
  } else {
    if (!email) errors.email = emailRaw ? "invalid" : "required";
    if (!consent) errors.consent = "required";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    lead: {
      kind,
      lang,
      name,
      email,
      message,
      pos,
      restaurant: restaurant || name || (kind === "newsletter" ? "Newsletter" : "Mensaje web"),
      city: city || "—",
      role: role || kind,
      source: kind === "demo" ? "landing" : `landing:${kind}`,
    },
  };
}

const INSERT_V2 =
  "INSERT INTO leads (id, created_at, kind, name, email, restaurant, role, city, pos, lang, status, message, notes, source, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
const INSERT_V1 =
  "INSERT INTO leads (id, created_at, restaurant, role, city, pos, lang, status, message, notes, source, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";

// Databases created before the kind/name/email columns existed get them added
// on first use (idempotent; see cloudflare/migrations/0002_contact_kinds.sql).
async function ensureSchema(env) {
  for (const col of ["kind TEXT NOT NULL DEFAULT 'demo'", "name TEXT", "email TEXT"]) {
    try {
      await env.DB.prepare(`ALTER TABLE leads ADD COLUMN ${col}`).run();
    } catch (err) {
      if (!/duplicate column/i.test(String(err && err.message))) throw err;
    }
  }
}

async function insertLead(env, id, createdAt, lead, ip) {
  const v2 = () =>
    env.DB.prepare(INSERT_V2)
      .bind(id, createdAt, lead.kind, lead.name, lead.email, lead.restaurant, lead.role, lead.city, lead.pos, lead.lang, "nuevo", lead.message, null, lead.source, ip)
      .run();
  try {
    await v2();
    return;
  } catch (err) {
    if (!/no such column/i.test(String(err && err.message))) throw err;
  }
  try {
    await ensureSchema(env);
    await v2();
  } catch {
    // Last resort: legacy layout, keeping the contact data inside `message`.
    const legacyMessage = [`[${lead.kind}]`, lead.name, lead.email && `<${lead.email}>`, lead.message].filter(Boolean).join(" · ");
    await env.DB.prepare(INSERT_V1)
      .bind(id, createdAt, lead.restaurant, lead.role, lead.city, lead.pos, lead.lang, "nuevo", legacyMessage, null, lead.source, ip)
      .run();
  }
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

  const parsed = parseLead(body);
  if (!parsed.ok) return json({ ok: false, errors: parsed.errors }, 400);
  const lead = parsed.lead;

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
    await insertLead(env, id, createdAt, lead, ip);
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }

  // Best-effort email notification — never blocks the response.
  await notify(env, { ...lead, createdAt }).catch(() => {});

  return json({ ok: true, id }, 201);
}

export function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

async function notify(env, lead) {
  if (!env.RESEND_API_KEY || !env.LEAD_NOTIFY_TO) return;
  const from = env.LEAD_NOTIFY_FROM || "RESTORA <onboarding@resend.dev>";
  const rows = (
    lead.kind === "demo"
      ? [
          ["Restaurante", lead.restaurant],
          ["Rol", ROLE_LABELS[lead.role] || lead.role],
          ["Ciudad", lead.city],
          ["TPV actual", lead.pos || "—"],
          ["Pregunta", lead.message || "—"],
        ]
      : lead.kind === "mensaje"
        ? [
            ["Nombre", lead.name],
            ["Email", lead.email],
            ["Mensaje", lead.message],
          ]
        : [["Email", lead.email]]
  ).concat([
    ["Idioma", lead.lang],
    ["Fecha", lead.createdAt],
  ]);
  const html = `<div style="font-family:system-ui,sans-serif"><h2>${escapeHtml(KIND_LABELS[lead.kind])}</h2><table style="font-size:14px;border-collapse:collapse">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#75786b">${k}</td><td style="padding:4px 0"><b>${escapeHtml(v)}</b></td></tr>`,
    )
    .join("")}</table></div>`;
  const who = lead.kind === "demo" ? lead.restaurant : lead.name || lead.email;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [env.LEAD_NOTIFY_TO],
      reply_to: lead.email || undefined,
      subject: `${KIND_LABELS[lead.kind]} · ${who}`,
      html,
    }),
  });
}
