// Mi local y Más con el sistema común: las cuatro fichas de resumen (plan, compras, equipo, objetivo), «Para dejarlo a punto» con lo que falta
// y que cada acción lleve a su sitio, y que el plan se cuente con las mismas palabras en Mi local y en Más en cada estado (prueba, últimos días,
// activa, cobro pendiente, cancelada).
import { BASE, SHOTS, launch, signup, sql, watch, noOverflow } from "./lib.mjs";

const email = `cuentaui+${Date.now()}@example.com`;
const errors = [];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", reducedMotion: "reduce" });
const page = await ctx.newPage();
watch(page, errors);
let fallos = 0;
const step = async (name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}cuenta-ui-fail-${name.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
};
const orgId = async () => (await sql("select o.id from organizations o join memberships m on m.org_id = o.id join users u on u.id = m.user_id where lower(u.email) = lower($1)", [email]))[0].id;
const txt = (loc) => loc.innerText().then((t) => t.replace(/\s+/g, " ").trim());
const ficha = (label) => page.locator(".tile", { has: page.locator(".tile-lab", { hasText: new RegExp(`^${label}$`) }) });
const ir = async (ruta) => { await page.goto(BASE + ruta, { waitUntil: "networkidle" }); await page.waitForTimeout(400); };
/** El plan en Mi local (ficha) y en Más (etiqueta de la tarjeta de la cuenta). */
async function plan(id, set, esperado, { soloCuenta = false } = {}) {
  await sql(`update organizations set ${set} where id = $1`, [id]);
  await ir("/cuenta");
  const f = ficha(esperado.label);
  await f.first().waitFor();
  const t = await txt(f.first());
  for (const parte of esperado.ficha) if (!t.includes(parte)) throw new Error(`Mi local: «${t}» no lleva «${parte}»`);
  if (esperado.tono && !(await f.first().getAttribute("class")).includes(`tile-${esperado.tono}`)) throw new Error(`Mi local: la ficha no está en ${esperado.tono}`);
  if (soloCuenta) return; // con el acceso bloqueado, Más manda a /bloqueado
  await ir("/mas");
  const etiqueta = page.locator('a.more-i[href="/cuenta"] .tag');
  const e = await txt(etiqueta);
  if (e !== esperado.corto) throw new Error(`Más: «${e}» en vez de «${esperado.corto}»`);
  if (esperado.tono && !(await etiqueta.getAttribute("class")).includes(`tag-${esperado.tono}`)) throw new Error(`Más: la etiqueta no está en ${esperado.tono}`);
}

try {
  await signup(page, { email });
  const id = await orgId();

  await step("Mi local: las cuatro fichas de una cuenta nueva", async () => {
    await ir("/cuenta");
    await page.waitForTimeout(900); // las cifras cuentan hasta su valor
    const esperado = [["Prueba gratuita", ["14", "días", "hasta el"]], ["Tus compras guardadas", ["0", "sube tu primer albarán"]], ["Equipo", ["1", "persona", "tu rol: Propietario"]], ["Food cost objetivo", ["30,0", "%"]]];
    for (const [label, partes] of esperado) {
      const t = await txt(ficha(label).first());
      for (const p of partes) if (!t.includes(p)) throw new Error(`«${label}»: «${t}» no lleva «${p}»`);
    }
  });

  await step("Mi local: «Para dejarlo a punto» dice lo que falta y nada más", async () => {
    const titulo = page.getByRole("heading", { name: /Para dejarlo a punto/ });
    await titulo.waitFor();
    const focos = (await page.locator(".focus .fc-t").allInnerTexts()).map((t) => t.trim());
    // La alta ya pide el código postal, y no hay datos de ejemplo cargados
    const queda = ["Sin comensales al día", "Hoy solo estás tú"];
    if (focos.length !== queda.length || queda.some((t) => !focos.includes(t))) throw new Error("focos: " + JSON.stringify(focos));
  });

  await step("Mi local: «Indicarlos» lleva al formulario y, al guardar los comensales, el aviso desaparece", async () => {
    await page.getByRole("link", { name: "Indicarlos" }).click();
    await page.waitForFunction(() => location.hash === "#local");
    const campo = page.getByLabel("Comensales al día");
    await campo.waitFor();
    await campo.fill("60");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await page.getByText("Local guardado", { exact: true }).waitFor({ timeout: 8000 });
    await ir("/cuenta");
    if (await page.getByText("Sin comensales al día", { exact: true }).count()) throw new Error("el aviso sigue ahí");
    const [l] = await sql("select comensales_dia from locales where tenant_id = $1", [id]);
    if (l.comensales_dia !== 60) throw new Error("comensales_dia = " + l.comensales_dia);
  });

  await step("Mi local: invitar a alguien cambia la ficha del equipo y quita «Hoy solo estás tú»", async () => {
    await ir("/cuenta/usuarios");
    await page.getByLabel("Email").fill(`equipo+${Date.now()}@example.com`);
    await page.getByRole("button", { name: /Enviar invitación/ }).click();
    await page.waitForFunction(() => document.body.innerText.includes("Pendientes") || document.querySelectorAll(".li").length > 1, null, { timeout: 8000 }).catch(() => {});
    await ir("/cuenta");
    await page.waitForTimeout(700);
    const t = await txt(ficha("Equipo").first());
    if (!t.includes("1 invitación pendiente")) throw new Error("equipo: " + t);
    if (await page.getByText("Hoy solo estás tú", { exact: true }).count()) throw new Error("«Hoy solo estás tú» sigue ahí");
  });

  await step("Más: tarjeta de la cuenta con el plan y enlace a Mi local", async () => {
    await ir("/mas");
    const tarjeta = page.locator('a.more-i[href="/cuenta"]', { hasText: "Marta Pujol" }); // «Mi local», en el grupo Cuenta, lleva al mismo sitio
    const t = await txt(tarjeta);
    if (!/Marta Pujol/.test(t) || !/Propietario · Casa Pujol/.test(t) || !/Prueba · 14 días/.test(t)) throw new Error("tarjeta: " + t);
  });

  await step("el plan se cuenta igual en Mi local y en Más: prueba en sus últimos días", async () => {
    await plan(id, "trial_ends_at = now() + interval '2 days'", { label: "Prueba gratuita", ficha: ["2", "días"], corto: "Prueba · 2 días", tono: "warn" });
  });
  await step("el plan se cuenta igual en Mi local y en Más: suscripción activa", async () => {
    await plan(id, "plan_status = 'active'", { label: "Suscripción", ficha: ["Activa", "todo en orden"], corto: "Suscripción activa", tono: "ok" });
  });
  await step("el plan se cuenta igual en Mi local y en Más: cobro pendiente con días de plazo", async () => {
    await plan(id, "plan_status = 'past_due', past_due_since = now() - interval '1 day'", { label: "Para actualizar el pago", ficha: ["4", "días", "antes de que se bloquee el acceso"], corto: "Pago pendiente · 4 días", tono: "bad" });
  });
  await step("el plan se cuenta igual en Mi local y en Más: suscripción cancelada", async () => {
    await plan(id, "plan_status = 'canceled', past_due_since = null", { label: "Suscripción", ficha: ["Cancelada", "tus datos siguen aquí"], corto: "Suscripción cancelada", tono: "bad" }, { soloCuenta: true });
  });
  await step("con la suscripción cancelada, Mi local sigue abierta y dice por qué y cómo seguir", async () => {
    await page.getByText("Tu suscripción está cancelada. Aquí puedes descargar tus datos o borrar el negocio.").waitFor({ timeout: 5000 });
    await page.getByRole("link", { name: "Cómo seguir usando RESTORA" }).waitFor();
    await ir("/mas");
    if (!page.url().includes("/bloqueado")) throw new Error("Más debería mandar a /bloqueado: " + page.url());
  });

  await step("sin desbordes en Mi local y en Más (360, 390, 768, 1280)", async () => {
    await sql("update organizations set plan_status = 'trial', trial_ends_at = now() + interval '14 days', past_due_since = null where id = $1", [id]);
    for (const ancho of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width: ancho, height: 860 });
      for (const ruta of ["/cuenta", "/mas"]) {
        await ir(ruta);
        const sobran = await noOverflow(page);
        if (sobran.length) throw new Error(`${ruta} a ${ancho}px: ${sobran.join(", ")}`);
      }
    }
  });
} finally {
  await b.close();
}
if (errors.length) { console.log("✗ errores en la consola:\n  " + errors.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ Mi local y Más correctos");
process.exit(fallos ? 1 : 0);
