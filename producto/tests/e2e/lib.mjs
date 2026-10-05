// Utilidades para las pruebas de extremo a extremo (Playwright + Postgres local).
import { chromium } from "playwright-core";
import pg from "pg";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const BASE = process.env.E2E_BASE || "http://localhost:3100";
export const DB = process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev";
export const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

export async function launch() {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
}
export async function lastCode(email, purpose = "verify") {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    const r = await c.query(`select body_text from outbox_emails where lower(to_email) = lower($1) order by created_at desc limit 5`, [email]);
    for (const row of r.rows) {
      const m = row.body_text.match(/\b(\d{6})\b/);
      if (m && (purpose === "verify" ? /confirmar|código para confirmar|entrar/i.test(row.body_text) || true : true)) return m[1];
    }
    return null;
  } finally { await c.end(); }
}
export async function sql(q, params = []) {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try { return (await c.query(q, params)).rows; } finally { await c.end(); }
}
export function watch(page, errors) {
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource: the server responded with a status of 40[134]/.test(m.text())) errors.push("console: " + m.text()); });
}
export async function noOverflow(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".content, .auth-main, .onb-main")) if (el.scrollWidth > el.clientWidth + 1) out.push(el.className + " " + el.scrollWidth + ">" + el.clientWidth);
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push("html");
    return out;
  });
}

/** Ejecuta fn con la ventana tan alta como el contenido (como tallShot): toda la pantalla se ve y se mide sin desplazarse. */
export async function conAlturaCompleta(page, fn) {
  const vp = page.viewportSize();
  const extra = await page.evaluate(() => { const el = document.querySelector(".content, .auth-main, .onb-main"); return el ? el.scrollHeight - el.clientHeight : 0; });
  if (extra > 0) { await page.setViewportSize({ width: vp.width, height: Math.min(vp.height + extra, 12000) }); await page.waitForTimeout(150); }
  try { return await fn(); } finally { if (extra > 0) await page.setViewportSize(vp); }
}

/**
 * Controles (enlaces, botones, campos) que otro elemento tapa y no se pueden pulsar. Mira en cinco puntos de cada control qué hay
 * encima (elementFromPoint) con la pantalla entera a la vista; ignora lo oculto, lo cerrado y lo recortado por su contenedor.
 */
export async function tapados(page) {
  return conAlturaCompleta(page, () => page.evaluate(() => {
    const SEL = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=tab], summary";
    const describe = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + "«" + (el.innerText || el.getAttribute("aria-label") || el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 28) + "»";
    const oculto = (el) => {
      if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return true;
      const d = el.closest("details:not([open])");
      if (d && !(el.tagName === "SUMMARY" && el.parentElement === d)) return true;
      return !!el.closest("[inert]");
    };
    // La parte del control que se ve: su caja recortada por los contenedores con scroll u overflow
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      let l = r.left, t = r.top, rr = r.right, b = r.bottom;
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const pr = p.getBoundingClientRect();
        if (cs.overflowX !== "visible") { l = Math.max(l, pr.left); rr = Math.min(rr, pr.right); }
        if (cs.overflowY !== "visible") { t = Math.max(t, pr.top); b = Math.min(b, pr.bottom); }
      }
      return { l, t, w: rr - l, h: b - t };
    };
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      if (oculto(el)) continue;
      const v = visible(el);
      if (v.w < 6 || v.h < 6) continue;
      let tapado = 0, centro = false, culpable = null;
      for (const fy of [0.2, 0.5, 0.8]) for (const fx of [0.2, 0.5, 0.8]) {
        const top = document.elementFromPoint(v.l + v.w * fx, v.t + v.h * fy);
        if (!top || el === top || el.contains(top) || top.contains(el)) continue;
        if (el.labels && [...el.labels].some((lb) => lb === top || lb.contains(top))) continue;
        tapado++; culpable = culpable || top;
        if (fx === 0.5 && fy === 0.5) centro = true;
      }
      if (centro || tapado >= 4) out.push(describe(el) + " tapado por " + describe(culpable.closest(SEL) || culpable));
    }
    return out;
  }));
}

/** Textos cortados en seco: un elemento con overflow oculto, sin puntos suspensivos, cuyo texto no cabe en su caja. */
export async function recortados(page) {
  return page.evaluate(() => {
    const out = [];
    const nombre = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + "«" + (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 30) + "»";
    for (const el of document.querySelectorAll("body *")) {
      if (!el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const cs = getComputedStyle(el);
      if (cs.overflowX !== "hidden" && cs.overflowX !== "clip") continue;
      if (cs.display === "inline" || (cs.textOverflow === "ellipsis" && !/flex|grid/.test(cs.display))) continue;
      // Solo cajas con texto propio: las que recortan imágenes o adornos no importan
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (el.scrollWidth > el.clientWidth + 1) out.push(nombre(el) + ` ${el.scrollWidth}>${el.clientWidth}`);
    }
    return out;
  });
}

/** Rutas de la app con datos: las fijas y, para las fichas de detalle, el primer elemento de cada lista. Hay que tener la sesión abierta. */
export async function rutasDeLaApp(page) {
  async function primero(path, re) {
    await page.goto(BASE + path);
    const hrefs = await page.locator(`a[href^="${path}/"]`).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    return hrefs.find((h) => re.test(h)) ?? null;
  }
  const ids = {
    compra: await primero("/compras", /^\/compras\/[0-9a-f-]{36}$/),
    articulo: await primero("/articulos", /^\/articulos\/[0-9a-f-]{36}$/),
    proveedor: await primero("/proveedores", /^\/proveedores\/[0-9a-f-]{36}$/),
    receta: await primero("/escandallos", /^\/escandallos\/[0-9a-f-]{36}$/),
  };
  const rutas = [
    ["hoy", "/hoy"], ["avisos", "/hoy/avisos"], ["compras", "/compras"], ["compra", ids.compra], ["subir", "/compras/subir"], ["nueva", "/compras/nueva"],
    ["articulos", "/articulos"], ["articulo", ids.articulo], ["articulo-nuevo", "/articulos/nuevo"], ["proveedores", "/proveedores"], ["proveedor", ids.proveedor],
    ["inventario", "/inventario"], ["pedidos", "/inventario/pedidos"], ["escandallos", "/escandallos"], ["elaboraciones", "/escandallos/elaboraciones"],
    ["escandallo", ids.receta], ["escandallo-nuevo", "/escandallos/nuevo"], ["carta", "/carta"], ["carta-subir", "/carta/subir"], ["carta-imprimir", "/carta/imprimir"],
    ["ventas", "/ventas"], ["ventas-importar", "/ventas/importar"], ["cuenta", "/cuenta"], ["usuarios", "/cuenta/usuarios"], ["facturacion", "/cuenta/facturacion"], ["mas", "/mas"],
  ].filter(([, p]) => p);
  return { ids, rutas };
}

/** Abre un negocio nuevo con los datos de ejemplo y guarda su sesión; con REUSE=1 y una sesión guardada, la reutiliza sin registrarse otra vez. */
export async function negocioDeEjemplo(b, nombre) {
  const fichero = SHOTS + `state-${nombre}.json`;
  if (process.env.REUSE === "1" && existsSync(fichero)) return JSON.parse(readFileSync(fichero, "utf8"));
  const cx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
  const page = await cx.newPage();
  const email = `${nombre}+${Date.now()}@example.com`;
  await signup(page, { email });
  await cargarDemo(page);
  // Los recorridos guiados tapan la pantalla la primera vez: aquí se miden las pantallas, no el recorrido
  await sql(`update users set prefs = jsonb_set(coalesce(prefs, '{}'::jsonb), '{seen}', '{"hoy":true,"validacion":true,"compras":true,"escandallos":true,"carta":true,"inventario":true}'::jsonb) where lower(email) = lower($1)`, [email]);
  const state = await cx.storageState();
  writeFileSync(fichero, JSON.stringify(state));
  await cx.close();
  return state;
}

/** Captura la pantalla completa aunque el scroll esté dentro de .content (shell de la app). */
export async function tallShot(page, path) {
  const vp = page.viewportSize();
  const extra = await page.evaluate(() => { const el = document.querySelector(".content, .auth-main, .onb-main"); return el ? el.scrollHeight - el.clientHeight : 0; });
  if (extra > 0) { await page.setViewportSize({ width: vp.width, height: Math.min(vp.height + extra, 12000) }); await page.waitForTimeout(150); }
  await page.screenshot({ path, caret: "initial" });
  if (extra > 0) await page.setViewportSize(vp);
}

/** Alta completa por la interfaz (registro, código, briefing, local) hasta /hoy, cerrando el tour. */
export async function signup(page, { email, nombre = "Marta Pujol", negocio = "Casa Pujol" }) {
  await sql("delete from rate_limits"); // alta, verificación y demás están limitadas por IP: las pruebas crean muchas cuentas seguidas
  await page.goto(BASE + "/registro");
  await page.getByLabel("Tu nombre").fill(nombre);
  await page.getByLabel("Email de trabajo").fill(email);
  await page.getByLabel("Nombre del restaurante").fill(negocio);
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
  for (let i = 0; i < 4; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 3000 }); await n.click(); } catch { break; } }
}
/** Carga los datos de ejemplo desde Cuenta. */
export async function cargarDemo(page) {
  await page.goto(BASE + "/cuenta");
  await page.getByRole("button", { name: "Cargar datos de ejemplo" }).click();
  await page.getByText("Cargados", { exact: true }).waitFor({ timeout: 60000 });
}

/**
 * Crea un negocio real por la interfaz (alta, datos de ejemplo, un pedido, una carta subida y un aviso de precio resuelto) para que
 * todas las tablas de negocio tengan filas. Devuelve su id, su local, el email, el contexto del navegador y la página con la sesión abierta.
 * Lo usan las pruebas de aislamiento entre negocios (rls.mjs, fugas.mjs): crean un negocio A y otro B y miran qué ve cada uno del otro.
 */
export async function negocio(b, tag) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
  const page = await ctx.newPage();
  const email = `rls-${tag}+${Date.now()}@example.com`;
  await signup(page, { email, negocio: `Negocio ${tag}` });
  await cargarDemo(page);
  // Un pedido (pedidos, pedido_lineas) y una carta subida (documento_archivos)
  await page.goto(BASE + "/inventario");
  await page.getByRole("button", { name: /Preparar pedido/ }).click();
  await page.getByRole("button", { name: "Guardar pedido" }).filter({ visible: true }).first().click();
  await page.waitForTimeout(800);
  await page.goto(BASE + "/carta/subir");
  await page.getByRole("button", { name: /Probar con una carta de ejemplo/ }).click();
  await page.waitForURL(/\/carta\/subir\/[0-9a-f-]{36}/, { timeout: 30000 });
  // Un aviso de precio resuelto (avisos_estado)
  await page.goto(BASE + "/hoy/avisos");
  await page.getByRole("button", { name: /Ya lo he resuelto/ }).first().click();
  await page.waitForTimeout(800);
  const [t] = await sql("select m.org_id as id, (select l.id from locales l where l.tenant_id = m.org_id order by l.created_at limit 1) as local, m.user_id from memberships m join users u on u.id = m.user_id where lower(u.email) = lower($1)", [email]);
  if (!(await sql("select 1 from avisos_estado where tenant_id = $1", [t.id])).length) throw new Error(`no se ha guardado el aviso resuelto del negocio ${tag}`);
  console.log(`· negocio ${tag} creado (${t.id})`);
  return { tag, id: t.id, local: t.local, userId: t.user_id, email, ctx, page };
}
/**
 * Los dos negocios de las pruebas de aislamiento: A y B (en este orden, por el límite de altas por conexión).
 * Con REUSE=1 y los negocios de una pasada anterior guardados, se reabren sin darlos de alta otra vez (para iterar sobre una prueba).
 */
export async function negocios(b) {
  const fichero = SHOTS + "state-negocios.json";
  if (process.env.REUSE === "1" && existsSync(fichero)) {
    const guardado = JSON.parse(readFileSync(fichero, "utf8"));
    const out = {};
    for (const tag of ["A", "B"]) {
      const { state, ...datos } = guardado[tag];
      const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 860 }, locale: "es-ES" });
      out[tag] = { ...datos, ctx, page: await ctx.newPage() };
    }
    return out;
  }
  const A = await negocio(b, "A");
  const B = await negocio(b, "B");
  const guarda = async ({ ctx, page: _, ...datos }) => ({ ...datos, state: await ctx.storageState() });
  writeFileSync(fichero, JSON.stringify({ A: await guarda(A), B: await guarda(B) }));
  return { A, B };
}

/**
 * Acciones de servidor de la compilación actual, tal como las lista Next en .next/server/server-reference-manifest.json:
 * «archivo#nombre» (el archivo, sin src/app/) → { id, workers }. null si no hay compilación local (servidor remoto).
 */
export function accionesDelServidor() {
  const f = new URL("../../.next/server/server-reference-manifest.json", import.meta.url).pathname;
  if (!existsSync(f)) return null;
  const out = new Map();
  for (const [id, v] of Object.entries(JSON.parse(readFileSync(f, "utf8")).node)) out.set(`${v.filename.replace(/^src\/app\//, "")}#${v.exportedName}`, { id, workers: Object.keys(v.workers) });
  return out;
}
/**
 * Llama a una acción de servidor como lo haría el navegador (misma petición que envía React), con la sesión de `request`
 * (el contexto de un navegador con la sesión abierta). `ruta` es una página donde existe esa acción. Devuelve el estado HTTP,
 * el destino de la redirección (x-action-redirect), el cuerpo entero y el resultado de la acción ({ ok, error, data… }) si lo hay.
 */
export async function llamarAccion(request, accion, args, ruta) {
  const r = await request.post(BASE + ruta, {
    headers: { "next-action": accion.id, accept: "text/x-component", "content-type": "text/plain;charset=UTF-8", origin: new URL(BASE).origin },
    data: JSON.stringify(args), maxRedirects: 0, timeout: 120000,
  });
  const cuerpo = await r.text();
  const fila = cuerpo.split("\n").map((l) => l.replace(/^[0-9a-f]+:/, "")).find((l) => l.startsWith('{"ok":'));
  let resultado = null;
  try { resultado = fila ? JSON.parse(fila) : null; } catch { resultado = null; }
  return { status: r.status(), redirect: r.headers()["x-action-redirect"] ?? null, cuerpo, resultado };
}
