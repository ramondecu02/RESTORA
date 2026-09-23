// Flujos funcionales sobre la cuenta con datos de ejemplo de recorrido.mjs (REUSE de shots/state.json).
// Cada paso actúa en la interfaz y comprueba el resultado en la base de datos.
import { BASE, SHOTS, launch, sql, watch, tallShot } from "./lib.mjs";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

const STATE = SHOTS + "state.json";
if (!existsSync(STATE)) { console.log("Ejecuta antes recorrido.mjs"); process.exit(1); }
const [org] = await sql("select o.id as tenant, l.id as local from organizations o join locales l on l.tenant_id = o.id order by o.created_at desc limit 1");
const errors = [];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", storageState: STATE });
const page = await ctx.newPage();
watch(page, errors);
let fails = 0;
const vis = (loc) => loc.filter({ visible: true }).first();
async function until(q, params, ok, ms = 8000) {
  const t = Date.now();
  let rows;
  while (Date.now() - t < ms) { rows = await sql(q, params); if (ok(rows)) return rows; await new Promise((r) => setTimeout(r, 250)); }
  throw new Error("La base de datos no refleja el cambio: " + JSON.stringify(rows).slice(0, 200));
}
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); console.log("✓", name, Date.now() - t + "ms"); }
  catch (e) { fails++; console.log("✗", name, "—", e.message.split("\n")[0]); await tallShot(page, `${SHOTS}f-fail-${name.replace(/\W+/g, "_")}.png`).catch(() => {}); }
}
const art = async (name) => (await sql("select id, stock::float as stock from articulos where local_id = $1 and name = $2", [org.local, name]))[0];

await step("inventario: editar stock", async () => {
  await page.goto(BASE + "/inventario");
  const inp = vis(page.getByLabel("Stock de Setas variadas"));
  await inp.fill("12");
  await inp.press("Tab");
  await until("select stock::float as s from articulos where local_id = $1 and name = 'Setas variadas'", [org.local], (r) => r[0]?.s === 12);
});

await step("inventario: preparar y guardar pedido", async () => {
  const antes = (await sql("select count(*)::int as n from pedidos where local_id = $1", [org.local]))[0].n;
  await page.goto(BASE + "/inventario");
  await page.getByRole("button", { name: /Preparar pedido/ }).click();
  await vis(page.getByRole("button", { name: "Guardar pedido" })).click();
  // Un pedido por proveedor
  await until("select count(*)::int as n from pedidos where local_id = $1", [org.local], (r) => r[0].n > antes);
  await page.goto(BASE + "/inventario/pedidos");
  await tallShot(page, `${SHOTS}f-pedidos.png`);
});

await step("escandallo: cambiar cantidad y aceptar", async () => {
  const [rec] = await sql("select id from recetas where local_id = $1 and name = 'Ensalada de temporada'", [org.local]);
  await page.goto(BASE + "/escandallos/" + rec.id);
  const q = vis(page.getByLabel("Cantidad de Burrata"));
  await q.fill("60");
  await page.getByRole("heading", { name: "Valoración del cambio" }).waitFor();
  await tallShot(page, `${SHOTS}f-escandallo-borrador.png`);
  await vis(page.getByRole("button", { name: "Aceptar cambios" })).click();
  await until(`select l.cantidad::float as c from receta_lineas l join articulos a on a.id = l.articulo_id where l.receta_id = $1 and a.name = 'Burrata'`, [rec.id], (r) => r[0]?.c === 60);
});

await step("carta: subir carta de ejemplo", async () => {
  const antes = (await sql("select count(*)::int as n from recetas where local_id = $1 and not archived", [org.local]))[0].n;
  await page.goto(BASE + "/carta/subir");
  await page.getByRole("button", { name: /Probar con una carta de ejemplo/ }).click();
  await page.waitForURL(/\/carta\/subir\/[0-9a-f-]{36}/, { timeout: 30000 });
  await page.getByRole("button", { name: "Guardar en mi carta" }).waitFor({ timeout: 40000 });
  await tallShot(page, `${SHOTS}f-carta-revision.png`);
  await page.getByRole("button", { name: "Guardar en mi carta" }).click();
  await until("select count(*)::int as n from recetas where local_id = $1 and not archived", [org.local], (r) => r[0].n > antes, 15000);
});

await step("ventas: importar CSV", async () => {
  const csv = SHOTS + "ventas-prueba.csv";
  writeFileSync(csv, "Fecha;Producto;Unidades;Importe\n01/09/2026;LUBINA A LA BRASA;12;288,00\n01/09/2026;CREMA CATALANA;20;130,00\n02/09/2026;Lubina a la brasa;9;216,00\n02/09/2026;TOTAL;41;634,00\n");
  const antes = (await sql("select count(*)::int as n from ventas_importes where local_id = $1", [org.local]))[0].n;
  await page.goto(BASE + "/ventas/importar");
  await page.locator("#csv").setInputFiles(csv);
  await page.getByRole("button", { name: "Siguiente: asignar productos" }).click();
  await tallShot(page, `${SHOTS}f-ventas-asignar.png`);
  await page.getByRole("button", { name: /^Importar \d/ }).click();
  await page.getByRole("heading", { name: "Ventas importadas" }).waitFor({ timeout: 15000 });
  await until("select count(*)::int as n from ventas_importes where local_id = $1", [org.local], (r) => r[0].n === antes + 1);
});

await step("compras: borrar un albarán revierte el stock", async () => {
  const [doc] = await sql(`select d.id from documentos d where d.local_id = $1 and d.status = 'guardado' and d.kind = 'albaran' order by d.fecha desc limit 1`, [org.local]);
  const [ln] = await sql(`select a.name, (cl.cantidad * cl.factor)::float as q from compra_lineas cl join articulos a on a.id = cl.articulo_id where cl.documento_id = $1 and a.track_stock limit 1`, [doc.id]);
  const s0 = (await art(ln.name)).stock;
  await page.goto(BASE + "/compras/" + doc.id);
  await page.getByRole("button", { name: /Borrar albarán/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Borrar" }).click();
  await until("select count(*)::int as n from documentos where id = $1", [doc.id], (r) => r[0].n === 0);
  const s1 = (await art(ln.name)).stock;
  if (Math.abs(s0 - ln.q - s1) > 0.001) throw new Error(`Stock de ${ln.name}: ${s0} − ${ln.q} ≠ ${s1}`);
});

let invLink = null;
await step("equipo: invitar a cocina", async () => {
  const email = `cocina+${Date.now()}@example.com`;
  await page.goto(BASE + "/cuenta/usuarios");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("radio", { name: /Cocina/ }).check();
  await page.getByRole("button", { name: /Enviar invitación/ }).click();
  const rows = await until("select body_text from outbox_emails where lower(to_email) = lower($1) order by created_at desc limit 1", [email], (r) => r.length > 0);
  invLink = rows[0].body_text.match(/https?:\/\/\S+\/invitacion\/[A-Za-z0-9_-]+/)?.[0];
  if (!invLink) throw new Error("No hay enlace en el email");
});

await step("equipo: aceptar invitación y ver permisos de cocina", async () => {
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "es-ES", isMobile: true, hasTouch: true });
  const p2 = await c2.newPage();
  watch(p2, errors);
  await p2.goto(invLink.replace(/^https?:\/\/[^/]+/, BASE));
  await p2.getByLabel("Tu nombre").fill("Jordi Cocina");
  await p2.getByLabel("Crea una contraseña").fill("cocina-segura-2026");
  await p2.getByRole("checkbox").check();
  await p2.getByRole("button", { name: "Aceptar la invitación" }).click();
  await p2.waitForURL(/\/hoy/, { timeout: 20000 });
  await tallShot(p2, `${SHOTS}f-cocina-hoy.png`);
  const r = await p2.goto(BASE + "/ventas");
  if (p2.url().includes("/ventas")) throw new Error("Cocina puede ver ventas (" + r.status() + ")");
  await p2.goto(BASE + "/cuenta/usuarios");
  if (p2.url().includes("/cuenta/usuarios")) throw new Error("Cocina puede gestionar usuarios");
  await c2.close();
});

await step("demo: quitar datos de ejemplo conserva lo tuyo", async () => {
  await page.goto(BASE + "/cuenta");
  await page.getByRole("button", { name: "Quitar datos de ejemplo" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar" }).click();
  await until("select count(*)::int as n from proveedores where local_id = $1 and demo", [org.local], (r) => r[0].n === 0, 15000);
  const [x] = await sql("select (select count(*) from recetas where local_id = $1 and demo)::int as rd, (select count(*) from recetas where local_id = $1 and not demo)::int as ru, (select count(*) from documentos where local_id = $1 and demo)::int as dd", [org.local]);
  if (x.rd !== 0 || x.dd !== 0) throw new Error("Quedan datos de ejemplo: " + JSON.stringify(x));
  if (x.ru === 0) throw new Error("Se han borrado también los platos creados por el usuario");
  await page.goto(BASE + "/hoy");
  await tallShot(page, `${SHOTS}f-hoy-sin-demo.png`);
});

await step("cuenta: eliminar el negocio borra todo", async () => {
  // Otra vez con datos de ejemplo, para que haya recetas con sub-recetas, compras y ventas
  await page.goto(BASE + "/cuenta");
  await page.getByRole("button", { name: "Cargar datos de ejemplo" }).click();
  await page.getByText("Cargados", { exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: /Eliminar negocio/ }).click();
  await page.getByLabel(/Escribe «Casa Pujol»/).fill("Casa Pujol");
  await page.getByRole("button", { name: "Eliminar para siempre" }).click();
  await page.waitForURL(/sin-negocio/, { timeout: 20000 });
  const [x] = await sql(`select (select count(*) from organizations where id = $1)::int as o, (select count(*) from articulos where tenant_id = $1)::int as a,
    (select count(*) from recetas where tenant_id = $1)::int as r, (select count(*) from documentos where tenant_id = $1)::int as d, (select count(*) from ventas_lineas where tenant_id = $1)::int as v`, [org.tenant]);
  if (x.o + x.a + x.r + x.d + x.v) throw new Error("Quedan datos: " + JSON.stringify(x));
  unlinkSync(STATE); // la sesión guardada ya no tiene negocio
});

console.log(fails ? `\n${fails} flujos fallidos` : "\nTodos los flujos correctos");
console.log("errores:", errors.length ? errors : "ninguno");
await b.close();
process.exit(fails ? 1 : 0);
