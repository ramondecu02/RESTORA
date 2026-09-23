// Recorre todas las pantallas con los datos de ejemplo cargados, en móvil y escritorio.
// Comprueba: respuesta HTTP, errores de consola, desbordamiento horizontal. Guarda capturas.
import { BASE, SHOTS, launch, lastCode, sql, watch, noOverflow, tallShot } from "./lib.mjs";
import { existsSync, writeFileSync } from "node:fs";
// REUSE=1 reutiliza la sesión de la última ejecución (sin registrarse ni cargar la demo otra vez).
// ONLY=hoy,carta limita las pantallas. WIDTHS=390,1280 elige anchos.
const STATE = SHOTS + "state.json";
const REUSE = process.env.REUSE === "1" && existsSync(STATE);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const WIDTHS = (process.env.WIDTHS || "1280,390").split(",").map(Number);

const email = `recorrido+${Date.now()}@example.com`;
const b = await launch();
const errors = [];
const results = [];

async function signup(page) {
  await sql("delete from rate_limits where key like 'reg:%'"); // el alta está limitada a 8/hora por IP
  await page.goto(BASE + "/registro");
  await page.getByLabel("Tu nombre").fill("Marta Pujol");
  await page.getByLabel("Email de trabajo").fill(email);
  await page.getByLabel("Nombre del restaurante").fill("Casa Pujol");
  await page.getByLabel("Contraseña", { exact: true }).fill("una-clave-segura-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/verificar");
  await page.getByLabel("Cifra 1 de 6").fill(await lastCode(email));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL("**/bienvenida");
  await page.getByRole("link", { name: /Empezar/ }).click();
  await page.waitForURL("**/alta/briefing");
  await page.getByRole("radio", { name: "Restaurante" }).click();
  await page.getByRole("radio", { name: "15 a 40" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("radio", { name: /Excel/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("radio", { name: "Propietario/a" }).click();
  await page.getByRole("radio", { name: /qué platos ganan/ }).click();
  await page.getByRole("button", { name: "Terminar" }).click();
  await page.waitForURL("**/alta/local");
  await page.getByLabel("Código postal").fill("43003");
  await page.getByLabel("Ciudad").fill("Tarragona");
  await page.getByRole("button", { name: "Guardar y seguir" }).click();
  await page.waitForURL("**/alta/proveedores");
  await page.getByRole("button", { name: "Ir a mi cocina" }).click();
  await page.waitForURL("**/hoy**");
  for (let i = 0; i < 4; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 1500 }); await n.click(); } catch { break; } }
}

async function firstHref(page, path, re) {
  await page.goto(BASE + path);
  const hrefs = await page.locator(`a[href^="${path}/"]`).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  return hrefs.find((h) => re.test(h)) ?? null;
}

async function visit(page, W, name, path) {
  const errsBefore = errors.length;
  const r = await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const ov = await noOverflow(page);
  await tallShot(page, `${SHOTS}r${W}-${name}.png`);
  const st = r?.status();
  const newErr = errors.slice(errsBefore);
  const ok = st === 200 && !ov.length && !newErr.length;
  results.push({ W, name, path, st, ov, errs: newErr.length });
  console.log(ok ? "✓" : "✗", W, name, st, ov.length ? "overflow:" + ov.join("|") : "", newErr.length ? newErr.join(" ‖ ").slice(0, 300) : "");
}

try {
  const ctxD = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", ...(REUSE ? { storageState: STATE } : {}) });
  const page = await ctxD.newPage();
  watch(page, errors);
  if (!REUSE) {
    await signup(page);
    console.log("✓ alta");
    await page.goto(BASE + "/cuenta");
    const t0 = Date.now();
    await page.getByRole("button", { name: "Cargar datos de ejemplo" }).click();
    await page.getByText("Cargados", { exact: true }).waitFor({ timeout: 60000 });
    console.log("✓ demo cargada en", Date.now() - t0, "ms");
    writeFileSync(STATE, JSON.stringify(await ctxD.storageState()));
  }

  const ids = {
    compra: await firstHref(page, "/compras", /^\/compras\/[0-9a-f-]{36}$/),
    articulo: await firstHref(page, "/articulos", /^\/articulos\/[0-9a-f-]{36}$/),
    proveedor: await firstHref(page, "/proveedores", /^\/proveedores\/[0-9a-f-]{36}$/),
    receta: await firstHref(page, "/escandallos", /^\/escandallos\/[0-9a-f-]{36}$/),
  };
  console.log("ids", JSON.stringify(ids));
  const pages = [
    ["hoy", "/hoy"], ["avisos", "/hoy/avisos"], ["compras", "/compras"], ["compra", ids.compra], ["subir", "/compras/subir"], ["nueva", "/compras/nueva"],
    ["articulos", "/articulos"], ["articulo", ids.articulo], ["articulo-nuevo", "/articulos/nuevo"], ["proveedores", "/proveedores"], ["proveedor", ids.proveedor],
    ["inventario", "/inventario"], ["pedidos", "/inventario/pedidos"], ["escandallos", "/escandallos"], ["elaboraciones", "/escandallos/elaboraciones"],
    ["escandallo", ids.receta], ["escandallo-nuevo", "/escandallos/nuevo"], ["carta", "/carta"], ["carta-subir", "/carta/subir"], ["carta-imprimir", "/carta/imprimir"],
    ["ventas", "/ventas"], ["ventas-importar", "/ventas/importar"], ["cuenta", "/cuenta"], ["usuarios", "/cuenta/usuarios"], ["facturacion", "/cuenta/facturacion"], ["mas", "/mas"],
  ].filter(([n, p]) => p && (!ONLY || ONLY.includes(n)));
  const state = await ctxD.storageState();
  for (const W of WIDTHS) {
    const mobile = W < 700;
    const cx = await b.newContext({ viewport: { width: W, height: mobile ? 844 : 860 }, locale: "es-ES", storageState: state, isMobile: mobile, hasTouch: mobile });
    const pg = await cx.newPage();
    watch(pg, errors);
    for (const [n, p] of pages) await visit(pg, W, n, p);
    await cx.close();
  }
  const bad = results.filter((r) => r.st !== 200 || r.ov.length || r.errs);
  console.log(`\n${results.length - bad.length}/${results.length} pantallas sin problemas`);
} finally {
  console.log("errores:", errors.length ? errors.slice(0, 20) : "ninguno");
  await b.close();
}
