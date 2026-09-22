// Puerta de acceso de TODA la app (Cloudflare Pages Functions).
// Deja pasar solo el login; el resto exige una sesión válida (cookie firmada).
const PUBLIC = new Set(["/login", "/login.html", "/api/login", "/api/logout", "/favicon.ico", "/icon.svg"]);
const enc = new TextEncoder();

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return b64url(sig);
}
async function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i), sig = token.slice(i + 1);
  if (sig !== (await hmac(secret, payload))) return false;
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return !!data.exp && Date.now() < data.exp;
  } catch {
    return false;
  }
}
function cookie(request, name) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const p = url.pathname;
  if (PUBLIC.has(p)) return next();

  const ok = await verifyToken(cookie(request, "rs_session"), env.APP_SECRET);
  if (ok) return next();

  if (p.startsWith("/api/")) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return Response.redirect(new URL("/login", url).toString(), 302);
}
