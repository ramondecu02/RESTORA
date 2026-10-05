// Borrar un albarán guardado: no es un DELETE suelto. Antes de confirmar se enseña qué cambia (stock, precio medio, platos) y,
// si ya hay ventas importadas con coste congelado calculado con esos precios, se obliga a elegir qué hacer con ellas.
// Usa OCR_PROVIDER=mock: el nombre del archivo elige la lectura (albaran-gil → lectura limpia, sin dudas).
import { readFileSync } from "node:fs";
import { BASE, SHOTS, launch, signup, sql, watch } from "./lib.mjs";

const stamp = Date.now();
const errors = [];
const FOTO = readFileSync(new URL("../../public/demo/arroz.webp", import.meta.url));
const b = await launch();
let fallos = 0;
const step = async (page, name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}borrado-fail-${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
};
const cierraTour = async (page) => { for (let i = 0; i < 4; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 3000 }); await n.click(); } catch { break; } } };
const num = (v) => Number(v);
const cerca = (a, b2, tol = 0.0005) => Math.abs(num(a) - num(b2)) <= tol;

/** Sube la lectura limpia de Frutas Hermanos Gil, la guarda y devuelve el id del albarán. */
async function guardarGil(page) {
  await page.goto(BASE + "/compras/subir");
  await page.locator("#f-any").setInputFiles({ name: "albaran-gil.webp", mimeType: "image/webp", buffer: FOTO });
  await page.getByRole("button", { name: /Leer albarán · 1 página/ }).click();
  await page.waitForURL(/\/compras\/[0-9a-f-]{36}$/);
  await page.getByRole("heading", { name: "Revisa el albarán" }).waitFor({ timeout: 40000 });
  await cierraTour(page);
  const guardar = page.getByRole("button", { name: "Confirmar y guardar" });
  await guardar.waitFor();
  if (await guardar.isDisabled()) throw new Error("quedan decisiones por tomar en la lectura limpia");
  await guardar.click();
  // Mismo número del mismo proveedor: «Documento repetido» → guardar igualmente
  try { const rep = page.getByRole("dialog").getByRole("button", { name: "Guardar igualmente" }); await rep.waitFor({ timeout: 2500 }); await rep.click(); } catch { /* no era repetido */ }
  await page.waitForURL(/guardado=1/, { timeout: 20000 });
  return page.url().match(/compras\/([0-9a-f-]{36})/)[1];
}
async function cuenta(email) {
  const [o] = await sql(`select m.org_id as tenant, l.id as local from users u join memberships m on m.user_id = u.id join locales l on l.tenant_id = m.org_id where lower(u.email) = lower($1) limit 1`, [email]);
  return o;
}
/** Un plato con un ingrediente (el primero del albarán) y una importación de ventas hecha ahora, con un coste congelado marcado. */
async function ventasConPrecios({ tenant, local }, docId, plato, fichero, marca) {
  const [a] = await sql(`select a.id, a.unit from compra_lineas cl join articulos a on a.id = cl.articulo_id where cl.documento_id = $1 order by cl.idx limit 1`, [docId]);
  let [r] = await sql("select id from recetas where local_id = $1 and name = $2", [local, plato]);
  if (!r) {
    [r] = await sql(`insert into recetas (tenant_id, local_id, tipo, name, raciones, pvp, estado) values ($1,$2,'plato',$3,1,12,'activo') returning id`, [tenant, local, plato]);
    await sql(`insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, cantidad, unidad) values ($1,$2,0,$3,0.5,$4)`, [tenant, r.id, a.id, a.unit]);
  }
  const [imp] = await sql(`insert into ventas_importes (tenant_id, local_id, fuente, filename, desde, hasta, filas, total) values ($1,$2,'csv',$3,current_date - 6,current_date,1,120) returning id`, [tenant, local, fichero]);
  await sql(`insert into ventas_lineas (tenant_id, local_id, import_id, fecha, nombre, receta_id, unidades, importe, neto, coste_unit, coste_total)
    values ($1,$2,$3,current_date,$4,$5,10,120,109.09,$6,$7)`, [tenant, local, imp.id, plato, r.id, marca, marca * 10]);
  return { receta: r.id, importe: imp.id, articulo: a.id };
}
const costeLinea = async (importId) => num((await sql("select coste_unit from ventas_lineas where import_id = $1", [importId]))[0].coste_unit);
const articulo = async (id) => (await sql("select stock::float as stock, pmp::float as pmp from articulos where id = $1", [id]))[0];
const hayDoc = async (id) => (await sql("select 1 from documentos where id = $1", [id])).length > 0;
/** El borrado es una acción de servidor: se espera a que el albarán desaparezca de la base de datos (la URL puede no cambiar). */
const esperaBorrado = async (id, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (!(await hayDoc(id))) return; await new Promise((r) => setTimeout(r, 250)); } };
/** Abre el borrado, espera a que el servidor calcule el impacto y devuelve el diálogo. */
async function abreBorrado(page, disparador) {
  await disparador.click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("heading", { name: /¿Borrar este albarán\?/ }).waitFor();
  await dlg.getByText(/Calculando qué cambia/).waitFor({ state: "detached", timeout: 20000 });
  return dlg;
}
const confirmarBorrado = (dlg) => dlg.getByRole("button", { name: /^Borrar albarán$/ });

try {
  // ───────── Cuenta 1 (escritorio) ─────────
  const email1 = `borrado+${stamp}@example.com`;
  const ctx1 = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES" });
  const p1 = await ctx1.newPage();
  watch(p1, errors);
  await signup(p1, { email: email1 });
  const org1 = await cuenta(email1);
  let x = null; // artículo del albarán

  await step(p1, "sin ventas: se enseña qué cambia y el albarán se borra desde la pantalla de guardado", async () => {
    const doc = await guardarGil(p1);
    [x] = await sql(`select a.id from compra_lineas cl join articulos a on a.id = cl.articulo_id where cl.documento_id = $1 order by cl.idx limit 1`, [doc]);
    const antes = await articulo(x.id);
    if (!(antes.stock > 0) || !(antes.pmp > 0)) throw new Error("el albarán no dejó stock ni precio medio: " + JSON.stringify(antes));
    const dlg = await abreBorrado(p1, p1.getByRole("button", { name: /Borrar este albarán/ }));
    await p1.screenshot({ path: `${SHOTS}borrado-1280-sin-ventas.png`, fullPage: true });
    if (!(await dlg.getByRole("heading", { name: "Stock y precio medio" }).count())) throw new Error("falta el resumen de stock y precio medio");
    if (await dlg.getByText("Hay ventas que ya usaron estos precios").count()) throw new Error("avisa de ventas que no existen");
    if (await confirmarBorrado(dlg).isDisabled()) throw new Error("el botón de borrar no se habilita sin ventas afectadas");
    // El cálculo es una simulación: no ha tocado nada
    if (!(await hayDoc(doc))) throw new Error("la vista previa borró el albarán");
    const durante = await articulo(x.id);
    if (!cerca(durante.stock, antes.stock) || !cerca(durante.pmp, antes.pmp)) throw new Error("la vista previa cambió el stock o el precio medio");
    await confirmarBorrado(dlg).click();
    await p1.waitForURL(/\/compras$/, { timeout: 20000 });
    if (await hayDoc(doc)) throw new Error("el albarán sigue en la base de datos");
    const despues = await articulo(x.id);
    if (!cerca(despues.stock, 0) || despues.pmp !== null) throw new Error("no se revirtió el stock o el precio medio: " + JSON.stringify(despues));
    const [au] = await sql("select data from audit_log where entity = 'documento' and entity_id = $1 and action = 'borrar'", [doc]);
    if (!au) throw new Error("no quedó anotado en el historial");
  });

  // Una compra anterior fuera de albarán: al borrar el siguiente, el precio medio debe volver a ella
  await sql(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, ref_tipo, fecha, nota) values ($1,$2,$3,'compra',10,1.00,'manual','2026-01-02T12:00:00Z','prueba')`, [org1.tenant, org1.local, x.id]);

  let doc2 = null, doc3 = null, v1 = null, v2 = null;
  await step(p1, "con ventas: hay que elegir, y «dejarlo como está» no toca su coste", async () => {
    doc2 = await guardarGil(p1);
    const antes = await articulo(x.id);
    if (!cerca(antes.stock, 20, 0.01) || !(antes.pmp > 1.0 && antes.pmp < 1.62)) throw new Error("estado previo inesperado: " + JSON.stringify(antes));
    v1 = await ventasConPrecios(org1, doc2, "Plato de prueba", "ventas-prueba.csv", 0.8);
    await p1.goto(BASE + "/compras/" + doc2);
    const dlg = await abreBorrado(p1, p1.getByRole("button", { name: /Borrar albarán/ }));
    await p1.screenshot({ path: `${SHOTS}borrado-1280-ventas.png`, fullPage: true });
    if (!(await dlg.getByText("Hay ventas que ya usaron estos precios").count())) throw new Error("no avisa de las ventas con coste congelado");
    if (!(await dlg.getByText(/ventas-prueba\.csv/).count())) throw new Error("no nombra la importación afectada");
    if (!(await dlg.getByRole("heading", { name: /plato cambia de coste/ }).count())) throw new Error("no cuenta el plato que cambia");
    if (!(await confirmarBorrado(dlg).isDisabled())) throw new Error("se puede borrar sin elegir qué hacer con las ventas");
    await dlg.getByRole("radio", { name: /Dejarlo como está/ }).click();
    if (await confirmarBorrado(dlg).isDisabled()) throw new Error("no se habilita tras elegir");
    await confirmarBorrado(dlg).click();
    await p1.waitForURL(/\/compras$/, { timeout: 20000 });
    if (await hayDoc(doc2)) throw new Error("el albarán sigue en la base de datos");
    const despues = await articulo(x.id);
    if (!cerca(despues.stock, 10, 0.01) || !cerca(despues.pmp, 1.0, 0.001)) throw new Error("no volvió a la compra anterior: " + JSON.stringify(despues));
    if (!cerca(await costeLinea(v1.importe), 0.8)) throw new Error("«dejar» cambió el coste de las ventas");
  });

  await step(p1, "con ventas: «recalcular» solo toca las importaciones posteriores al albarán", async () => {
    doc3 = await guardarGil(p1);
    v2 = await ventasConPrecios(org1, doc3, "Plato de prueba", "ventas-prueba-2.csv", 0.9);
    await p1.goto(BASE + "/compras/" + doc3);
    const dlg = await abreBorrado(p1, p1.getByRole("button", { name: /Borrar albarán/ }));
    if (!(await dlg.getByText(/ventas-prueba-2\.csv/).count())) throw new Error("no nombra la importación posterior");
    if (await dlg.getByText(/ventas-prueba\.csv/).count()) throw new Error("incluye una importación anterior al albarán");
    await dlg.getByRole("radio", { name: /Recalcular su coste/ }).click();
    await confirmarBorrado(dlg).click();
    await p1.waitForURL(/\/compras$/, { timeout: 20000 });
    if (await hayDoc(doc3)) throw new Error("el albarán sigue en la base de datos");
    const [{ c }] = await sql("select coste_cache::float as c from recetas where id = $1", [v2.receta]);
    const nuevo = await costeLinea(v2.importe);
    if (!(c > 0) || !cerca(nuevo, c, 0.0001) || cerca(nuevo, 0.9)) throw new Error(`no se recalculó: línea ${nuevo}, plato ${c}`);
    if (!cerca(await costeLinea(v1.importe), 0.8)) throw new Error("recalculó una importación anterior al albarán");
    await p1.getByText(/se ha recalculado el coste de 1 línea de venta/).waitFor({ timeout: 5000 });
  });
  await ctx1.close();

  // ───────── Cuenta 2 (móvil): un duplicado con los mismos precios no mueve nada ─────────
  const email2 = `borrado2+${stamp}@example.com`;
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "es-ES", isMobile: true, hasTouch: true });
  const p2 = await ctx2.newPage();
  watch(p2, errors);
  await signup(p2, { email: email2 });
  const org2 = await cuenta(email2);
  await step(p2, "duplicado con los mismos precios: no avisa de ventas y se borra desde la lista", async () => {
    const a1 = await guardarGil(p2);
    const a2 = await guardarGil(p2);
    await ventasConPrecios(org2, a2, "Plato de prueba", "ventas-movil.csv", 0.8);
    await p2.goto(BASE + "/compras");
    const antes = await articulo((await sql(`select articulo_id as id from compra_lineas where documento_id = $1 order by idx limit 1`, [a1]))[0].id);
    // El duplicado es el más reciente: sale primero en la lista
    const dlg = await abreBorrado(p2, p2.getByRole("button", { name: "Borrar albarán" }).first());
    await p2.screenshot({ path: `${SHOTS}borrado-390-lista.png`, fullPage: true });
    if (await dlg.getByText("Hay ventas que ya usaron estos precios").count()) throw new Error("avisa de ventas aunque el precio no cambia");
    await confirmarBorrado(dlg).click();
    await esperaBorrado(a2);
    if (!(await hayDoc(a1))) throw new Error("borró el albarán equivocado");
    if (await hayDoc(a2)) throw new Error("el duplicado sigue en la base de datos");
    const despues = await articulo((await sql(`select articulo_id as id from compra_lineas where documento_id = $1 order by idx limit 1`, [a1]))[0].id);
    if (!cerca(despues.stock, antes.stock / 2, 0.01) || !cerca(despues.pmp, antes.pmp, 0.0005)) throw new Error(`stock/PMP tras borrar el duplicado: ${JSON.stringify(antes)} → ${JSON.stringify(despues)}`);
  });
  await ctx2.close();
} finally {
  await b.close();
}
if (errors.length) { console.log("✗ errores en la consola:\n  " + errors.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ borrado de albaranes correcto");
process.exit(fallos ? 1 : 0);
