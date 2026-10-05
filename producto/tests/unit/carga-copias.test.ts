// La prueba de carga (tests/carga/hoy.mjs) mide con consultas que la app lleva dentro de funciones que no se pueden llamar desde fuera de Next: las de la
// pantalla de Compras (tests/carga/consultas-compras.mjs) y las de la sesión de cada petición (tests/carga/consultas-marco.mjs). Esta prueba evita que
// esas copias envejezcan en silencio: cada fragmento tiene que seguir idéntico en su archivo (sin contar espacios ni saltos de línea) y la pantalla de
// Compras no puede tener más consultas que la copia.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const cargar = async <T>(f: string) => (await import(/* @vite-ignore */ pathToFileURL(path.join(RAIZ, "tests/carga", f)).href)) as T;
const { FRAGMENTOS } = await cargar<{ FRAGMENTOS: string[] }>("consultas-compras.mjs");
const { COPIAS } = await cargar<{ COPIAS: { archivo: string; fragmentos: string[] }[] }>("consultas-marco.mjs");
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const leer = (archivo: string) => readFileSync(path.join(RAIZ, archivo), "utf8");
const COMPRAS = "src/app/(app)/compras/page.tsx";
const AYUDA = (archivo: string, copia: string) => `${archivo} ha cambiado: actualiza tests/carga/${copia} con la consulta nueva (y vuelve a medir con tests/carga/hoy.mjs).`;

describe("copia de las consultas de Compras para la prueba de carga", () => {
  const pagina = norm(leer(COMPRAS));
  it("tiene fragmentos que vigilar", () => {
    expect(FRAGMENTOS.length).toBeGreaterThanOrEqual(8);
  });
  it.each(FRAGMENTOS.map((f, i) => [i, norm(f).slice(0, 70)] as const))("el fragmento %i («%s…») sigue idéntico en la pantalla", (i) => {
    expect(pagina.includes(norm(FRAGMENTOS[i])), AYUDA(COMPRAS, "consultas-compras.mjs")).toBe(true);
  });
  it("la pantalla no tiene más consultas que la copia", () => {
    const cuerpo = (leer(COMPRAS).match(/async function ComprasContenido[\s\S]*?\n}\n/) ?? [""])[0];
    expect(cuerpo.length).toBeGreaterThan(500);
    // Las siete de la copia: lista, resumen del mes, cuenta por estado, gasto por proveedor, artículos que más pesan, su serie y proveedores
    expect((cuerpo.match(/await (?:all|one)</g) ?? []).length, AYUDA(COMPRAS, "consultas-compras.mjs")).toBe(7);
  });
});

describe("copia de las consultas de la sesión de cada petición para la prueba de carga", () => {
  it("vigila la sesión y el negocio del usuario", () => {
    expect(COPIAS.map((c) => c.archivo)).toEqual(["src/server/session.ts", "src/server/ctx.ts"]);
  });
  for (const c of COPIAS) {
    it.each(c.fragmentos.map((f, i) => [i, norm(f).slice(0, 70)] as const))(`${c.archivo}: el fragmento %i («%s…») sigue idéntico`, (i) => {
      expect(norm(leer(c.archivo)).includes(norm(c.fragmentos[i])), AYUDA(c.archivo, "consultas-marco.mjs")).toBe(true);
    });
  }
});
