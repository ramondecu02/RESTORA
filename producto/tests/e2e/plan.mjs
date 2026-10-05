// Prueba gratuita y bloqueo: 14 días de prueba; al terminar (o con la suscripción cancelada) la app manda a /bloqueado
// y solo quedan la cuenta, la facturación y salir. Se comprueba en la interfaz y en la API de subida.
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
const reales = errors.filter((e) => !/402|Payment Required/.test(e));
if (reales.length) { console.log("✗ errores en la consola:\n  " + reales.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ prueba gratuita y bloqueo correctos");
process.exit(fallos ? 1 : 0);
