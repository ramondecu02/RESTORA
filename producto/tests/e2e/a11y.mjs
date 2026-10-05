// Accesibilidad de toda la app con axe-core (WCAG 2.2 AA): cada pantalla en móvil y escritorio, con tema claro y oscuro,
// sin violaciones serias o críticas; además, al tabular, el foco se ve y no queda tapado por una barra.
// REUSE=1 reutiliza la sesión de la ejecución anterior. ONLY=hoy,carta limita las pantallas. INFO=1 lista también las violaciones leves.
import { createRequire } from "node:module";
import { BASE, launch, rutasDeLaApp, negocioDeEjemplo } from "./lib.mjs";

const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const ETIQUETAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SOLO = process.env.ONLY ? process.env.ONLY.split(",") : null;
const GRAVES = new Set(["serious", "critical"]);
const b = await launch();
const porRegla = new Map(); // id → { impacto, ayuda, paginas: Set, nodos: n }
let graves = 0;
let leves = 0;
let focoMal = 0;

async function axe(page) {
  return page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] }), ETIQUETAS);
}

async function revisar(cx, nombre, ruta, W, tema) {
  const page = await cx.newPage();
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const r = await axe(page);
  for (const v of r.violations) {
    const grave = GRAVES.has(v.impact);
    if (grave) graves++; else leves++;
    const clave = v.id;
    const e = porRegla.get(clave) ?? { impacto: v.impact, ayuda: v.help, paginas: new Set(), nodos: 0 };
    e.paginas.add(`${nombre}@${W}${tema === "dark" ? "·oscuro" : ""}`); e.nodos += v.nodes.length;
    porRegla.set(clave, e);
    if (grave || process.env.INFO) console.log(grave ? "✗" : "·", `[${v.impact}]`, v.id, `${nombre} ${W}px ${tema}`, `×${v.nodes.length}`, "→", v.nodes.slice(0, 3).map((n) => n.target.join(" ") + (n.any[0]?.data?.contrastRatio ? ` (${n.any[0].data.contrastRatio}:1, mínimo ${n.any[0].data.expectedContrastRatio})` : "")).join(" | ").slice(0, 420));
  }
  await page.close();
}

/** Tabula por la pantalla: cada control con foco tiene que mostrarlo y no puede quedar tapado por una barra fija. */
async function foco(cx, nombre, ruta, W, max = 60) {
  const page = await cx.newPage();
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const vistos = new Set();
  const mal = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const rc = el.getBoundingClientRect();
      const nombre = el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + "«" + (el.innerText || el.getAttribute("aria-label") || el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 24) + "»";
      // Hay foco visible si, al quitárselo, el control (o su contenedor, por :focus-within) cambia de aspecto
      const firma = (e) => { const c = getComputedStyle(e); return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderTopColor, c.backgroundColor, c.color, c.textDecorationLine, c.transform].join("|"); };
      const par = el.parentElement;
      const conFoco = firma(el) + "#" + (par ? firma(par) : "");
      el.blur();
      const sinFoco = firma(el) + "#" + (par ? firma(par) : "");
      el.focus({ preventScroll: true });
      const contorno = conFoco !== sinFoco;
      let tapado = null;
      if (rc.width >= 4 && rc.height >= 4) { // los campos solo para lectores (sr) miden 1 px: su foco se pinta en el botón que los acompaña
        const top = document.elementFromPoint(Math.min(Math.max(rc.left + rc.width / 2, 1), innerWidth - 1), Math.min(Math.max(rc.top + rc.height / 2, 1), innerHeight - 1));
        if (top && top !== el && !el.contains(top) && !top.contains(el) && !(el.labels && [...el.labels].some((l) => l === top || l.contains(top)))) tapado = top.tagName.toLowerCase() + (typeof top.className === "string" ? "." + top.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
      }
      return { nombre, visible: contorno, tapado, clave: nombre + "@" + Math.round(rc.left) + "," + Math.round(rc.top) };
    });
    if (!r) continue;
    if (vistos.has(r.clave)) break; // ha dado la vuelta
    vistos.add(r.clave);
    if (!r.visible) mal.push(`sin foco visible: ${r.nombre}`);
    if (r.tapado) mal.push(`foco tapado: ${r.nombre} por ${r.tapado}`);
  }
  if (mal.length) { focoMal += mal.length; console.log("✗", `foco ${nombre} ${W}px`, `(${vistos.size} controles)`, mal.slice(0, 6).join(" | ")); }
  else console.log("✓", `foco ${nombre} ${W}px: ${vistos.size} controles, todos con foco visible y a la vista`);
  await page.close();
}

try {
  const state = await negocioDeEjemplo(b, "a11y");
  const c0 = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", storageState: state });
  const { rutas } = await rutasDeLaApp(await c0.newPage());
  await c0.close();
  const app = rutas.filter(([n]) => !SOLO || SOLO.includes(n));
  const publicas = [["entrar", "/entrar"], ["registro", "/registro"], ["recuperar", "/recuperar"]].filter(([n]) => !SOLO || SOLO.includes(n));

  for (const tema of ["light", "dark"]) {
    for (const W of [390, 1280]) {
      const movil = W < 700;
      const base = { viewport: { width: W, height: movil ? 844 : 860 }, locale: "es-ES", colorScheme: tema, reducedMotion: "reduce", isMobile: movil, hasTouch: movil };
      const sin = await b.newContext(base);
      await sin.addInitScript({ path: AXE });
      for (const [n, p] of publicas) await revisar(sin, n, p, W, tema);
      await sin.close();
      const con = await b.newContext({ ...base, storageState: state });
      await con.addInitScript({ path: AXE });
      for (const [n, p] of app) await revisar(con, n, p, W, tema);
      await con.close();
      console.log(`· ${tema} ${W}px revisado (${app.length + publicas.length} pantallas)`);
    }
  }

  for (const W of [1280, 390]) {
    const cx = await b.newContext({ viewport: { width: W, height: W < 700 ? 844 : 860 }, locale: "es-ES", reducedMotion: "reduce", storageState: state, isMobile: W < 700, hasTouch: W < 700 });
    for (const [n, p] of [["hoy", "/hoy"], ["compras", "/compras"], ["escandallos", "/escandallos"], ["inventario", "/inventario"], ["carta", "/carta"]].filter(([n]) => !SOLO || SOLO.includes(n))) await foco(cx, n, p, W);
    await cx.close();
  }

  console.log("\nResumen por regla (todas las pantallas):");
  for (const [id, e] of [...porRegla].sort((a, c) => c[1].paginas.size - a[1].paginas.size)) console.log(`  ${GRAVES.has(e.impacto) ? "✗" : "·"} ${id} [${e.impacto}] ${e.paginas.size} pantallas, ${e.nodos} elementos — ${e.ayuda}`);
  console.log(graves || focoMal ? `\n✗ ${graves} violaciones serias o críticas, ${focoMal} problemas de foco (${leves} leves)` : `\n✓ sin violaciones serias o críticas y con el foco siempre visible (${leves} leves)`);
  if (graves || focoMal) process.exitCode = 1;
} finally {
  await b.close();
}
