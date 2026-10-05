// Calidad de la lectura en la pantalla de revisión: descuento general repartido entre las líneas, líneas que no son producto
// (casco, portes, devolución) y líneas dudosas que piden revisión. Usa OCR_PROVIDER=mock: el nombre del archivo elige la lectura.
import { readFileSync } from "node:fs";
import { BASE, SHOTS, launch, signup, watch } from "./lib.mjs";

const email = `calidad+${Date.now()}@example.com`;
const errors = [];
const FOTO = readFileSync(new URL("../../public/demo/arroz.webp", import.meta.url)); // una imagen válida cualquiera: lo que se lee lo decide el nombre
const b = await launch();
let fallos = 0;
const step = async (page, name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}calidad-fail-${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
};
const subir = async (page, nombre) => {
  await page.goto(BASE + "/compras/subir");
  await page.locator("#f-any").setInputFiles({ name: nombre, mimeType: "image/webp", buffer: FOTO });
  await page.getByRole("button", { name: /Leer albarán · 1 página/ }).click();
  await page.waitForURL(/\/compras\/[0-9a-f-]{36}$/);
  await page.getByRole("heading", { name: "Revisa el albarán" }).waitFor({ timeout: 40000 });
  for (let i = 0; i < 4; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 1500 }); await n.click(); } catch { break; } }
};
const txt = (loc) => loc.innerText().then((t) => t.replace(/\s+/g, " ").trim());

try {
  for (const [w, h, tag] of [[1280, 900, "1280"], [390, 844, "390"]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: "es-ES" });
    const page = await ctx.newPage();
    watch(page, errors);
    if (w === 1280) await signup(page, { email });
    else {
      // El móvil entra con la misma cuenta
      await page.goto(BASE + "/entrar");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Contraseña", { exact: true }).fill("una-clave-segura-2026");
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL("**/hoy**");
      for (let i = 0; i < 4; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 1500 }); await n.click(); } catch { break; } }
    }

    await step(page, `${tag} descuento general`, async () => {
      await subir(page, "albaran-descuento.webp");
      await page.screenshot({ path: `${SHOTS}calidad-${tag}-descuento.png`, fullPage: true });
      const todo = await txt(page.locator("body"));
      if (!/Descuento general del 15 %.*420,00 €.*repartido entre las líneas/.test(todo)) throw new Error("falta la nota del descuento general");
      const lineas = page.locator("article.ln");
      if ((await lineas.count()) !== 3) throw new Error("líneas: " + (await lineas.count()));
      const primera = await txt(lineas.first());
      if (!/100 ud × 6,00 € − 15 %/.test(primera)) throw new Error("línea 1: " + primera);
      if (!/510,00 €/.test(primera)) throw new Error("importe de la línea 1: " + primera);
      if ((await txt(lineas.nth(1))).indexOf("1.020,00 €") < 0) throw new Error("línea 2");
      if ((await txt(lineas.nth(2))).indexOf("850,00 €") < 0) throw new Error("línea 3");
    });

    await step(page, `${tag} casco, portes, devolución y dudas`, async () => {
      await subir(page, "albaran-dudas.webp");
      // Por defecto solo se enseñan las que hay que decidir (aceite y refresco): las demás están en «Todas»
      if (!(await page.getByRole("tab", { name: /Para decidir \(2\)/ }).count()) && !(await page.getByText("Para decidir (2)").count())) throw new Error("«Para decidir» no suma 2");
      await page.screenshot({ path: `${SHOTS}calidad-${tag}-dudas.png`, fullPage: true });
      await page.getByText(/^Todas \(6\)$/).click();
      const lineas = page.locator("article.ln");
      if ((await lineas.count()) !== 6) throw new Error("líneas: " + (await lineas.count()));
      const por = async (re) => { const n = await lineas.count(); for (let i = 0; i < n; i++) { const t = await txt(lineas.nth(i)); if (re.test(t)) return lineas.nth(i); } throw new Error("no encuentro la línea " + re); };
      const casco = await por(/CASCO BARRIL/);
      if (!/Envase o fianza · solo cuenta para el total/.test(await txt(casco))) throw new Error("casco: " + (await txt(casco)));
      if (!/Portes · solo cuenta para el total/.test(await txt(await por(/PORTES/)))) throw new Error("portes");
      if (!/Devolución o abono · solo cuenta para el total/.test(await txt(await por(/DEVOLUCION TOMATE/)))) throw new Error("devolución");
      if (!/Hay una devolución o un abono/.test(await txt(page.locator("body")))) throw new Error("falta la nota de la devolución");
      // Ninguna de esas tres pregunta por el artículo
      for (const re of [/CASCO BARRIL/, /PORTES/, /DEVOLUCION TOMATE/]) if (/No lo reconocemos con seguridad/.test(await txt(await por(re)))) throw new Error("pregunta por el artículo: " + re);
      // La línea del aceite: precio dudoso → pide revisar cantidad y precio y enseña la duda
      const aceite = await por(/ACEITE OLIVA/);
      const t = await txt(aceite);
      if (!/podría ser 24,50/.test(t) || !/Revisa la cantidad y el precio de esta línea/.test(t)) throw new Error("aceite: " + t);
      // El refresco: importe impreso 48 contra 4 × 9,60 = 38,40
      const refresco = await por(/REFRESCO COLA/);
      if (!/48,00 €.*no cuadra con 4 × 9,60 €.*38,40 €/.test(await txt(refresco))) throw new Error("refresco: " + (await txt(refresco)));
      // Corregir el precio del aceite y confirmar
      await aceite.locator('input[id^="p-"]').fill("24,5");
      await aceite.getByRole("button", { name: "Confirmar" }).click();
      await aceite.getByText(/Línea confirmada: 2 garrafa a 24,50 €/).waitFor({ timeout: 5000 });
      // Cambiar lo del casco: pasa a ser un producto y pregunta por el artículo
      await casco.getByRole("button", { name: "Cambiar" }).click();
      await casco.getByText("No lo reconocemos con seguridad").waitFor({ timeout: 5000 });
      await page.screenshot({ path: `${SHOTS}calidad-${tag}-dudas-despues.png`, fullPage: true });
    });
    await ctx.close();
  }
} finally {
  await b.close();
}
if (errors.length) { console.log("✗ errores en la consola:\n  " + errors.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ calidad de la lectura en la pantalla de revisión correcta");
process.exit(fallos ? 1 : 0);
