// POST /api/login  { password }  -> cookie de sesión firmada (HMAC) de 30 días.
const enc = new TextEncoder();
const DAYS = 30;

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
}
// Comparación en tiempo (casi) constante para no filtrar la longitud/valor.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.APP_PASSWORD || !env.APP_SECRET) return json({ ok: false, error: "not_configured" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }
  const password = String(body.password ?? "");
  if (!safeEqual(password, env.APP_PASSWORD)) {
    return json({ ok: false, error: "bad_credentials" }, 401);
  }

  const payload = b64urlStr(JSON.stringify({ exp: Date.now() + DAYS * 86400_000 }));
  const token = payload + "." + (await hmac(env.APP_SECRET, payload));
  const cookie = `rs_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${DAYS * 86400}`;
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}

export function onRequestGet() {
  return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
}
