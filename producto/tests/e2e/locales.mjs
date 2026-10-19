// Varios locales por negocio: el plan marca el tope (Premium 1, Pro 2, Max 5), cada local ve solo lo suyo (proveedores, artículos, platos, compras,
// avisos y contadores del menú), el local elegido solo vale si es de tu negocio y el nombre del negocio no cambia al renombrar el segundo local.
import { BASE, SHOTS, launch, signup, cargarDemo, noOverflow, sql, watch, accionesDelServidor, llamarAccion } from "./lib.mjs";

const email = `locales+${Date.now()}@example.com`;
const errors = [];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
const page = await ctx.newPage();
watch(page, errors);
let fallos = 0;
const step = async (name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}locales-fail-${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
};
const ir = async (ruta, espera = 500) => { await page.goto(BASE + ruta, { waitUntil: "networkidle" }); await page.waitForTimeout(espera); };
const texto = () => page.locator(".main").innerText();
const cookieLocal = async () => (await ctx.cookies()).find((c) => /rs_local$/.test(c.name))?.value ?? null;

try {
  await signup(page, { email });
  await cargarDemo(page);
  const [{ id: org }] = await sql("select o.id from organizations o join memberships m on m.org_id = o.id join users u on u.id = m.user_id where lower(u.email) = lower($1)", [email]);
  await sql(`update users set prefs = jsonb_set(coalesce(prefs, '{}'::jsonb), '{seen}', '{"hoy":true,"validacion":true,"compras":true,"escandallos":true,"carta":true,"inventario":true}'::jsonb) where lower(email) = lower($1)`, [email]);
  const [{ id: local1, name: nombreOrg }] = await sql("select l.id, o.name from locales l join organizations o on o.id = l.tenant_id where l.tenant_id = $1", [org]);
  // Nombres de lo que tiene el local 1: no pueden salir en el local 2
  const nombres = async (tabla) => (await sql(`select name from ${tabla} where local_id = $1 and not archived order by name limit 6`, [local1])).map((r) => r.name);
  const delLocal1 = [...(await nombres("proveedores")), ...(await nombres("articulos")), ...(await nombres("recetas"))];

  await step("con la prueba (un local) Mi local lo dice y no deja añadir", async () => {
    await ir("/cuenta");
    const t = await page.locator("#locales").innerText();
    if (!/1 de 1/.test(t) || !/un solo local/i.test(t)) throw new Error("tarjeta: " + t.replace(/\s+/g, " ").slice(0, 160));
    if (await page.locator("#nl-n").count()) throw new Error("sale el formulario de alta con un plan de un local");
    if (await page.locator(".side-loc").count()) throw new Error("sale el selector con un solo local");
  });

  await sql("update organizations set plan_tier = 'pro', plan_interval = 'month', plan_status = 'active' where id = $1", [org]);
  await step("con Pro se puede añadir un segundo local y se pasa a trabajar en él", async () => {
    await ir("/cuenta");
    await page.locator("#nl-n").fill("Casa Pujol Reus");
    await page.getByRole("button", { name: "Añadir local" }).click();
    await page.getByText(/Local «Casa Pujol Reus» creado/).waitFor();
    await page.waitForTimeout(800);
    const ls = await sql("select id, name, iva_venta, ciudad from locales where tenant_id = $1 order by created_at", [org]);
    if (ls.length !== 2) throw new Error("locales en la base: " + ls.length);
    if (ls[1].name !== "Casa Pujol Reus" || ls[1].ciudad !== "Tarragona") throw new Error("el nuevo local no hereda la ciudad: " + JSON.stringify(ls[1]));
    if ((await cookieLocal()) !== ls[1].id) throw new Error("la cookie no apunta al local nuevo");
    await ir("/hoy");
    if (!(await page.locator(".side-loc summary").innerText()).includes("Casa Pujol Reus")) throw new Error("el selector no muestra el local nuevo");
  });

  await step("el local nuevo está vacío: ninguna pantalla enseña lo del primero", async () => {
    for (const r of ["/hoy", "/compras", "/articulos", "/escandallos", "/carta", "/proveedores", "/inventario", "/ventas", "/hoy/avisos", "/escandallos/elaboraciones"]) {
      await ir(r, 400);
      const t = await texto();
      const cuela = delLocal1.filter((n) => t.includes(n));
      if (cuela.length) throw new Error(`${r} enseña datos del otro local: ${cuela.slice(0, 3).join(", ")}`);
    }
    await ir("/hoy");
    const badges = await page.locator(".side .badge").allInnerTexts();
    if (badges.length) throw new Error("contadores del menú con un local vacío: " + badges.join(","));
  });

  await step("lo que se crea en un local no sale en el otro", async () => {
    const [{ id: local2 }] = await sql("select id from locales where tenant_id = $1 order by created_at desc limit 1", [org]);
    await sql("insert into proveedores (tenant_id, local_id, name) values ($1, $2, 'Proveedor solo del segundo')", [org, local2]);
    await ir("/proveedores");
    if (!(await texto()).includes("Proveedor solo del segundo")) throw new Error("no sale en su local");
    await page.locator(".side-loc summary").click();
    await page.locator(".side-loc-i", { hasText: new RegExp("^" + nombreOrg + "$") }).click();
    await page.waitForURL("**/hoy**");
    await ir("/proveedores");
    const t = await texto();
    if (t.includes("Proveedor solo del segundo")) throw new Error("sale en el primer local");
    if (!delLocal1.some((n) => t.includes(n))) throw new Error("el primer local ya no enseña lo suyo");
    if ((await cookieLocal()) !== local1) throw new Error("la cookie no vuelve al primer local");
  });

  await step("al renombrar el segundo local el negocio conserva su nombre", async () => {
    await page.locator(".side-loc summary").click();
    await page.locator(".side-loc-i", { hasText: /^Casa Pujol Reus$/ }).click();
    await page.waitForURL("**/hoy**");
    await ir("/cuenta");
    await page.locator("#lc-name").fill("Casa Pujol Reus Centro");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await page.getByText("Local guardado").waitFor();
    const [o] = await sql("select name from organizations where id = $1", [org]);
    if (o.name !== nombreOrg) throw new Error(`el negocio pasó a llamarse «${o.name}»`);
    const [l] = await sql("select name from locales where id = (select id from locales where tenant_id = $1 order by created_at desc limit 1)", [org]);
    if (l.name !== "Casa Pujol Reus Centro") throw new Error("el local no se renombró: " + l.name);
  });

  await step("con Pro no hay un tercer local: el formulario desaparece y la acción lo rechaza", async () => {
    await ir("/cuenta");
    if (await page.locator("#nl-n").count()) throw new Error("sigue el formulario con 2 de 2");
    if (!/2 de 2/.test(await page.locator("#locales").innerText())) throw new Error("no dice 2 de 2");
    const acciones = accionesDelServidor();
    if (!acciones) return console.log("  (sin compilación local: se salta la llamada directa a la acción)");
    const r = await llamarAccion(ctx.request ?? page.request, acciones.get("(app)/cuenta/actions.ts#crearLocal"), ["Tercero"], "/cuenta");
    if (r.resultado?.ok !== false || !/hasta 2 locales/.test(r.resultado?.error ?? "")) throw new Error("no lo rechaza: " + JSON.stringify(r.resultado));
    const [{ n }] = await sql("select count(*)::int as n from locales where tenant_id = $1", [org]);
    if (n !== 2) throw new Error("hay " + n + " locales");
  });

  await step("dos altas a la vez no pasan del tope", async () => {
    await sql("update organizations set plan_tier = 'max' where id = $1", [org]);
    await sql("delete from locales where tenant_id = $1 and id <> $2 and created_at > (select min(created_at) from locales where tenant_id = $1)", [org, local1]);
    const acciones = accionesDelServidor();
    if (!acciones) return;
    await sql("update organizations set plan_tier = 'pro' where id = $1", [org]);
    const a = acciones.get("(app)/cuenta/actions.ts#crearLocal");
    const rs = await Promise.all([1, 2, 3, 4].map((i) => llamarAccion(page.request, a, ["Simultáneo " + i], "/cuenta")));
    const oks = rs.filter((r) => r.resultado?.ok).length;
    const [{ n }] = await sql("select count(*)::int as n from locales where tenant_id = $1", [org]);
    if (n > 2 || oks !== 1) throw new Error(`${oks} altas correctas y ${n} locales con tope 2`);
  });

  await step("un local de otro negocio en la cookie no sirve: se vuelve al primero", async () => {
    const [ajeno] = await sql("select id from locales where tenant_id <> $1 limit 1", [org]);
    if (!ajeno) return console.log("  (no hay otro negocio en la base)");
    const url = new URL(BASE);
    await ctx.addCookies([{ name: (await ctx.cookies()).find((c) => /rs_local$/.test(c.name))?.name ?? "rs_local", value: ajeno.id, domain: url.hostname, path: "/" }]);
    await ir("/hoy");
    if (!(await page.locator(".side-loc summary").innerText()).includes(nombreOrg)) throw new Error("no volvió al primer local");
    const t = await texto();
    if (!delLocal1.some((n) => t.includes(n)) && !/Hola/.test(t)) throw new Error("la pantalla no carga con el primer local");
  });

  await step("390 px: Más permite cambiar de local y sin desbordes", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ir("/mas");
    const card = page.locator("#locales");
    if (!(await card.count())) throw new Error("Más no enseña los locales");
    const ov = await noOverflow(page);
    if (ov.length) throw new Error("desbordamiento: " + ov.join("|"));
    await card.locator("button.more-i").first().click();
    await page.waitForURL("**/hoy**");
    await page.screenshot({ path: `${SHOTS}locales-390.png` });
    await page.setViewportSize({ width: 1280, height: 860 });
    await ir("/cuenta");
    await page.screenshot({ path: `${SHOTS}locales-1280.png`, fullPage: true });
  });
} finally {
  await b.close();
}
if (errors.length) { console.log("errores de consola:\n" + errors.slice(0, 5).join("\n")); fallos++; }
else console.log("errores: ninguno");
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ todo correcto");
process.exit(fallos ? 1 : 0);
