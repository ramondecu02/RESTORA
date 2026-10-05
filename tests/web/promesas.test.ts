// Auditoría de promesas de la web (docs/AUDITORIA-CONVERSION.md): lo que se retiró porque el producto no lo hace hoy no puede volver.
// Cada frase se comprobó contra el producto real; si un día existe (varios locales, previsión, conexión con el TPV…), se quita de aquí a la vez que se vuelve a prometer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const RETIRADO: [RegExp, string][] = [
  [/comparar entre locales|comparar entre locals|Pequeño grupo|Petit grup/i, "varios locales: la app gestiona un local por negocio (D2 sin decidir)"],
  [/tercera (subida|pujada) seguida|tres (subidas|pujades) seguid|racha de subidas/i, "rachas de subidas: el aviso compara con la compra anterior, no detecta tendencias"],
  [/(en|dins de) (las últimas )?(seis|6) semanas|(en|en les) (últimes )?(sis|6) setmanes/i, "«en seis semanas»: no hay ventana de tendencia"],
  [/se compara con todo tu histórico|es compara amb tot el teu històric/i, "el aviso compara con la compra anterior"],
  [/se marquen solas|es marquin soles/i, "la checklist: nada se marca solo"],
  [/fin de semana pesa|cap de setmana pesa/i, "análisis por día de la semana: no existe"],
  [/Caso real|Cas real|ejemplo real|exemple real/i, "los casos de las demos son de ejemplo, no reales"],
  [/Entra un albarán\. Nada más|Entra un albarà\. Res més/i, "tras leer el albarán hay que revisarlo y confirmarlo"],
  [/única vez que tecleas|única vegada que teclejes/i, "no hay importador de recetas: se montan los escandallos"],
  [/se mantiene solo|es manté sol|se construye solo|es construeix sol/i, "nada se mantiene solo: se actualiza con cada albarán que se confirma"],
  [/Alerta antes de la rotura|Alerta abans de la ruptura/i, "el aviso es «bajo mínimo», no una previsión de rotura"],
  [/Detección de anomalías|Detecció d'anomalies|Previsión\b|Previsió\b/i, "previsión y detección de anomalías: no existen"],
  [/Cuando tu TPV está conectado|Quan el teu TPV està connectat/i, "conexión con el TPV: no existe"],
  [/no se comparten con terceros|no es comparteixen amb tercers/i, "las fotos de los albaranes se envían al proveedor de IA que las lee"],
  [/Distribución de costes|Informes|Configuración/, "módulos del panel de ejemplo que la app no tiene"],
  [/Costes"\s*\}|"Costes"/, "módulo «Costes» que la app no tiene"],
];

function fuentes(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) fuentes(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}
const archivos = [...["lib", "app", "components"].flatMap((d) => fuentes(path.join(RAIZ, d))), path.join(RAIZ, "scripts/checklist.mjs")];

test("ningún texto de la web vuelve a prometer lo que el producto no hace", () => {
  const hallazgos: string[] = [];
  for (const f of archivos) {
    readFileSync(f, "utf8").split("\n").forEach((linea, i) => {
      for (const [patron, motivo] of RETIRADO) {
        if (patron.test(linea)) hallazgos.push(`${path.relative(RAIZ, f)}:${i + 1} · ${motivo} · ${linea.trim().slice(0, 100)}`);
      }
    });
  }
  assert.deepEqual(hallazgos, [], "\n" + hallazgos.join("\n"));
});

test("la barra de navegación solo recibe sus etiquetas, no todo el texto de la web", () => {
  const servidor = readFileSync(path.join(RAIZ, "components/site/nav.tsx"), "utf8");
  const cliente = readFileSync(path.join(RAIZ, "components/site/nav-client.tsx"), "utf8");
  assert.doesNotMatch(servidor, /"use client"/);
  assert.match(servidor, /nav=\{copy\.nav\}/);
  assert.match(cliente, /^"use client"/);
  assert.doesNotMatch(cliente, /copy: SiteCopy/);
});

test("no queda en la web texto que nadie ve pero que se publica (claves de copy sin uso)", () => {
  const copy = readFileSync(path.join(RAIZ, "lib/site-copy.ts"), "utf8");
  assert.doesNotMatch(copy, /^  faq: \{/m, "la FAQ de site-copy está duplicada en lib/copy/preguntas.ts");
  assert.doesNotMatch(copy, /^  conexion: \{/m, "la conexión con el TPV no existe");
  assert.doesNotMatch(copy, /^    chips: \[/m, "las etiquetas del hero prometían «automatización»");
  assert.doesNotMatch(copy, /^    cards: \[\n      \{ icon/m, "las tarjetas de funcionalidades prometían previsión y automatizaciones");
});
