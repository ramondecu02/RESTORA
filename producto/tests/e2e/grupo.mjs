// Vista de grupo: solo aparece con más de un local, suma lo que suman los locales, enseña cada uno con sus cifras y compara el precio
// del mismo artículo entre locales. Sin pasar de un local a otro más que con el botón de cada fila.
import { BASE, SHOTS, launch, signup, cargarDemo, noOverflow, sql, watch } from "./lib.mjs";

const email = `grupo+${Date.now()}@example.com`;
const errors = [];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
const page = await ctx.newPage();
watch(page, errors);
let fallos = 0;
const step = async (name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}grupo-fail-${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
};
const ir = async (ruta, espera = 500) => { await page.goto(BASE + ruta, { waitUntil: "networkidle" }); await page.waitForTimeout(espera); };
const num = (t) => Number(String(t).replace(/[^\d,-]/g, "").replace(",", "."));

try {
  await signup(page, { email });
  await cargarDemo(page);
  await sql(`update users set prefs = jsonb_set(coalesce(prefs, '{}'::jsonb), '{seen}', '{"hoy":true,"validacion":true,"compras":true,"escandallos":true,"carta":true,"inventario":true}'::jsonb) where lower(email) = lower($1)`, [email]);
  const [{ id: org }] = await sql("select o.id from organizations o join memberships m on m.org_id = o.id join users u on u.id = m.user_id where lower(u.email) = lower($1)", [email]);
  await sql("update organizations set plan_tier = 'pro', plan_interval = 'month', plan_status = 'active' where id = $1", [org]);
  const [{ id: local1 }] = await sql("select id from locales where tenant_id = $1", [org]);

  await step("con un solo local no hay vista de grupo (ni en el menú ni por la dirección)", async () => {
    await ir("/hoy");
    if (await page.locator('.side a[href="/grupo"]').count()) throw new Error("el menú ofrece Grupo con un local");
    await ir("/grupo");
    if (new URL(page.url()).pathname !== "/cuenta") throw new Error("/grupo con un local va a " + page.url());
  });

  // Un segundo local con los mismos tres artículos, un 25 % más caros
  const [{ id: local2 }] = await sql("insert into locales (tenant_id, name, iva_venta, fc_objetivo) values ($1, 'Casa Pujol Reus', 10, 30) returning id", [org]);
  await sql(`insert into articulos (tenant_id, local_id, name, category_id, catalog_item_id, unit, rend, iva, pmp, last_price)
    select tenant_id, $2, name, category_id, catalog_item_id, unit, rend, iva, pmp * 1.25, last_price * 1.25 from articulos where local_id = $1 and not archived and (pmp is not null or last_price is not null) order by name limit 3`, [local1, local2]);

  await step("con dos locales aparece Grupo en el menú y suma lo de los locales", async () => {
    await ir("/hoy");
    if (!(await page.locator('.side a[href="/grupo"]').count())) throw new Error("el menú no ofrece Grupo");
    await page.locator('.side a[href="/grupo"]').click();
    await page.waitForURL("**/grupo");
    await page.waitForSelector(".tiles-row .tile .tile-val");
    await page.waitForTimeout(1200); // la cifra cuenta hasta su valor
    const mes = new URL(page.url()).searchParams.get("mes") ?? (await sql("select to_char(max(date_trunc('month', fecha)), 'YYYY-MM') as m from ventas_lineas where tenant_id = $1", [org]))[0].m;
    const [{ n }] = await sql("select coalesce(sum(neto), 0)::float as n from ventas_lineas where tenant_id = $1 and to_char(fecha, 'YYYY-MM') = $2", [org, mes]);
    if (!(n > 0)) throw new Error("el mes de la prueba no tiene ventas: " + mes);
    const ventas = num(await page.locator(".tiles-row .tile").first().locator(".tile-val").innerText());
    if (Math.abs(ventas - Math.round(n)) > 1) throw new Error(`ventas netas del grupo ${ventas}, en la base ${Math.round(n)}`);
    const filas = await page.locator("table.tbl tbody tr").count();
    if (filas !== 2) throw new Error("filas por local: " + filas);
    const t = await page.locator("table.tbl").innerText();
    if (!t.includes("Casa Pujol") || !t.includes("Casa Pujol Reus")) throw new Error("faltan locales en la tabla");
  });

  await step("compara el precio del mismo artículo entre locales", async () => {
    const t = await page.locator("#h-pre").locator("xpath=ancestor::section").innerText();
    const n = (t.match(/\+25 %/g) ?? []).length;
    if (n !== 3) throw new Error(`artículos con +25 %: ${n}\n${t.slice(0, 300)}`);
    if (!/Casa Pujol es más barato/.test(t)) throw new Error("no dice cuál es más barato");
  });

  await step("«Ir a este local» cambia de local", async () => {
    await page.locator("table.tbl tbody tr", { hasText: "Casa Pujol Reus" }).getByRole("button", { name: "Ir a este local" }).click();
    await page.waitForURL("**/hoy**");
    const c = (await ctx.cookies()).find((x) => /rs_local$/.test(x.name))?.value;
    if (c !== local2) throw new Error("la cookie no apunta al local elegido");
    await ir("/grupo");
    if (!(await page.locator("table.tbl tbody tr", { hasText: "Casa Pujol Reus" }).getByText("Trabajas aquí").count())) throw new Error("no marca el local actual");
  });

  await step("390 px: una tarjeta por local, sin desbordes, y Más lleva a Grupo", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ir("/grupo");
    if ((await page.locator(".grupo-li").count()) !== 2) throw new Error("tarjetas por local: " + (await page.locator(".grupo-li").count()));
    const ov = await noOverflow(page);
    if (ov.length) throw new Error("desbordamiento: " + ov.join("|"));
    await page.screenshot({ path: `${SHOTS}grupo-390.png` });
    await ir("/mas");
    if (!(await page.locator('a[href="/grupo"]').count())) throw new Error("Más no lleva a Grupo");
    await page.setViewportSize({ width: 1280, height: 860 });
    await ir("/grupo");
    await page.screenshot({ path: `${SHOTS}grupo-1280.png`, fullPage: true });
  });
} finally {
  await b.close();
}
if (errors.length) { console.log("errores de consola:\n" + errors.slice(0, 5).join("\n")); fallos++; }
else console.log("errores: ninguno");
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ todo correcto");
process.exit(fallos ? 1 : 0);
