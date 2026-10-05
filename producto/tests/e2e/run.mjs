// Ejecuta todas las pruebas de extremo a extremo contra E2E_BASE (por defecto http://localhost:3100).
// Requiere la app arrancada (npm run dev, o npm run build:app && npm start) con EMAIL_PROVIDER=dev y
// OCR_PROVIDER=mock, y Postgres accesible en DATABASE_URL. Con npm start (producción) añade también
// ALLOW_DEV_MAILBOX=1: sin buzón de pruebas, en producción los correos cuentan como no enviados.
import { spawnSync } from "node:child_process";

const suites = [
  ["Alta y primer albarán", "smoke.mjs"],
  ["Recorrido de pantallas (390 y 1280)", "recorrido.mjs"],
  ["Flujos con comprobación en base de datos", "flujos.mjs"],
  ["Aislamiento entre negocios (RLS)", "rls.mjs"],
  ["Prueba gratuita y bloqueo", "plan.mjs"],
  ["Calidad de la lectura (descuento, portes, dudas)", "calidad.mjs"],
  ["Borrar albaranes (impacto, ventas con coste congelado)", "borrado.mjs"],
  ["Panel Hoy (atención, mes elegido, cifras que cuentan)", "hoy.mjs"],
  ["Pantallas renovadas (fichas, filtros, orden, esqueleto)", "pantallas.mjs"],
  ["Matriz de anchos (390 a 1440, todas las pantallas)", "matriz.mjs"],
  ["Accesibilidad (axe, WCAG 2.2 AA) y foco al tabular", "a11y.mjs"],
];
// ONLY=plan,hoy ejecuta solo los bloques cuyo fichero empieza así
const solo = process.env.ONLY ? process.env.ONLY.split(",") : null;
let failed = 0;
for (const [name, file] of suites.filter(([, f]) => !solo || solo.some((s) => f.startsWith(s)))) {
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(process.execPath, [new URL(file, import.meta.url).pathname], { stdio: "inherit", env: process.env });
  if (r.status !== 0) { failed++; console.log(`✗ ${name} (código ${r.status})`); }
}
const n = solo ? suites.filter(([, f]) => solo.some((s) => f.startsWith(s))).length : suites.length;
console.log(failed ? `\n✗ ${failed} de ${n} bloques con fallos` : `\n✓ ${n} bloques correctos`);
process.exit(failed ? 1 : 0);
