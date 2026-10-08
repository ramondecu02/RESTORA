// Prueba gratuita y bloqueo: 14 días de prueba; al terminar (o con la suscripción cancelada) la app manda a /bloqueado
// y solo quedan la cuenta, la facturación y salir. Se comprueba en la interfaz y en la API de subida. Al final, el tope mensual de lecturas con IA.
import { BASE, SHOTS, launch, signup, sql, watch } from "./lib.mjs";

const email = `plan+${Date.now()}@example.com`;
const errors = [];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
const page = await ctx.newPage();
watch(page, errors);
let fallos = 0;
const step = async (name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}plan-fail-${name.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
};
const ruta = () => new URL(page.url()).pathname;
const org = async () => (await sql("select o.id from organizations o join memberships m on m.org_id = o.id join users u on u.id = m.user_id where lower(u.email) = lower($1)", [email]))[0].id;
const subir = () => page.request.post(BASE + "/api/documentos", { multipart: { kind: "albaran", files: { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%prueba\n") } } });

try {
  await signup(page, { email });
  const id = await org();

  await step("la prueba dura 14 días", async () => {
    const [r] = await sql("select round(extract(epoch from (trial_ends_at - created_at)) / 86400) as dias, plan_status from organizations where id = $1", [id]);
    if (Number(r.dias) !== 14 || r.plan_status !== "trial") throw new Error(`prueba de ${r.dias} días (${r.plan_status})`);
  });
  await step("durante la prueba la app funciona", async () => {
    await page.goto(BASE + "/compras");
    if (ruta() !== "/compras") throw new Error("ha ido a " + ruta());
  });
  await step("/bloqueado sin estar bloqueado vuelve a Hoy", async () => {
    await page.goto(BASE + "/bloqueado");
    await page.waitForURL("**/hoy**");
  });

  await sql("update organizations set trial_ends_at = now() - interval '1 minute' where id = $1", [id]);
  await step("con la prueba terminada, Hoy y Compras mandan a /bloqueado", async () => {
    for (const p of ["/hoy", "/compras", "/escandallos"]) {
      await page.goto(BASE + p);
      if (ruta() !== "/bloqueado") throw new Error(`${p} → ${ruta()}`);
    }
    await page.getByRole("heading", { name: "Tu prueba gratuita ha terminado" }).waitFor();
    await page.getByRole("link", { name: /WhatsApp/ }).waitFor(); // sin Stripe: contacto para activar
    await page.screenshot({ path: `${SHOTS}plan-bloqueado.png` });
  });
  await step("la cuenta y la facturación siguen abiertas", async () => {
    await page.goto(BASE + "/cuenta");
    if (ruta() !== "/cuenta") throw new Error("cuenta → " + ruta());
    await page.getByText("Tu prueba gratuita ha terminado. Aquí puedes descargar tus datos").waitFor();
    await page.getByRole("link", { name: "Compras" }).first().waitFor(); // botones de exportar
    await page.goto(BASE + "/cuenta/facturacion");
    if (ruta() !== "/cuenta/facturacion") throw new Error("facturación → " + ruta());
    await page.getByText("Tu prueba ha terminado. Suscríbete para seguir usando RESTORA").waitFor();
  });
  await step("la API de subida responde 402", async () => {
    const r = await subir();
    if (r.status() !== 402) throw new Error("estado " + r.status());
  });
  await step("exportar los datos sigue funcionando", async () => {
    const r = await page.request.get(BASE + "/api/exportar/compras");
    if (r.status() !== 200) throw new Error("estado " + r.status());
  });

  await sql("update organizations set plan_status = 'active' where id = $1", [id]);
  await step("con la suscripción activa vuelve a funcionar", async () => {
    await page.goto(BASE + "/compras");
    if (ruta() !== "/compras") throw new Error("ha ido a " + ruta());
    const r = await subir();
    if (r.status() === 402) throw new Error("la subida sigue bloqueada");
  });

  // Impago: avisa desde el primer día y bloquea a los 5 días
  await sql("update organizations set plan_status = 'past_due', past_due_since = now() - interval '2 days' where id = $1", [id]);
  await step("con 2 días de impago la app funciona y avisa de los días que quedan", async () => {
    await page.goto(BASE + "/compras");
    if (ruta() !== "/compras") throw new Error("ha ido a " + ruta());
    await page.getByText(/No hemos podido cobrar tu suscripción\. Tienes 3 días para actualizar el pago/).waitFor();
  });
  await sql("update organizations set past_due_since = now() - interval '6 days' where id = $1", [id]);
  await step("con 5 días de impago, Hoy y Compras mandan a /bloqueado, que habla de pagar y no de suscribirse", async () => {
    for (const p of ["/hoy", "/compras", "/escandallos"]) {
      await page.goto(BASE + p);
      if (ruta() !== "/bloqueado") throw new Error(`${p} → ${ruta()}`);
    }
    await page.getByRole("heading", { name: "No hemos podido cobrar tu suscripción" }).waitFor();
    if (await page.getByText("Tu prueba gratuita ha terminado").count()) throw new Error("habla de la prueba en vez del impago");
  });
  await step("con 5 días de impago la facturación y la API de subida se comportan como en un bloqueo", async () => {
    await page.goto(BASE + "/cuenta/facturacion");
    if (ruta() !== "/cuenta/facturacion") throw new Error("facturación → " + ruta());
    const r = await subir();
    if (r.status() !== 402) throw new Error("subida: estado " + r.status());
  });
  await sql("update organizations set plan_status = 'active', past_due_since = null where id = $1", [id]);
  await step("al pagar, vuelve a funcionar", async () => {
    await page.goto(BASE + "/hoy");
    if (ruta() !== "/hoy") throw new Error("ha ido a " + ruta());
  });

  // ── Cupo mensual de lecturas con IA del plan (el negocio está activo sin plan guardado: cuenta como Premium, 80): se llena el mes con lecturas de mentira ──
  const [{ local }] = await sql("select id as local from locales where tenant_id = $1 limit 1", [id]);
  const MARCA = "prueba-tope";
  await sql(`insert into documentos (tenant_id, local_id, kind, status, source, ocr_model, pages) select $1, $2, 'albaran', 'guardado', 'ocr', $3, 1 from generate_series(1, 80)`, [id, local, MARCA]);
  const MENSAJE = /Has llegado al cupo de lecturas automáticas de tu plan Premium \(80\)\. Puedes seguir apuntando a mano tus albaranes y tus platos\. Cambia de plan en Facturación para tener más lecturas, o escribe a hola@restoraapp\.com/;
  await step("con el tope de lecturas alcanzado, la pantalla de subida lo explica, enseña el correo y ofrece apuntar a mano", async () => {
    await page.goto(BASE + "/compras/subir");
    await page.getByText(MENSAJE).waitFor();
    if (await page.locator("#f-any").count()) throw new Error("sigue el formulario de subida");
    if ((await page.getByRole("link", { name: "hola@restoraapp.com" }).getAttribute("href"))?.startsWith("mailto:hola@restoraapp.com") !== true) throw new Error("el correo no es un enlace");
    if (!(await page.getByRole("link", { name: "Ver planes y ampliar" }).getAttribute("href"))?.endsWith("/cuenta/facturacion")) throw new Error("no ofrece ver los planes");
    await page.screenshot({ path: `${SHOTS}plan-tope-lecturas.png` });
    await page.getByRole("link", { name: "Apuntar una compra a mano" }).click();
    await page.waitForURL("**/compras/nueva");
  });
  await step("con el tope alcanzado, apuntar a mano sigue funcionando", async () => {
    await page.goto(BASE + "/compras/nueva");
    await page.getByRole("button", { name: "Empezar" }).click();
    await page.waitForURL(/\/compras\/[0-9a-f-]{36}$/, { timeout: 15000 });
    const [d] = await sql("select source, status from documentos where id = $1", [page.url().match(/compras\/([0-9a-f-]{36})/)[1]]);
    if (d.source !== "manual" || d.status !== "revisar") throw new Error(`documento ${d.source}/${d.status}`);
  });
  await step("con el tope alcanzado, la carta también lo explica y deja crear platos a mano", async () => {
    await page.goto(BASE + "/carta/subir");
    await page.getByText(MENSAJE).waitFor();
    await page.getByRole("link", { name: "Crear un plato a mano" }).waitFor();
  });
  await step("con el tope alcanzado, la API de subida responde 429 con el mismo mensaje y no crea nada", async () => {
    const antes = (await sql("select count(*)::int as n from documentos where tenant_id = $1", [id]))[0].n;
    const r = await subir();
    if (r.status() !== 429) throw new Error("estado " + r.status());
    const j = await r.json();
    if (j.codigo !== "tope_lecturas" || !MENSAJE.test(j.error)) throw new Error("respuesta " + JSON.stringify(j));
    if ((await sql("select count(*)::int as n from documentos where tenant_id = $1", [id]))[0].n !== antes) throw new Error("se ha creado un documento");
  });
  await step("con el tope alcanzado, «Volver a leer» una lectura fallida también se rechaza (y «Meterlo a mano» no)", async () => {
    const [err] = await sql("insert into documentos (tenant_id, local_id, kind, status, source, pages, ocr_error) values ($1, $2, 'albaran', 'error', 'ocr', 1, 'La lectura ha fallado.') returning id", [id, local]);
    await sql("insert into documento_archivos (tenant_id, documento_id, idx, storage_key, mime, bytes) values ($1, $2, 0, $3, 'image/jpeg', 10)", [id, err.id, `t/${id}/docs/${err.id}/0-prueba.jpg`]);
    await page.goto(BASE + "/compras/" + err.id);
    await page.getByRole("button", { name: /Volver a leer/ }).click();
    await page.getByText(MENSAJE).waitFor();
    const [d] = await sql("select status from documentos where id = $1", [err.id]);
    if (d.status !== "error") throw new Error("el documento ha pasado a " + d.status);
    if ((await sql("select 1 from audit_log where entity = 'documento' and entity_id = $1 and action = 'reintentar'", [err.id])).length) throw new Error("el reintento rechazado ha dejado huella");
    await page.getByRole("button", { name: /Meterlo a mano/ }).click();
    await page.getByRole("heading", { name: "Apunta la compra" }).waitFor({ timeout: 15000 });
  });
  await sql("delete from documentos where tenant_id = $1 and ocr_model = $2 and id in (select id from documentos where tenant_id = $1 and ocr_model = $2 limit 10)", [id, MARCA]);
  await step("al quedar por debajo del tope, la pantalla de subida vuelve a ofrecer subir y la API acepta", async () => {
    await page.goto(BASE + "/compras/subir");
    await page.locator("#f-any").waitFor({ state: "attached" });
    if (await page.getByText(/Has llegado al máximo de lecturas/).count()) throw new Error("sigue el aviso del tope");
    const r = await subir();
    if (r.status() !== 200) throw new Error("estado " + r.status());
  });
  await sql("delete from documentos where tenant_id = $1 and ocr_model = $2", [id, MARCA]);

  await sql("update organizations set plan_status = 'canceled', trial_ends_at = now() + interval '5 days' where id = $1", [id]);
  await step("con la suscripción cancelada, bloqueado aunque quedaran días de prueba", async () => {
    await page.goto(BASE + "/hoy");
    if (ruta() !== "/bloqueado") throw new Error("hoy → " + ruta());
    await page.getByRole("heading", { name: "Tu suscripción está cancelada" }).waitFor();
  });
  await step("salir desde la pantalla de bloqueo", async () => {
    await page.getByRole("button", { name: "Salir" }).click();
    await page.waitForURL("**/entrar**");
  });
} finally {
  await b.close();
}
const reales = errors.filter((e) => !/402|429|Payment Required|Too Many Requests/.test(e));
if (reales.length) { console.log("✗ errores en la consola:\n  " + reales.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ prueba gratuita y bloqueo correctos");
process.exit(fallos ? 1 : 0);
