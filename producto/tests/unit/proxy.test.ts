import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

// La primera barrera de la app (src/proxy.ts): sin cookie de sesión no entra nadie a las rutas privadas, y una ruta mal formada no llega a Next
const pedir = (ruta: string, cookie?: string) => proxy(new NextRequest("http://localhost:3100" + ruta, cookie ? { headers: { cookie } } : undefined));

describe("proxy", () => {
  it("sin cookie de sesión, las API dan 401 y las pantallas llevan a entrar", async () => {
    const api = pedir("/api/archivos/t/x/docs/a.jpg");
    expect(api.status).toBe(401);
    expect(await api.json()).toEqual({ error: "no_session" });
    const pantalla = pedir("/compras/123?x=1");
    expect(pantalla.status).toBe(307);
    expect(pantalla.headers.get("location")).toBe("http://localhost:3100/entrar?next=%2Fcompras%2F123%3Fx%3D1");
  });
  it("las rutas públicas pasan sin cookie", () => {
    for (const r of ["/entrar", "/registro", "/invitacion/abc", "/api/stripe/webhook"]) expect(pedir(r).headers.get("x-middleware-next"), r).toBe("1");
  });
  it("con cookie pasa y la renueva en las peticiones GET", () => {
    const res = pedir("/hoy", "rs_sess=abc");
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("set-cookie")).toMatch(/rs_sess=abc/);
  });
  it("una ruta con un «%» mal formado da 400 (Next respondería 500 en las rutas con parámetros), con o sin sesión", async () => {
    for (const cookie of [undefined, "rs_sess=abc"]) {
      for (const r of ["/compras/%zz", "/api/archivos/t/x/docs/%E0%A4%A", "/api/exportar/%", "/entrar/%zz"]) {
        const res = pedir(r, cookie);
        expect(res.status, `${r} ${cookie ?? "sin cookie"}`).toBe(400);
      }
    }
    expect(pedir("/api/archivos/t/x/docs/a%20b.jpg", "rs_sess=abc").status).toBe(200);
  });
});
