// POST/GET /api/logout -> borra la cookie de sesión.
function clear() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "rs_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
  });
}
export const onRequestPost = clear;
export const onRequestGet = clear;
