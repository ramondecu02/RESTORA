// Coherencia entre pantallas: la misma cifra sale igual en todos los sitios que la enseñan (menú, fichas de cada pantalla, Hoy).
// Con los datos de ejemplo, en escritorio. Si una cifra cambia de significado entre pantallas, la ficha lo dice (p. ej. «lo guardado», «sin IVA»)
// y aquí solo se comparan las que se llaman igual y cuentan lo mismo.
import { BASE, SHOTS, launch, watch, tallShot, negocioDeEjemplo } from "./lib.mjs";

const errors = [];
const b = await launch();
const state = await negocioDeEjemplo(b, "coherencia");
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES", storageState: state });
const page = await ctx.newPage();
watch(page, errors);
let fails = 0;
const num = (t) => Number(String(t).replace(/[^\d,-]/g, "").replace(",", "."));
const ir = async (ruta) => { await page.goto(BASE + ruta, { waitUntil: "networkidle" }); await page.waitForTimeout(1000); };
/** Valor de la ficha que se llama así (las cifras cuentan hasta su valor: se lee ya asentada). */
const ficha = async (label) => {
  const f = page.locator(".tiles-row .tile", { has: page.locator(".tile-lab", { hasText: label }) }).first();
  if (!(await f.count())) throw new Error(`no hay ficha «${label}» en ${new URL(page.url()).pathname}`);
  return num(await f.locator(".tile-val").innerText());
};
/** Número del menú lateral junto a la entrada que lleva a esa ruta (sin número = 0). */
const menu = async (href) => {
  const n = page.locator(`[data-tour="side"] a[href="${href}"] .badge`);
  return (await n.count()) ? num(await n.first().innerText()) : 0;
};
async function step(name, fn) {
  try { await fn(); console.log("✓", name); }
  catch (e) { fails++; console.log("✗", name, "—", e.message.split("\n")[0]); await tallShot(page, `${SHOTS}coherencia-fail-${name.replace(/\W+/g, "_")}.png`).catch(() => {}); }
}
const igual = (lo, ...pares) => {
  const [[, v0]] = pares;
  const mal = pares.filter(([, v]) => Math.abs(v - v0) > lo);
  if (mal.length) throw new Error(pares.map(([n, v]) => `${n}: ${v}`).join(" · "));
};

await step("avisos de precio: menú, Avisos, Compras y Proveedores cuentan lo mismo", async () => {
  await ir("/hoy/avisos"); const avisos = await ficha("Avisos abiertos"); const delMenu = await menu("/hoy/avisos");
  await ir("/compras"); const compras = await ficha("Avisos de precio");
  await ir("/proveedores"); const prov = await ficha("Avisos de precio");
  if (!(avisos > 0)) throw new Error("con los datos de ejemplo debería haber avisos de precio");
  igual(0, ["menú", delMenu], ["Avisos abiertos", avisos], ["Compras", compras], ["Proveedores", prov]);
});

await step("platos fuera de objetivo: menú, Escandallos y Avisos cuentan lo mismo", async () => {
  await ir("/escandallos"); const esc = await ficha("Fuera de objetivo"); const delMenu = await menu("/escandallos");
  await ir("/hoy/avisos"); const av = await ficha("Platos fuera de objetivo");
  if (!(esc > 0)) throw new Error("con los datos de ejemplo debería haber platos fuera de objetivo");
  igual(0, ["menú", delMenu], ["Escandallos", esc], ["Avisos", av]);
});

await step("bajo mínimo: menú e Inventario cuentan lo mismo", async () => {
  await ir("/inventario"); const inv = await ficha("Bajo mínimo"); const delMenu = await menu("/inventario");
  igual(0, ["menú", delMenu], ["Inventario", inv]);
});

await step("gasto de 30 días: Compras y Proveedores suman lo mismo (sin IVA, lo guardado)", async () => {
  await ir("/compras"); const compras = await ficha("Compras · 30 días");
  await ir("/proveedores"); const prov = await ficha("Gasto · 30 días");
  if (!(compras > 0)) throw new Error("con los datos de ejemplo debería haber compras en 30 días");
  igual(1, ["Compras", compras], ["Proveedores", prov]);
});

await step("food cost de la carta: Escandallos y Carta dan el mismo", async () => {
  await ir("/escandallos"); const esc = await ficha("Food cost de la carta");
  await ir("/carta"); const carta = await ficha("Food cost de la carta");
  if (!(esc > 0)) throw new Error("el food cost de la carta sale vacío");
  igual(0.05, ["Escandallos", esc], ["Carta", carta]);
});

await step("food cost del mes en curso: Hoy y Ventas dan el mismo", async () => {
  await ir("/hoy");
  const hoy = num(await page.locator(".panel .gauge-v b").first().innerText());
  await ir("/ventas"); const ventas = await ficha("Food cost ponderado");
  if (!(hoy > 0)) throw new Error("el food cost de Hoy sale vacío");
  igual(0.05, ["Hoy", hoy], ["Ventas", ventas]);
});

console.log(fails ? `\n✗ ${fails} comparaciones con diferencias` : "\nLas mismas cifras coinciden en todas las pantallas");
console.log("errores:", errors.length ? errors.slice(0, 10) : "ninguno");
if (errors.length) fails++;
await b.close();
process.exit(fails ? 1 : 0);
