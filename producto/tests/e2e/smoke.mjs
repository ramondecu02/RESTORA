import { BASE, SHOTS, launch, lastCode, watch, noOverflow } from "./lib.mjs";

const W = Number(process.env.W || 390), H = Number(process.env.H || 844);
const email = `prueba+${Date.now()}@example.com`;
const errors = [];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, locale: "es-ES" });
const page = await ctx.newPage();
watch(page, errors);
const shot = (n) => page.screenshot({ path: `${SHOTS}${W}-${n}.png`, caret: "initial" });
const dismissTour = async () => { try { await page.locator(".tour-next").waitFor({ timeout: 2500 }); } catch { return; } for (let i = 0; i < 4 && await page.locator(".tour-next").count(); i++) await page.locator(".tour-next").click(); };
const step = async (name, fn) => { const t = Date.now(); try { await fn(); console.log("✓", name, Date.now() - t + "ms"); } catch (e) { console.log("✗", name, e.message.split("\n")[0]); await shot("fail-" + name.replace(/\W+/g, "_")); throw e; } };

try {
  await step("registro", async () => {
    await page.goto(BASE + "/registro");
    await page.getByLabel("Tu nombre").fill("Marta Pujol");
    await page.getByLabel("Email de trabajo").fill(email);
    await page.getByLabel("Nombre del restaurante").fill("Casa Pujol");
    await page.getByLabel("Contraseña", { exact: true }).fill("una-clave-segura-2026");
    await page.getByRole("checkbox").check();
    await shot("01-registro");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForURL("**/verificar");
  });
  await step("verificar", async () => {
    const code = await lastCode(email);
    await page.getByLabel("Cifra 1 de 6").fill(code);
    await shot("02-verificar");
    await page.getByRole("button", { name: "Verificar" }).click();
    await page.waitForURL("**/bienvenida");
  });
  await step("bienvenida+briefing", async () => {
    await shot("03-bienvenida");
    await page.getByRole("link", { name: /Empezar/ }).click();
    await page.waitForURL("**/alta/briefing");
    await page.getByRole("radio", { name: "Restaurante" }).click();
    await page.getByRole("radio", { name: "15 a 40" }).click();
    await shot("04-brief1");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("radio", { name: /Excel/ }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("radio", { name: "Propietario/a" }).click();
    await page.getByRole("radio", { name: /qué platos ganan/ }).click();
    await shot("05-brief3");
    await page.getByRole("button", { name: "Terminar" }).click();
    await page.waitForURL("**/alta/local");
  });
  await step("local", async () => {
    await page.getByLabel("Código postal").fill("43003");
    await page.getByLabel("Ciudad").fill("Tarragona");
    await shot("06-local");
    await page.getByRole("button", { name: "Guardar y seguir" }).click();
    await page.waitForURL("**/alta/proveedores");
  });
  await step("proveedores", async () => {
    await page.getByLabel("Nombre del proveedor").fill("Frutas Hermanos Gil");
    await page.getByLabel("Qué te vende (opcional)").selectOption("Fruta y verdura");
    await page.getByRole("button", { name: "Añadir proveedor" }).click();
    await page.getByText("Frutas Hermanos Gil").waitFor();
    await shot("07-proveedores");
    await page.getByRole("button", { name: "Ir a mi cocina" }).click();
    await page.waitForURL("**/hoy**");
  });
  await step("hoy+tour", async () => {
    await page.locator(".tour-tip").waitFor({ timeout: 5000 });
    await shot("08-hoy-tour");
    for (let i = 0; i < 3; i++) { const n = page.locator(".tour-next"); if (await n.count()) await n.click(); }
  });
  await step("subir ejemplo", async () => {
    await page.goto(BASE + "/compras/subir");
    await shot("09-subir");
    await page.getByRole("button", { name: /Probar con un albarán de ejemplo/ }).click();
    await page.waitForURL(/\/compras\/[0-9a-f-]{36}$/);
    await shot("10-leyendo");
    await page.getByRole("heading", { name: "Revisa el albarán" }).waitFor({ timeout: 30000 });
    await dismissTour();
    await shot("11-validacion");
  });
  await step("decidir", async () => {
    // Número dudoso
    await page.getByRole("button", { name: "Es A-2231" }).click();
    // Mix gourmet: crear artículo
    await page.getByRole("button", { name: "Crear artículo" }).first().click();
    await page.getByRole("button", { name: "Crear artículo", exact: true }).click();
    // Pollo: confirmar cantidad
    await page.locator(".dec-q .btn").first().click();
    // Cerveza IVA
    await page.getByRole("button", { name: /21 % · sugerido/ }).click();
    console.log("  botón deshabilitado:", await page.getByRole("button", { name: "Confirmar y guardar" }).isDisabled());
    await page.waitForTimeout(300);
    console.log("  botón deshabilitado (300ms):", await page.getByRole("button", { name: "Confirmar y guardar" }).isDisabled());
    await shot("12-decidido");
    const txt = await page.locator(".foot-note").innerText();
    if (!/Todo revisado/.test(txt)) throw new Error("Aún hay decisiones: " + txt);
  });
  await step("guardar", async () => {
    await page.getByRole("button", { name: "Confirmar y guardar" }).click();
    await page.waitForURL(/guardado=1/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Albarán guardado", level: 2 }).waitFor();
    await shot("13-guardado");
  });
  await step("lista compras", async () => {
    await page.goto(BASE + "/compras");
    await shot("14-compras");
  });
  console.log("overflow:", JSON.stringify(await noOverflow(page)));
} finally {
  console.log("errores:", errors.length ? errors : "ninguno");
  if (errors.length) process.exitCode = 1;
  await b.close();
}
