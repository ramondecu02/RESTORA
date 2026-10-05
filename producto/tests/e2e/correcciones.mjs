// Corregir y borrar: lo que se introduce se puede quitar, siempre con confirmación, y lo que está en uso lo dice en vez de romper nada.
// Cada paso actúa en la interfaz y comprueba el resultado en la base de datos. Cuenta nueva con los datos de ejemplo.
// (Los albaranes, los datos de ejemplo y el negocio entero ya los cubren borrado.mjs y flujos.mjs.)
import { BASE, SHOTS, launch, sql, watch, tallShot, negocioDeEjemplo } from "./lib.mjs";
import { writeFileSync } from "node:fs";

const errors = [];
const b = await launch();
const state = await negocioDeEjemplo(b, "correcciones");
const [org] = await sql("select o.id as tenant, l.id as local from organizations o join locales l on l.tenant_id = o.id order by o.created_at desc limit 1");
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", storageState: state });
const page = await ctx.newPage();
watch(page, errors);
let fails = 0;
const vis = (loc) => loc.filter({ visible: true }).first();
const sufijo = () => String(Date.now() % 100000);
async function until(q, params, ok, ms = 8000) {
  const t = Date.now();
  let rows;
  while (Date.now() - t < ms) { rows = await sql(q, params); if (ok(rows)) return rows; await new Promise((r) => setTimeout(r, 250)); }
  throw new Error("La base de datos no refleja el cambio: " + JSON.stringify(rows).slice(0, 200));
}
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); console.log("✓", name, Date.now() - t + "ms"); }
  catch (e) { fails++; console.log("✗", name, "—", e.message.split("\n")[0]); await tallShot(page, `${SHOTS}c-fail-${name.replace(/\W+/g, "_")}.png`).catch(() => {}); }
}
/** Pulsa el botón de confirmación de la hoja abierta (la hoja se llama como su pregunta). */
const confirmar = async (pregunta, boton) => {
  const dlg = page.getByRole("dialog", { name: pregunta });
  await dlg.waitFor();
  await dlg.getByRole("button", { name: boton, exact: true }).click();
};
const avisoMalo = (texto) => page.locator(".toast.bad").filter({ hasText: texto }).waitFor({ timeout: 8000 });

await step("proveedor con albaranes: no se puede eliminar y dice por qué", async () => {
  const [p] = await sql("select p.id from proveedores p where p.local_id = $1 and exists (select 1 from documentos d where d.proveedor_id = p.id) order by p.name limit 1", [org.local]);
  await page.goto(BASE + "/proveedores/" + p.id);
  await vis(page.getByRole("button", { name: "Eliminar" })).click();
  await confirmar(/¿Eliminar/, "Eliminar");
  await avisoMalo(/no se puede borrar/i);
  if ((await sql("select count(*)::int as n from proveedores where id = $1", [p.id]))[0].n !== 1) throw new Error("se ha eliminado un proveedor con albaranes");
});

await step("proveedor nuevo: se crea y se elimina", async () => {
  const nombre = "Proveedor de prueba " + sufijo();
  await page.goto(BASE + "/proveedores");
  await vis(page.getByRole("button", { name: "Proveedor", exact: true })).click();
  await page.getByLabel("Nombre comercial *").fill(nombre);
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForURL(/\/proveedores\/[0-9a-f-]{36}$/, { timeout: 10000 });
  await until("select count(*)::int as n from proveedores where local_id = $1 and name = $2", [org.local, nombre], (r) => r[0].n === 1);
  await vis(page.getByRole("button", { name: "Eliminar" })).click();
  await confirmar(/¿Eliminar/, "Eliminar");
  await page.waitForURL((u) => u.pathname === "/proveedores", { timeout: 10000 });
  await until("select count(*)::int as n from proveedores where local_id = $1 and name = $2", [org.local, nombre], (r) => r[0].n === 0);
});

await step("artículo usado en un plato: no se puede borrar y dice en cuál", async () => {
  const [a] = await sql(`select a.id from articulos a where a.local_id = $1 and not a.archived
    and exists (select 1 from receta_lineas l join recetas r on r.id = l.receta_id where l.articulo_id = a.id and not r.archived) order by a.name limit 1`, [org.local]);
  await page.goto(BASE + "/articulos/" + a.id);
  await vis(page.getByRole("button", { name: /Borrar de mi lista/ })).click();
  await confirmar(/¿Borrar este artículo/, "Borrar");
  await avisoMalo(/Se usa en/);
  if ((await sql("select archived from articulos where id = $1", [a.id]))[0].archived) throw new Error("se ha borrado un artículo que está en un plato");
});

await step("artículo nuevo: se crea y se borra de la lista", async () => {
  const nombre = "Artículo de prueba " + sufijo();
  await page.goto(BASE + "/articulos/nuevo");
  await page.locator("#n-name").fill(nombre);
  await page.getByRole("button", { name: "Crear artículo" }).click();
  await page.waitForURL(/\/articulos\/[0-9a-f-]{36}$/, { timeout: 10000 });
  await vis(page.getByRole("button", { name: /Borrar de mi lista/ })).click();
  await confirmar(/¿Borrar este artículo/, "Borrar");
  await page.waitForURL((u) => u.pathname === "/articulos", { timeout: 10000 });
  await until("select archived from articulos where local_id = $1 and name = $2", [org.local, nombre], (r) => r[0]?.archived === true);
});

await step("plato: se duplica y la copia se borra sin tocar el original", async () => {
  const [rec] = await sql("select id from recetas where local_id = $1 and name = 'Ensalada de temporada' and not archived", [org.local]);
  await page.goto(BASE + "/escandallos/" + rec.id);
  await vis(page.getByRole("button", { name: "Duplicar" })).click();
  await page.waitForURL((u) => /^\/escandallos\/[0-9a-f-]{36}$/.test(u.pathname) && !u.pathname.endsWith(rec.id), { timeout: 10000 });
  await page.getByRole("heading", { name: /\(copia\)/ }).first().waitFor();
  await vis(page.getByRole("button", { name: "Borrar" })).click();
  await confirmar(/¿Borrar/, "Borrar");
  await page.waitForURL((u) => u.pathname === "/escandallos", { timeout: 10000 });
  const [x] = await sql("select (select archived from recetas where local_id = $1 and name = 'Ensalada de temporada (copia)') as copia, (select archived from recetas where id = $2) as original", [org.local, rec.id]);
  if (x.copia !== true) throw new Error("la copia no queda borrada");
  if (x.original !== false) throw new Error("se ha tocado el plato original");
});

await step("elaboración usada por un plato: no se puede borrar y dice en cuál", async () => {
  const [r] = await sql(`select r.id from recetas r where r.local_id = $1 and not r.archived
    and exists (select 1 from receta_lineas l join recetas p on p.id = l.receta_id where l.subreceta_id = r.id and not p.archived) order by r.name limit 1`, [org.local]);
  await page.goto(BASE + "/escandallos/" + r.id);
  await vis(page.getByRole("button", { name: "Borrar" })).click();
  await confirmar(/¿Borrar/, "Borrar");
  await avisoMalo(/Se usa en/);
  if ((await sql("select archived from recetas where id = $1", [r.id]))[0].archived) throw new Error("se ha borrado una elaboración que usa un plato");
});

await step("inventario: quitar una referencia pide confirmar y la deja fuera", async () => {
  const [a] = await sql("select id, name from articulos where local_id = $1 and track_stock and not archived order by name limit 1", [org.local]);
  await page.goto(BASE + "/inventario");
  await vis(page.getByRole("button", { name: `Quitar ${a.name} del inventario` })).click();
  await confirmar(/del inventario\?/, "Quitar");
  await until("select track_stock from articulos where id = $1", [a.id], (r) => r[0].track_stock === false);
  if ((await sql("select archived from articulos where id = $1", [a.id]))[0].archived) throw new Error("quitar del inventario no debe borrar el artículo");
});

await step("ventas: borrar una importación pide confirmar y devuelve el stock", async () => {
  const csv = SHOTS + "ventas-correcciones.csv";
  writeFileSync(csv, "Fecha;Producto;Unidades;Importe\n01/09/2026;LUBINA A LA BRASA;12;288,00\n02/09/2026;CREMA CATALANA;20;130,00\n");
  const antes = (await sql("select count(*)::int as n from ventas_importes where local_id = $1", [org.local]))[0].n;
  const stock = async () => (await sql("select coalesce(sum(stock), 0)::float as s from articulos where local_id = $1 and track_stock and not archived", [org.local]))[0].s;
  const stockAntes = await stock();
  await page.goto(BASE + "/ventas/importar");
  await page.locator("#csv").setInputFiles(csv);
  await page.getByRole("button", { name: "Siguiente: asignar productos" }).click();
  await page.getByRole("button", { name: /^Importar \d/ }).click();
  await page.getByRole("heading", { name: "Ventas importadas" }).waitFor({ timeout: 15000 });
  const [nuevo] = await until("select id from ventas_importes where local_id = $1 order by created_at desc limit 1", [org.local], (r) => r.length > 0);
  if ((await sql("select count(*)::int as n from ventas_importes where local_id = $1", [org.local]))[0].n !== antes + 1) throw new Error("no se ha creado la importación");
  const stockTras = await stock();
  if (Math.abs(stockTras - stockAntes) < 1e-6) throw new Error("la importación no ha descontado stock: la prueba no demostraría nada");
  await page.goto(BASE + "/ventas");
  await vis(page.getByRole("button", { name: "Borrar importación" })).click();
  await confirmar(/¿Borrar esta importación/, "Borrar");
  await until("select count(*)::int as n from ventas_importes where id = $1", [nuevo.id], (r) => r[0].n === 0);
  const stockDespues = await stock();
  if (Math.abs(stockDespues - stockAntes) > 1e-6) throw new Error(`el stock no vuelve a como estaba: ${stockAntes} → ${stockTras} → ${stockDespues}`);
});

await step("documento por revisar: descartar lo borra y no guarda ninguna compra", async () => {
  const antes = (await sql("select count(*)::int as n from documentos where local_id = $1", [org.local]))[0].n;
  await page.goto(BASE + "/compras/subir");
  await page.getByRole("button", { name: /Probar con un albarán de ejemplo/ }).click();
  await page.waitForURL(/\/compras\/[0-9a-f-]{36}/, { timeout: 30000 });
  const descartar = page.getByRole("button", { name: "Descartar", exact: true });
  await descartar.waitFor({ timeout: 40000 });
  await descartar.click();
  await confirmar(/¿Descartar el documento/, "Descartar");
  await page.waitForURL((u) => u.pathname === "/compras", { timeout: 15000 });
  await until("select count(*)::int as n from documentos where local_id = $1", [org.local], (r) => r[0].n === antes);
});

await step("cotización: se añade y se quita con confirmación", async () => {
  const [a] = await sql("select a.id from articulos a where a.local_id = $1 and not a.archived and exists (select 1 from articulo_proveedor ap where ap.articulo_id = a.id and ap.precio_unit is not null) order by a.name limit 1", [org.local]);
  const prov = "Proveedor cotizado " + sufijo();
  await page.goto(BASE + "/articulos/" + a.id);
  await vis(page.getByRole("button", { name: "Añadir precio" })).click();
  await page.locator("#c-n").fill(prov);
  await page.locator("#c-pr").fill("1,23");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar precio" }).click();
  await until("select count(*)::int as n from articulo_proveedor ap join proveedores p on p.id = ap.proveedor_id where ap.articulo_id = $1 and p.name = $2 and ap.origen = 'cotizacion'", [a.id, prov], (r) => r[0].n === 1);
  await page.goto(BASE + "/articulos/" + a.id);
  await vis(page.getByRole("button", { name: `Quitar precio de ${prov}` })).click();
  await confirmar(/¿Quitar el precio de/, "Quitar");
  await until("select count(*)::int as n from articulo_proveedor ap join proveedores p on p.id = ap.proveedor_id where ap.articulo_id = $1 and p.name = $2", [a.id, prov], (r) => r[0].n === 0);
});

await step("equipo: anular una invitación y quitar a un miembro cierra su sesión", async () => {
  // Una invitación que se anula
  const anulada = `anulada+${Date.now()}@example.com`;
  await page.goto(BASE + "/cuenta/usuarios");
  await page.getByLabel("Email").fill(anulada);
  await page.getByRole("button", { name: /Enviar invitación/ }).click();
  await until("select count(*)::int as n from invitations where lower(email) = lower($1)", [anulada], (r) => r[0].n === 1);
  await page.goto(BASE + "/cuenta/usuarios");
  await vis(page.locator(".li", { hasText: anulada }).getByRole("button", { name: "Anular" })).click();
  await until("select count(*)::int as n from invitations where lower(email) = lower($1)", [anulada], (r) => r[0].n === 0);

  // Un miembro que entra y luego se quita: pierde el acceso al momento
  const email = `cocina+${Date.now()}@example.com`;
  await page.goto(BASE + "/cuenta/usuarios");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("radio", { name: /Cocina/ }).check();
  await page.getByRole("button", { name: /Enviar invitación/ }).click();
  const rows = await until("select body_text from outbox_emails where lower(to_email) = lower($1) order by created_at desc limit 1", [email], (r) => r.length > 0);
  const link = rows[0].body_text.match(/https?:\/\/\S+\/invitacion\/[A-Za-z0-9_-]+/)?.[0];
  if (!link) throw new Error("No hay enlace en el email");
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "es-ES", isMobile: true, hasTouch: true });
  const p2 = await c2.newPage();
  watch(p2, errors);
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
  await p2.getByLabel("Tu nombre").fill("Jordi Cocina");
  await p2.getByLabel("Crea una contraseña").fill("cocina-segura-2026");
  await p2.getByRole("checkbox").check();
  await p2.getByRole("button", { name: "Aceptar la invitación" }).click();
  await p2.waitForURL(/\/hoy/, { timeout: 20000 });
  await page.goto(BASE + "/cuenta/usuarios");
  await vis(page.getByRole("button", { name: "Quitar a Jordi Cocina" })).click();
  await confirmar(/¿Quitar a Jordi Cocina/, "Quitar");
  await until("select count(*)::int as n from memberships m join users u on u.id = m.user_id where lower(u.email) = lower($1) and m.org_id = $2", [email, org.tenant], (r) => r[0].n === 0);
  await p2.goto(BASE + "/hoy");
  if (p2.url().includes("/hoy")) throw new Error("El miembro quitado sigue dentro de la app");
  await c2.close();
});

console.log(fails ? `\n✗ ${fails} pasos con fallos` : "\nTodas las correcciones y borrados correctos");
console.log("errores:", errors.length ? errors.slice(0, 10) : "ninguno");
if (errors.length) fails++;
await b.close();
process.exit(fails ? 1 : 0);
