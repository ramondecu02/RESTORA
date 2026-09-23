// Ejecuta todas las pruebas de extremo a extremo contra E2E_BASE (por defecto http://localhost:3100).
// Requiere la app arrancada (npm run dev, o npm run build:app && npm start) con EMAIL_PROVIDER=dev y
// OCR_PROVIDER=mock, y Postgres accesible en DATABASE_URL.
import { spawnSync } from "node:child_process";

const suites = [
  ["Alta y primer albarán", "smoke.mjs"],
  ["Recorrido de pantallas (390 y 1280)", "recorrido.mjs"],
  ["Flujos con comprobación en base de datos", "flujos.mjs"],
  ["Aislamiento entre negocios (RLS)", "rls.mjs"],
];
let failed = 0;
for (const [name, file] of suites) {
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(process.execPath, [new URL(file, import.meta.url).pathname], { stdio: "inherit", env: process.env });
  if (r.status !== 0) { failed++; console.log(`✗ ${name} (código ${r.status})`); }
}
console.log(failed ? `\n✗ ${failed} de ${suites.length} bloques con fallos` : `\n✓ ${suites.length} bloques correctos`);
process.exit(failed ? 1 : 0);
