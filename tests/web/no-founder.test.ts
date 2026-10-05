// El encargo del propietario (5/10/2026): la web ya no habla de «socios fundadores» ni de «beta / estamos empezando», y no da por vigentes
// los precios de septiembre (89 / 149 / 179 €) hasta que él confirme los planes (decisión D1). Esta prueba falla si algo de eso reaparece.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ABOUT_BIO_READY } from "../../lib/site";
import { sobreCopy } from "../../lib/copy/sobre";

const RAIZ = process.cwd();
const PROHIBIDO: [RegExp, string][] = [
  [/fundador/i, "«fundador/es» (ES/CA)"],
  [/founder/i, "«founder»"],
  [/\bbeta\b/i, "«beta»"],
  [/plazas? limitadas?|places? limitades?/i, "«plazas limitadas»"],
  [/primeros restaurantes|primers restaurants/i, "«primeros restaurantes»"],
  [/estamos (empezando|arrancando)|estem (començant|arrencant)|arrancamos con|arrenquem amb/i, "«estamos empezando / arrancando»"],
  [/acceso anticipado|accés anticipat|vista previa|vista prèvia/i, "«acceso anticipado / vista previa»"],
  [/\b(89|149|179)\s*(€|euros)/i, "un precio de los planes de septiembre (89 / 149 / 179 €)"],
];

function fuentes(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) fuentes(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(f)) out.push(p);
  }
  return out;
}
const archivos = ["lib", "app", "components", "functions", "cloudflare"].flatMap((d) => fuentes(path.join(RAIZ, d)));

test("ningún texto de la web habla de fundadores, beta, plazas limitadas ni de los precios de septiembre", () => {
  const hallazgos: string[] = [];
  for (const f of archivos) {
    readFileSync(f, "utf8").split("\n").forEach((linea, i) => {
      for (const [patron, nombre] of PROHIBIDO) {
        if (patron.test(linea)) hallazgos.push(`${path.relative(RAIZ, f)}:${i + 1} · ${nombre} · ${linea.trim().slice(0, 110)}`);
      }
    });
  }
  assert.deepEqual(hallazgos, [], "\n" + hallazgos.join("\n"));
});

test("hay archivos que revisar (la búsqueda no es vacía)", () => {
  assert.ok(archivos.length > 60, `solo se han leído ${archivos.length} archivos`);
  assert.ok(archivos.some((f) => f.endsWith("site-copy.ts")));
});

test("el cargo y la biografía de «Sobre nosotros» no llegan a la web mientras sean [PENDIENTE]", () => {
  for (const loc of ["es", "ca"] as const) {
    const textos = [sobreCopy[loc].who.role, ...sobreCopy[loc].who.bio];
    const pendientes = textos.filter((t) => /\[PEND/i.test(t));
    if (ABOUT_BIO_READY) assert.deepEqual(pendientes, [], `ABOUT_BIO_READY está en true pero quedan textos pendientes (${loc})`);
    else assert.ok(pendientes.length > 0, `ABOUT_BIO_READY está en false pero los textos (${loc}) ya parecen reales: ponlo en true`);
  }
});
