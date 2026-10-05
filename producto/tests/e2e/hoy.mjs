// Panel «Hoy»: lo que pide atención, el mes que se elige (todo se mueve con él), las cifras que cuentan, los gráficos que se
// pueden pulsar y los estados vacío y de movimiento reducido. Con datos de ejemplo (negocio nuevo + «Cargar datos de ejemplo»).
import { BASE, SHOTS, launch, signup, cargarDemo, noOverflow, watch } from "./lib.mjs";

const errors = [];
let fallos = 0;
const b = await launch();
const step = async (page, name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}hoy-fail-${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
};
const num = (t) => Number(String(t).replace(/[^\d,-]/g, "").replace(",", "."));
const gaugeTxt = (page) => page.locator(".gauge-v b").innerText();
const settle = (page) => page.waitForTimeout(1100); // las cifras cuentan ~650 ms

try {
  // ───────── Con datos de ejemplo, escritorio ─────────
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES" });
  const page = await ctx.newPage();
  watch(page, errors);
  await signup(page, { email: `hoy+${Date.now()}@example.com` });
  await cargarDemo(page);
  await page.goto(BASE + "/hoy", { waitUntil: "networkidle" });
  await settle(page);

  await step(page, "1280 atención hoy, panel del mes y gráficos", async () => {
    const h = page.getByRole("heading", { name: /Requiere tu atención/ });
    await h.waitFor();
    const n = await page.locator(".focus-n").innerText();
    const cards = await page.locator(".fc").count();
    if (!(num(n) >= 1) || cards < 1) throw new Error(`atención: ${n} / ${cards} tarjetas`);
    if (!(await page.locator(".fc .fc-a a").first().getAttribute("href"))) throw new Error("las tarjetas no llevan a ninguna parte");
    if ((await page.getByRole("radio", { name: /^(May|Jun|Jul|Ago|Sept?|Oct|Nov|Dic|Ene|Feb|Mar|Abr)/ }).count()) !== 6) throw new Error("el selector no tiene seis meses");
    await page.locator(".panel").waitFor();
    if (!(await page.locator(".tile").count())) throw new Error("no hay fichas");
    if (!(await page.locator(".lc-pt").count())) throw new Error("la gráfica no tiene puntos");
    if (!(await page.locator(".barh-row").count())) throw new Error("no hay barras");
    await page.screenshot({ path: `${SHOTS}hoy-1280.png`, fullPage: true });
    const ov = await noOverflow(page);
    if (ov.length) throw new Error("desbordamiento: " + ov.join("|"));
  });

  await step(page, "1280 la cifra cuenta y termina en el valor que dice el arco", async () => {
    const txt = await gaugeTxt(page);
    const lbl = await page.locator(".gauge svg").getAttribute("aria-label");
    const m = /Food cost ([\d.]+) %/.exec(lbl ?? "");
    if (!m) throw new Error("el arco no dice su valor: " + lbl);
    if (Math.abs(num(txt) - Number(m[1])) > 0.05) throw new Error(`la cifra (${txt}) no coincide con el arco (${m[1]})`);
    // Pasa por valores intermedios al cambiar de mes (cuenta, no salta)
    const antes = num(txt);
    await page.getByRole("radio", { name: "Sept" }).click();
    const vistos = new Set();
    for (let i = 0; i < 12; i++) { vistos.add(await gaugeTxt(page)); await page.waitForTimeout(40); }
    await settle(page);
    const despues = num(await gaugeTxt(page));
    if (Math.abs(despues - antes) > 0.001 && vistos.size < 3) throw new Error(`no hubo transición: ${[...vistos].join(" · ")}`);
  });

  await step(page, "1280 elegir mes mueve el panel entero", async () => {
    await page.getByRole("radio", { name: "Jul" }).click();
    await settle(page);
    if (!/julio de 2026/i.test(await page.locator(".panel-sub").innerText())) throw new Error("el subtítulo no cambia: " + await page.locator(".panel-sub").innerText());
    if ((await page.getByRole("radio", { name: "Jul" }).getAttribute("aria-checked")) !== "true") throw new Error("el mes no queda marcado");
    if (!/vs junio/.test(await page.locator(".panel .tile").first().innerText())) throw new Error("la ficha no compara con el mes anterior: " + await page.locator(".panel .tile").first().innerText());
    const sel = await page.locator(".lc-pt.is-sel").count();
    if (sel !== 1) throw new Error("la gráfica no marca el mes elegido");
    // Pulsar un punto de la gráfica elige ese mes
    await page.locator(".lc-pt").nth(1).click();
    await settle(page);
    if ((await page.getByRole("radio", { name: "Jun" }).getAttribute("aria-checked")) !== "true") throw new Error("pulsar el punto no elige el mes");
    // Y con el teclado
    await page.locator(".lc-pt").nth(3).focus();
    await page.keyboard.press("Enter");
    await settle(page);
    if ((await page.getByRole("radio", { name: "Ago" }).getAttribute("aria-checked")) !== "true") throw new Error("el teclado no elige el mes");
    await page.getByRole("radio", { name: "Oct" }).click();
  });

  await step(page, "1280 la leyenda del margen por familia lleva a sus platos", async () => {
    const enlace = page.locator(".dl-link").first();
    const fam = (await enlace.locator("span").innerText()).trim();
    await enlace.click();
    await page.waitForURL(/\/escandallos\?fam=/);
    await page.getByRole("link", { name: new RegExp("Quitar el filtro de " + fam) }).waitFor();
    // Solo salen platos de esa familia
    const filas = await page.locator('[data-tour="esc-list"] tbody tr, [data-tour="esc-list"] .li').count();
    if (!filas) throw new Error("no sale ningún plato de la familia " + fam);
  });

  await step(page, "1093 con la barra lateral a la vista, una columna sin solapes", async () => {
    await page.setViewportSize({ width: 1093, height: 860 });
    await page.goto(BASE + "/hoy", { waitUntil: "networkidle" });
    await settle(page);
    const ov = await noOverflow(page);
    if (ov.length) throw new Error("desbordamiento: " + ov.join("|"));
    const grid = await page.locator(".hoy-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    if (grid !== 1) throw new Error("a 1093 px debería ser una columna y tiene " + grid);
    await page.screenshot({ path: `${SHOTS}hoy-1093.png`, fullPage: true });
  });
  await ctx.close();

  // ───────── Móvil, con «reducir movimiento» ─────────
  const email2 = `hoy2+${Date.now()}@example.com`;
  const ctxN = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "es-ES", reducedMotion: "reduce", isMobile: true, hasTouch: true });
  const pm = await ctxN.newPage();
  watch(pm, errors);
  await signup(pm, { email: email2 });
  await step(pm, "390 negocio nuevo: un primer paso claro y ningún panel vacío", async () => {
    await pm.goto(BASE + "/hoy", { waitUntil: "networkidle" });
    if (await pm.locator(".panel").count()) throw new Error("un negocio sin datos no debe ver el panel vacío");
    if (!(await pm.locator(".hero").count())) throw new Error("falta el primer paso");
    if (!(await pm.getByRole("link", { name: /Subir albarán/ }).count())) throw new Error("falta subir el primer albarán");
    await pm.screenshot({ path: `${SHOTS}hoy-390-nuevo.png`, fullPage: true });
    const ov = await noOverflow(pm);
    if (ov.length) throw new Error("desbordamiento: " + ov.join("|"));
  });
  await cargarDemo(pm);
  await step(pm, "390 con «reducir movimiento» las cifras salen ya en su valor y el panel funciona", async () => {
    await pm.goto(BASE + "/hoy", { waitUntil: "networkidle" });
    // Sin esperar: con movimiento reducido no cuenta, así que ya es el valor final
    const txt = await gaugeTxt(pm);
    const lbl = await pm.locator(".gauge svg").getAttribute("aria-label");
    const m = /Food cost ([\d.]+) %/.exec(lbl ?? "");
    if (!m || Math.abs(num(txt) - Number(m[1])) > 0.05) throw new Error(`cifra ${txt} frente a arco ${lbl}`);
    await pm.getByRole("radio", { name: "Sept" }).click();
    if (!/septiembre/i.test(await pm.locator(".panel-sub").innerText())) throw new Error("no cambia de mes");
    // La fila de atención se desliza en horizontal (la siguiente asoma)
    const desliza = await pm.locator(".focus-list").evaluate((el) => el.scrollWidth > el.clientWidth + 8);
    if (!desliza) throw new Error("la fila de atención no se desliza en el móvil");
    const ov = await noOverflow(pm);
    if (ov.length) throw new Error("desbordamiento: " + ov.join("|"));
    await pm.screenshot({ path: `${SHOTS}hoy-390.png`, fullPage: true });
  });
  await ctxN.close();
} finally {
  await b.close();
}
if (errors.length) { console.log("✗ errores en la consola:\n  " + errors.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ panel Hoy correcto");
process.exit(fallos ? 1 : 0);
