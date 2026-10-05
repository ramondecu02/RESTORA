// Capturas REALES del producto para la web: abre la app con un negocio de ejemplo (el que crea la prueba e2e: alta completa y datos de ejemplo)
// y guarda cada pantalla como .webp en public/images/ (captura-*.webp). Nada se retoca: lo que se ve es lo que hace la app.
// Uso:  node scripts/capturas.mjs [pantalla ...]      (sin argumentos, todas)
// Requiere la app en marcha (E2E_BASE, por defecto http://localhost:3100, con ALLOW_DEV_MAILBOX=1), su base de datos local (DATABASE_URL) y Chromium (CHROMIUM_PATH).
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { BASE, launch, negocioDeEjemplo } from "../producto/tests/e2e/lib.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TMP = resolve(RAIZ, "node_modules/.cache/capturas");
mkdirSync(TMP, { recursive: true });

// ancho / alto de la ventana, y el ancho final de la imagen (la ventana se captura al doble de resolución)
const PANTALLAS = {
  "hoy-escritorio": { ruta: "/hoy", ancho: 1280, alto: 800, final: 1600 },
  "hoy-movil": { ruta: "/hoy", ancho: 390, alto: 844, final: 780 },
  "avisos-escritorio": { ruta: "/hoy/avisos", ancho: 1280, alto: 800, final: 1600 },
  "compras-escritorio": { ruta: "/compras", ancho: 1280, alto: 800, final: 1600 },
  "escandallos-escritorio": { ruta: "/escandallos", ancho: 1280, alto: 800, final: 1600 },
  "proveedores-escritorio": { ruta: "/proveedores", ancho: 1280, alto: 800, final: 1600 },
};
const pedidas = process.argv.slice(2);
const elegidas = Object.entries(PANTALLAS).filter(([id]) => pedidas.length === 0 || pedidas.includes(id));
if (elegidas.length === 0) { console.error("Pantallas posibles:", Object.keys(PANTALLAS).join(", ")); process.exit(1); }

const navegador = await launch();
const estado = await negocioDeEjemplo(navegador, "capturas-web");
for (const [id, p] of elegidas) {
  const cx = await navegador.newContext({ viewport: { width: p.ancho, height: p.alto }, deviceScaleFactor: 2, locale: "es-ES", colorScheme: "light", reducedMotion: "reduce", storageState: estado });
  const page = await cx.newPage();
  await page.goto(BASE + p.ruta, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // las cifras cuentan hasta su valor
  const png = resolve(TMP, `${id}.png`);
  await page.screenshot({ path: png, caret: "initial" });
  const salida = resolve(RAIZ, "public/images", `captura-${id}.webp`);
  await sharp(png).resize({ width: p.final }).webp({ quality: 84, effort: 5 }).toFile(salida);
  console.log(`✓ public/images/captura-${id}.webp (${p.final}px)`);
  await cx.close();
}
await navegador.close();
rmSync(TMP, { recursive: true, force: true });
process.exit(0);
