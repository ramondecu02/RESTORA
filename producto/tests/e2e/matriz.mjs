// Matriz de anchos: todas las pantallas de la app a 390, 768, 1093, 1280 y 1440 px.
// En cada una comprueba: respuesta 200, errores de consola, desbordamiento horizontal y controles tapados por otro elemento.
// REUSE=1 reutiliza la sesión de la ejecución anterior. WIDTHS=390,1280 limita los anchos. ONLY=hoy,carta limita las pantallas.
import { BASE, SHOTS, launch, watch, noOverflow, tapados, tallShot, rutasDeLaApp, negocioDeEjemplo } from "./lib.mjs";

const ANCHOS = (process.env.WIDTHS || "390,768,1093,1280,1440").split(",").map(Number);
const SOLO = process.env.ONLY ? process.env.ONLY.split(",") : null;
const b = await launch();
const errores = [];
let total = 0;
let mal = 0;
try {
  const state = await negocioDeEjemplo(b, "matriz");
  const cx0 = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES", storageState: state });
  const { rutas } = await rutasDeLaApp(await cx0.newPage());
  await cx0.close();
  const aVisitar = rutas.filter(([n]) => !SOLO || SOLO.includes(n));

  for (const W of ANCHOS) {
    const movil = W < 700;
    const cx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 860 }, locale: "es-ES", storageState: state, isMobile: movil, hasTouch: movil });
    const page = await cx.newPage();
    watch(page, errores);
    let malAqui = 0;
    for (const [n, p] of aVisitar) {
      total++;
      const antes = errores.length;
      const r = await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const desborde = await noOverflow(page);
      const pisados = await tapados(page);
      const nuevos = errores.slice(antes);
      if (r?.status() === 200 && !desborde.length && !pisados.length && !nuevos.length) continue;
      malAqui++; mal++;
      console.log("✗", W, n, r?.status(), desborde.length ? "desborde: " + desborde.join(" | ") : "", pisados.length ? `tapados (${pisados.length}): ` + pisados.slice(0, 4).join(" | ") : "", nuevos.length ? nuevos.join(" ‖ ").slice(0, 300) : "");
      await tallShot(page, `${SHOTS}m${W}-${n}.png`);
    }
    if (!malAqui) console.log(`✓ ${W} px: ${aVisitar.length} pantallas sin desbordes, sin controles tapados y sin errores`);
    await cx.close();
  }
  console.log(`\n${total - mal}/${total} comprobaciones sin problemas`);
  if (mal) process.exitCode = 1;
} finally {
  console.log("errores de consola:", errores.length ? errores.slice(0, 20) : "ninguno");
  if (errores.length) process.exitCode = 1;
  await b.close();
}
