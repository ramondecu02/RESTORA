// Recorre todas las pantallas con los datos de ejemplo cargados, en móvil y escritorio.
// Comprueba: respuesta HTTP, errores de consola, desbordamiento horizontal. Guarda capturas.
import { BASE, SHOTS, launch, watch, noOverflow, tallShot, signup, cargarDemo, rutasDeLaApp } from "./lib.mjs";
import { existsSync, writeFileSync } from "node:fs";
// REUSE=1 reutiliza la sesión de la última ejecución (sin registrarse ni cargar la demo otra vez).
// ONLY=hoy,carta limita las pantallas. WIDTHS=390,1280 elige anchos.
const STATE = SHOTS + "state.json";
const REUSE = process.env.REUSE === "1" && existsSync(STATE);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const WIDTHS = (process.env.WIDTHS || "1280,390").split(",").map(Number);

const email = `recorrido+${Date.now()}@example.com`;
const b = await launch();
const errors = [];
const results = [];

async function visit(page, W, name, path) {
  const errsBefore = errors.length;
  const r = await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const ov = await noOverflow(page);
  await tallShot(page, `${SHOTS}r${W}-${name}.png`);
  const st = r?.status();
  const newErr = errors.slice(errsBefore);
  const ok = st === 200 && !ov.length && !newErr.length;
  results.push({ W, name, path, st, ov, errs: newErr.length });
  console.log(ok ? "✓" : "✗", W, name, st, ov.length ? "overflow:" + ov.join("|") : "", newErr.length ? newErr.join(" ‖ ").slice(0, 300) : "");
}

try {
  const ctxD = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", ...(REUSE ? { storageState: STATE } : {}) });
  const page = await ctxD.newPage();
  watch(page, errors);
  if (!REUSE) {
    await signup(page, { email });
    console.log("✓ alta");
    const t0 = Date.now();
    await cargarDemo(page);
    console.log("✓ demo cargada en", Date.now() - t0, "ms");
    writeFileSync(STATE, JSON.stringify(await ctxD.storageState()));
  }

  const { ids, rutas } = await rutasDeLaApp(page);
  console.log("ids", JSON.stringify(ids));
  const pages = rutas.filter(([n]) => !ONLY || ONLY.includes(n));
  const state = await ctxD.storageState();
  for (const W of WIDTHS) {
    const mobile = W < 700;
    const cx = await b.newContext({ viewport: { width: W, height: mobile ? 844 : 860 }, locale: "es-ES", storageState: state, isMobile: mobile, hasTouch: mobile });
    const pg = await cx.newPage();
    watch(pg, errors);
    for (const [n, p] of pages) await visit(pg, W, n, p);
    await cx.close();
  }
  const bad = results.filter((r) => r.st !== 200 || r.ov.length || r.errs);
  console.log(`\n${results.length - bad.length}/${results.length} pantallas sin problemas`);
  if (bad.length) process.exitCode = 1;
} finally {
  console.log("errores:", errors.length ? errors.slice(0, 20) : "ninguno");
  if (errors.length) process.exitCode = 1;
  await b.close();
}
