// RESTORA — Cloudflare Pages (Advanced Mode, single _worker.js)
// - Serves the static landing (via env.ASSETS)
// - POST /api/leads  → stores a lead/inscription in D1 (binding: DB) + optional Resend email
// - GET  /admin      → protected panel to VIEW all inscriptions (HTTP Basic Auth)
// - GET  /admin/leads.csv → protected CSV export

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.redirect(new URL("/es", url).toString(), 302);
    }

    if (url.pathname === "/api/leads") {
      if (request.method === "POST") return handleLead(request, env);
      return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return handleAdmin(request, env);
    }
    if (url.pathname === "/admin/leads.csv") {
      return handleAdminCsv(request, env);
    }

    // Everything else: static assets.
    return env.ASSETS.fetch(request);
  },
};

/* ----------------------------- Lead capture ----------------------------- */

async function handleLead(request, env) {
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  // Honeypot — silently accept.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true }, 201);
  }

  const restaurant = String(body.restaurant ?? "").trim().slice(0, 120);
  const city = String(body.city ?? "").trim().slice(0, 120);
  const roleRaw = String(body.role ?? "").trim();
  const role = ROLES.includes(roleRaw) ? roleRaw : null;
  const pos = String(body.pos ?? "").trim().slice(0, 120) || null;
  const lang = String(body.lang ?? "").trim() === "ca" ? "ca" : "es";
  const message = String(body.message ?? "").trim().slice(0, 2000) || null;

  const errors = {};
  if (!restaurant) errors.restaurant = "required";
  if (!city) errors.city = "required";
  if (!role) errors.role = "invalid";
  if (Object.keys(errors).length > 0) return json({ ok: false, errors }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  // Light rate limit: max 5 / 60s per IP.
  try {
    const since = new Date(Date.now() - 60_000).toISOString();
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM leads WHERE ip = ? AND created_at >= ?",
    ).bind(ip, since).first();
    if (recent && Number(recent.n) >= 5) {
      return json({ ok: false, error: "rate_limited" }, 429, { "Retry-After": "60" });
    }
  } catch {
    /* non-fatal */
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO leads (id, created_at, restaurant, role, city, pos, lang, status, message, notes, source, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(id, createdAt, restaurant, role, city, pos, lang, "nuevo", message, null, "landing", ip).run();
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }

  await notify(env, { restaurant, role, city, pos, lang, message, createdAt }).catch(() => {});
  return json({ ok: true, id }, 201);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (c) =>
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
    ["Pregunta", lead.message || "—"],
    ["Fecha", lead.createdAt],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#75786b">${k}</td><td style="padding:4px 0"><b>${escapeHtml(v)}</b></td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:system-ui,sans-serif"><h2>Nueva inscripción · socio fundador</h2><table style="font-size:14px;border-collapse:collapse">${rows}</table></div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [env.LEAD_NOTIFY_TO], subject: `Nueva inscripción RESTORA: ${lead.restaurant}`, html }),
  });
}

/* ------------------------------ Admin panel ----------------------------- */

function unauthorized() {
  return new Response("Autenticación requerida", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RESTORA admin", charset="UTF-8"' },
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkAuth(request, env) {
  if (!env.ADMIN_PASSWORD) return "unset";
  const header = request.headers.get("Authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  const expectedUser = env.ADMIN_USER || "restora";
  return safeEqual(user, expectedUser) && safeEqual(pass, env.ADMIN_PASSWORD);
}

function setupNotice() {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>RESTORA · Configura el panel</title>
  <body style="font-family:system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#17211b;background:#f6f3ec">
  <h1 style="color:#1e3d2f">Panel de inscripciones</h1>
  <p>Para ver aquí las inscripciones, define una contraseña de acceso:</p>
  <pre style="background:#efeadf;padding:14px 16px;border-radius:10px;overflow:auto">npx wrangler pages secret put ADMIN_PASSWORD --project-name restora</pre>
  <p>Luego vuelve a desplegar y entra en <b>/admin</b> con usuario <b>restora</b> y esa contraseña.</p>
  <p style="color:#6a6559;font-size:14px">Las inscripciones se guardan siempre en la base de datos D1 <b>restora-leads</b>, la configures o no.</p>
  </body>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function fetchLeads(env, limit = 1000) {
  const res = await env.DB.prepare(
    "SELECT created_at, restaurant, city, role, pos, lang, status, message FROM leads ORDER BY created_at DESC LIMIT ?",
  ).bind(limit).all();
  return res.results || [];
}

async function handleAdmin(request, env) {
  const auth = checkAuth(request, env);
  if (auth === "unset") return setupNotice();
  if (!auth) return unauthorized();
  if (!env.DB) return new Response("Base de datos no conectada (binding DB).", { status: 500 });

  let leads = [];
  try {
    leads = await fetchLeads(env);
  } catch {
    return new Response("No se pudo leer la base de datos.", { status: 500 });
  }

  const fmtDate = (s) => {
    try {
      return new Date(s).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return s;
    }
  };

  const rows = leads
    .map(
      (l) => `<tr>
      <td class="mono">${escapeHtml(fmtDate(l.created_at))}</td>
      <td><b>${escapeHtml(l.restaurant)}</b></td>
      <td>${escapeHtml(l.city)}</td>
      <td>${escapeHtml(ROLE_LABELS[l.role] || l.role || "—")}</td>
      <td>${escapeHtml(l.pos || "—")}</td>
      <td class="mono">${escapeHtml((l.lang || "").toUpperCase())}</td>
      <td>${escapeHtml(l.message || "—")}</td>
    </tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="es"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>RESTORA · Inscripciones</title>
  <style>
    :root{--brand:#1e3d2f;--bg:#f6f3ec;--ink:#17211b;--muted:#6a6559;--hair:#e6ddcf;--surface:#fffefb}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    .mono{font-variant-numeric:tabular-nums}
    header{background:var(--brand);color:#fff;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
    header h1{font-size:18px;margin:0;letter-spacing:.14em}
    .wrap{max-width:1200px;margin:0 auto;padding:24px}
    .bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:16px}
    .count{font-size:15px;color:var(--muted)}
    .count b{color:var(--ink);font-size:22px}
    a.btn{display:inline-flex;align-items:center;gap:6px;background:var(--brand);color:#fff;text-decoration:none;padding:9px 16px;border-radius:999px;font-weight:600;font-size:14px}
    .card{background:var(--surface);border:1px solid var(--hair);border-radius:14px;overflow:auto}
    table{border-collapse:collapse;width:100%;font-size:14px;min-width:820px}
    th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--hair);vertical-align:top}
    th{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:#efeadf;position:sticky;top:0}
    tr:hover td{background:#faf8f2}
    td:nth-child(7){max-width:320px;color:var(--muted)}
    .empty{padding:40px;text-align:center;color:var(--muted)}
  </style>
  <header><h1>RESTORA · INSCRIPCIONES</h1><a class="btn" href="/admin/leads.csv">Descargar CSV ↓</a></header>
  <div class="wrap">
    <div class="bar"><div class="count"><b>${leads.length}</b> inscripciones</div></div>
    <div class="card">
      ${
        leads.length
          ? `<table><thead><tr><th>Fecha</th><th>Restaurante</th><th>Ciudad</th><th>Rol</th><th>TPV</th><th>Idioma</th><th>Pregunta / mensaje</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<div class="empty">Aún no hay inscripciones. Aparecerán aquí en cuanto alguien envíe el formulario.</div>`
      }
    </div>
  </div></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

async function handleAdminCsv(request, env) {
  const auth = checkAuth(request, env);
  if (auth === "unset") return setupNotice();
  if (!auth) return unauthorized();
  if (!env.DB) return new Response("db_unavailable", { status: 500 });

  let leads = [];
  try {
    leads = await fetchLeads(env);
  } catch {
    return new Response("db_error", { status: 500 });
  }

  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["created_at", "restaurant", "city", "role", "pos", "lang", "status", "message"];
  const lines = [header.join(",")];
  for (const l of leads) {
    lines.push([l.created_at, l.restaurant, l.city, ROLE_LABELS[l.role] || l.role, l.pos, l.lang, l.status, l.message].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="restora-inscripciones.csv"',
      "Cache-Control": "no-store",
    },
  });
}
