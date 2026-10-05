// Pantallas renovadas (Compras, Escandallos, Carta, Proveedores, Inventario, Ventas, Avisos): fichas con su comparativa, filtros y orden que
// funcionan, aperturas con teclado, el esqueleto que llega antes que los datos y ningún desbordamiento en 390 · 768 · 1093 · 1280.
import { BASE, SHOTS, launch, signup, cargarDemo, noOverflow, watch } from "./lib.mjs";

const errors = [];
let fallos = 0;
const b = await launch();
const step = async (page, name, fn) => {
  try { await fn(); console.log("✓", name); } catch (e) {
    fallos++; console.log("✗", name, e.message.split("\n")[0]);
    await page.screenshot({ path: `${SHOTS}pantallas-fail-${name.replace(/\W+/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
};
const num = (t) => Number(String(t).replace(/[^\d,-]/g, "").replace(",", "."));
const ir = async (page, ruta, espera = 700) => { await page.goto(BASE + ruta, { waitUntil: "networkidle" }); await page.waitForTimeout(espera); };
const fichas = (page) => page.locator(".tiles-row .tile");
// Clic con el ratón en el centro del elemento: con un enlace que se estira sobre toda la fila o tarjeta, el clic llega al enlace
const clicEn = async (page, loc) => { const r = await loc.boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
const cierraTour = async (page) => { for (let i = 0; i < 3; i++) { const n = page.locator(".tour-next"); try { await n.waitFor({ timeout: 1500 }); await n.click(); } catch { break; } } };

try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES" });
  const page = await ctx.newPage();
  watch(page, errors);
  await signup(page, { email: `pantallas+${Date.now()}@example.com` });
  await cargarDemo(page);

  // ───────── Compras ─────────
  await step(page, "compras: fichas con comparativa, filtros por estado y búsqueda", async () => {
    await ir(page, "/compras");
    if ((await fichas(page).count()) !== 4) throw new Error("no hay cuatro fichas: " + (await fichas(page).count()));
    const total = await fichas(page).first().locator(".tile-val").innerText();
    if (!(num(total) > 0)) throw new Error("las compras de 30 días salen a 0: " + total);
    if (!(await fichas(page).first().innerText()).includes("vs los 30 días anteriores")) throw new Error("la ficha no compara con el periodo anterior");
    const guardados = page.getByRole("link", { name: /^Guardados/ });
    await guardados.click();
    await page.waitForURL(/estado=guardados/);
    if (!(await page.locator(".li-wrap").count())) throw new Error("sin documentos guardados");
    await page.getByRole("link", { name: /^Por revisar/ }).click();
    await page.waitForURL(/estado=revisar/);
    if (await page.locator(".li-wrap").count()) throw new Error("con la demo no debería haber nada por revisar");
    await page.getByText("Nada con ese filtro").waitFor();
    await page.getByRole("link", { name: "Quitar filtros" }).first().click();
    await page.waitForURL((u) => !u.search);
    await page.getByRole("searchbox", { name: "Buscar documentos" }).fill("Bodega");
    await page.keyboard.press("Enter");
    await page.waitForURL(/q=Bodega/);
    const nombres = await page.locator(".li-wrap .li-main b").allInnerTexts();
    if (!nombres.length || nombres.some((n) => !/Bodega/i.test(n))) throw new Error("la búsqueda no filtra: " + nombres.join("|"));
  });
  await step(page, "compras: pulsar un proveedor del gráfico filtra la lista", async () => {
    await ir(page, "/compras");
    const fila = page.locator(".barh-row").first();
    const prov = (await fila.locator(".barh-l").innerText()).trim();
    await fila.click();
    await page.waitForURL(/prov=/);
    const nombres = await page.locator(".li-wrap .li-main b").allInnerTexts();
    if (!nombres.length || nombres.some((n) => n.trim() !== prov)) throw new Error(`debería salir solo ${prov}: ${[...new Set(nombres)].join("|")}`);
    await page.getByRole("link", { name: /Quitar el filtro de/ }).click();
    await page.waitForURL((u) => !u.search.includes("prov="));
  });
  await step(page, "esqueleto: la página llega con su estructura antes de los datos", async () => {
    const r = await page.request.get(BASE + "/compras");
    const html = await r.text();
    if (!html.includes('aria-busy="true"')) throw new Error("el HTML enviado no trae el esqueleto");
  });

  // ───────── Escandallos ─────────
  await step(page, "escandallos: fichas, orden por columna y por selector, familias", async () => {
    await ir(page, "/escandallos");
    await cierraTour(page);
    if ((await fichas(page).count()) !== 4) throw new Error("no hay cuatro fichas");
    if (!/objetivo/.test(await fichas(page).first().innerText())) throw new Error("la ficha de food cost no dice su objetivo");
    await page.getByRole("link", { name: /^Food cost/ }).click();
    await page.waitForURL(/o=fc/);
    const fcs = (await page.locator(".tbl-clk tbody tr td:nth-child(4) b").allInnerTexts()).map(num).filter((n) => Number.isFinite(n));
    if (fcs.length < 3 || fcs.some((v, i) => i && v > fcs[i - 1] + 1e-9)) throw new Error("no está ordenado por food cost de mayor a menor: " + fcs.join(","));
    await page.getByRole("link", { name: /^Food cost/ }).click();
    await page.waitForURL(/d=asc/);
    const asc = (await page.locator(".tbl-clk tbody tr td:nth-child(4) b").allInnerTexts()).map(num).filter((n) => Number.isFinite(n));
    if (asc.some((v, i) => i && v < asc[i - 1] - 1e-9)) throw new Error("el segundo clic no invierte el orden");
    await page.getByRole("combobox", { name: "Ordenar por" }).selectOption("margen");
    await page.waitForURL(/o=margen/);
    const fam = page.getByRole("navigation", { name: "Filtrar platos" }).getByRole("link", { name: /^Pescados$/ });
    await fam.click();
    await page.waitForURL(/fam=Pescados/);
    const filas = await page.locator(".tbl-clk tbody tr").count();
    if (filas < 1) throw new Error("no sale ningún plato de la familia");
    const otras = (await page.locator(".tbl-clk tbody tr .tbl-dish small").allInnerTexts()).filter((t) => !t.startsWith("Pescados"));
    if (otras.length) throw new Error("salen platos de otras familias: " + otras.join("|"));
    await page.getByRole("link", { name: "Quitar el filtro de Pescados" }).click();
    await page.waitForURL((u) => !u.search.includes("fam="));
  });
  await step(page, "escandallos: la ficha «Fuera de objetivo» lleva a esos platos y la fila entera es un enlace", async () => {
    await ir(page, "/escandallos");
    await cierraTour(page);
    await fichas(page).nth(1).click();
    await page.waitForURL(/f=fuera/);
    const filas = await page.locator(".tbl-clk tbody tr").count();
    if (!filas) throw new Error("no salen platos fuera de objetivo");
    await clicEn(page, page.locator(".tbl-clk tbody tr td:nth-child(5)").first()); // una celda cualquiera de la fila
    await page.waitForURL(/\/escandallos\/[0-9a-f-]{36}/);
  });

  // ───────── Carta ─────────
  await step(page, "carta: fichas, familias y la tarjeta entera lleva al escandallo", async () => {
    await ir(page, "/carta");
    if ((await fichas(page).count()) !== 4) throw new Error("no hay cuatro fichas");
    const sin = num(await fichas(page).nth(3).locator(".tile-val").innerText());
    const sinFoto = await page.locator(".dishcard-ini").count();
    if (sin !== sinFoto) throw new Error(`la ficha dice ${sin} platos sin foto y hay ${sinFoto}`);
    await page.getByRole("navigation", { name: "Filtrar por familia" }).getByRole("link", { name: /^Pescados/ }).click();
    await page.waitForURL(/f=Pescados/);
    await clicEn(page, page.locator(".dishcard-n").first()); // el nombre, no el botón
    await page.waitForURL(/\/escandallos\/[0-9a-f-]{36}/);
  });

  // ───────── Proveedores ─────────
  await step(page, "proveedores: fichas, comparativa con barras y cuota de gasto", async () => {
    await ir(page, "/proveedores");
    if ((await fichas(page).count()) !== 4) throw new Error("no hay cuatro fichas");
    if (!(await page.locator(".vs-bar").count())) throw new Error("la comparativa no dibuja barras de precio");
    if (!(await page.locator(".prov-gasto .bar").count())) throw new Error("las tarjetas no enseñan su cuota de gasto");
    await fichas(page).nth(3).click(); // «Ahorro posible» lleva a la comparativa
    await page.waitForURL(/#comparar/);
  });

  // ───────── Inventario ─────────
  await step(page, "inventario: la ficha «Bajo mínimo» es un filtro y el resto de cifras son las de siempre", async () => {
    await ir(page, "/inventario");
    const bajo = page.locator("button.tile", { hasText: "Bajo mínimo" });
    const n = num(await bajo.locator(".tile-val").innerText());
    if (!(n >= 1)) throw new Error("la demo debería tener algo bajo mínimo");
    const todas = await page.locator(".tbl tbody tr:not(.grp)").count();
    await bajo.click();
    if ((await bajo.getAttribute("aria-pressed")) !== "true") throw new Error("la ficha no queda pulsada");
    const filtradas = await page.locator(".tbl tbody tr:not(.grp)").count();
    if (filtradas !== n) throw new Error(`debería haber ${n} filas bajo mínimo y hay ${filtradas}`);
    await bajo.click();
    if ((await page.locator(".tbl tbody tr:not(.grp)").count()) !== todas) throw new Error("al soltar la ficha no vuelve todo el almacén");
    await page.getByRole("button", { name: /Preparar pedido/ }).waitFor();
  });

  // ───────── Ventas ─────────
  await step(page, "ventas: las fichas comparan con el mes anterior y se mueven al cambiar las unidades", async () => {
    await ir(page, "/ventas");
    if ((await fichas(page).count()) !== 4) throw new Error("no hay cuatro fichas");
    if (!(await page.locator(".tiles-row .tile .spark").count())) throw new Error("las fichas no enseñan su evolución");
    const antes = num(await fichas(page).first().locator(".tile-val").innerText());
    const campo = page.getByLabel(/Unidades al mes de/).first();
    const uds = num(await campo.inputValue());
    await campo.fill(String(uds + 80));
    await campo.press("Tab");
    await page.waitForTimeout(1100);
    const despues = num(await fichas(page).first().locator(".tile-val").innerText());
    if (!(despues > antes)) throw new Error(`el margen no sube al vender más (${antes} → ${despues})`);
  });

  // ───────── Avisos ─────────
  await step(page, "avisos: prioridad, detalle que se abre con ratón y teclado, filtros y «ver más»", async () => {
    await ir(page, "/hoy/avisos");
    if ((await fichas(page).count()) !== 4) throw new Error("no hay cuatro fichas");
    const cab = page.locator(".av-h");
    const total = await cab.count();
    if (total < 2) throw new Error("la demo debería traer varios avisos");
    if ((await cab.first().getAttribute("aria-expanded")) !== "true") throw new Error("el aviso más pesado debería venir abierto");
    if ((await cab.nth(1).getAttribute("aria-expanded")) !== "false") throw new Error("el segundo debería venir cerrado");
    // El detalle cerrado no se puede tabular (inert); al abrirlo, sí
    const cuerpo = page.locator(".av-body").nth(1);
    if ((await cuerpo.getAttribute("inert")) === null) throw new Error("el detalle cerrado sigue accesible con el teclado");
    await cab.nth(1).click();
    await page.waitForTimeout(450);
    if ((await cab.nth(1).getAttribute("aria-expanded")) !== "true") throw new Error("no se abre con el ratón");
    if ((await cuerpo.getAttribute("inert")) !== null) throw new Error("abierto, sigue inert");
    await cab.nth(2).focus();
    await page.keyboard.press("Enter");
    if ((await cab.nth(2).getAttribute("aria-expanded")) !== "true") throw new Error("no se abre con el teclado");
    await page.getByRole("tab", { name: /^Para vigilar/ }).click();
    if (!(await cab.count())) throw new Error("«Para vigilar» no enseña nada");
    await page.getByRole("tab", { name: /^Acción recomendada/ }).click();
    const accion = num(await page.getByRole("tab", { name: /^Acción recomendada/ }).locator(".cnt").innerText());
    if (accion === 0 && !(await page.getByText("No hay avisos con ese filtro").count())) throw new Error("sin avisos que pidan acción debería decirlo");
    await page.getByRole("tab", { name: /^Todos/ }).click();
    const mas = page.getByRole("button", { name: /^Ver \d+ más/ });
    if (total > 8) {
      if (total !== 8) { /* se enseñan 8 de entrada */ }
      await mas.click();
      if ((await cab.count()) <= 8) throw new Error("«ver más» no enseña más avisos");
    }
  });

  // ───────── Sin desbordes en cuatro anchos ─────────
  for (const w of [1280, 1093, 768, 390]) {
    await step(page, `${w} sin desbordes ni errores en las siete pantallas`, async () => {
      await page.setViewportSize({ width: w, height: w < 600 ? 844 : 900 });
      for (const ruta of ["/compras", "/escandallos", "/carta", "/proveedores", "/inventario", "/ventas", "/hoy/avisos"]) {
        await ir(page, ruta, 500);
        await cierraTour(page);
        const ov = await noOverflow(page);
        if (ov.length) throw new Error(`${ruta}: desbordamiento ${ov.join("|")}`);
        const solapes = await page.evaluate(() => [...document.querySelectorAll(".tiles-row .tile")].filter((t) => t.scrollWidth > t.clientWidth + 1).length);
        if (solapes) throw new Error(`${ruta}: ${solapes} fichas con el contenido más ancho que la ficha`);
      }
      await ir(page, "/escandallos", 500);
      await page.screenshot({ path: `${SHOTS}pantallas-${w}.png`, fullPage: true });
    });
  }
  await ctx.close();

  // ───────── Negocio nuevo: nada vacío ni roto ─────────
  const ctxN = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "es-ES", reducedMotion: "reduce", isMobile: true, hasTouch: true });
  const pn = await ctxN.newPage();
  watch(pn, errors);
  await signup(pn, { email: `pantallas2+${Date.now()}@example.com` });
  await step(pn, "390 negocio nuevo: cada pantalla dice qué hacer y ninguna sale rota", async () => {
    for (const ruta of ["/compras", "/escandallos", "/carta", "/proveedores", "/inventario", "/hoy/avisos"]) {
      const r = await pn.goto(BASE + ruta, { waitUntil: "networkidle" });
      if (r?.status() !== 200) throw new Error(`${ruta}: ${r?.status()}`);
      await pn.waitForTimeout(400);
      await cierraTour(pn);
      const ov = await noOverflow(pn);
      if (ov.length) throw new Error(`${ruta}: desbordamiento ${ov.join("|")}`);
    }
    await ir(pn, "/compras");
    if (await fichas(pn).count()) throw new Error("un negocio sin albaranes no debe ver fichas a cero");
    await pn.getByRole("link", { name: /Subir albarán/ }).first().waitFor();
    await pn.screenshot({ path: `${SHOTS}pantallas-390-nuevo.png`, fullPage: true });
  });
  await ctxN.close();
} finally {
  await b.close();
}
if (errors.length) { console.log("✗ errores en la consola:\n  " + errors.join("\n  ")); fallos++; }
console.log(fallos ? `✗ ${fallos} comprobaciones con fallos` : "✓ pantallas renovadas correctas");
process.exit(fallos ? 1 : 0);
