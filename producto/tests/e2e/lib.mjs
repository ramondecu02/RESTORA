// Utilidades para las pruebas de extremo a extremo (Playwright + Postgres local).
import { chromium } from "playwright-core";
import pg from "pg";
import { mkdirSync } from "node:fs";

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
  await sql("delete from rate_limits where key like 'reg:%'"); // el alta está limitada a 8/hora por IP
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
  for (let i = 0; i < 4; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 1500 }); await n.click(); } catch { break; } }
}
/** Carga los datos de ejemplo desde Cuenta. */
export async function cargarDemo(page) {
  await page.goto(BASE + "/cuenta");
  await page.getByRole("button", { name: "Cargar datos de ejemplo" }).click();
  await page.getByText("Cargados", { exact: true }).waitFor({ timeout: 60000 });
}
