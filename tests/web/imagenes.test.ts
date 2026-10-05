// Las imágenes de la web: cada una que se usa existe, no sobran, miden lo que su hueco pide y su texto alternativo está en los dos idiomas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getSiteCopy } from "../../lib/site-copy";

const RAIZ = process.cwd();
const IMAGENES = path.join(RAIZ, "public/images");

function fuentes(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) fuentes(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}
const usadas = new Set<string>();
for (const d of ["app", "components", "lib"]) {
  for (const f of fuentes(path.join(RAIZ, d))) {
    for (const m of readFileSync(f, "utf8").matchAll(/\/images\/([\w-]+)\.webp/g)) usadas.add(m[1]);
  }
}
const enDisco = readdirSync(IMAGENES).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, ""));

test("cada imagen que usa la web existe en public/images", () => {
  const faltan = [...usadas].filter((n) => !existsSync(path.join(IMAGENES, `${n}.webp`)));
  assert.deepEqual(faltan, []);
});

test("no sobra ninguna imagen: todas las de public/images se usan en alguna página", () => {
  assert.deepEqual(enDisco.filter((n) => !usadas.has(n)), []);
});

test("las imágenes de cada hueco miden lo que el hueco pide", async () => {
  const huecos: Record<string, [number, number]> = {
    "sobre-nosotros": [1200, 1500],
    "video-poster": [1600, 900],
    recepcion: [1400, 1120],
    "sala-servicio": [1800, 1000],
    "explorar-funcionalidades": [1200, 750],
    "explorar-como-funciona": [1200, 750],
    "explorar-precios": [1200, 750],
    "captura-hoy-escritorio": [1600, 1000],
    "captura-avisos-escritorio": [1600, 1000],
    "captura-compras-escritorio": [1600, 1000],
    "captura-escandallos-escritorio": [1600, 1000],
    "captura-proveedores-escritorio": [1600, 1000],
    "captura-hoy-movil": [780, 1688],
  };
  for (const [nombre, [ancho, alto]] of Object.entries(huecos)) {
    const m = await sharp(path.join(IMAGENES, `${nombre}.webp`)).metadata();
    assert.equal(`${m.width}×${m.height}`, `${ancho}×${alto}`, nombre);
  }
});

test("el texto alternativo de las fotografías existe en castellano y en catalán, y no es el mismo texto", () => {
  const es = getSiteCopy("es").images as Record<string, string>;
  const ca = getSiteCopy("ca").images as Record<string, string>;
  assert.deepEqual(Object.keys(ca).sort(), Object.keys(es).sort());
  for (const [clave, texto] of Object.entries(es)) {
    assert.ok(texto.trim().length >= 12, `«${clave}» (es) demasiado corto`);
    assert.ok(ca[clave].trim().length >= 12, `«${clave}» (ca) demasiado corto`);
    assert.notEqual(ca[clave], texto, `«${clave}» está en castellano en las dos versiones`);
    assert.doesNotMatch(texto + " " + ca[clave], /generad[ao]|generada|imagen de ia|image generated/i, `«${clave}» describe cómo se hizo en vez de lo que se ve`);
  }
});

test("el pie avisa de que las imágenes son ilustrativas y algunas generadas con IA, en los dos idiomas", () => {
  for (const loc of ["es", "ca"] as const) {
    const nota = getSiteCopy(loc).footer.imagesNote;
    assert.match(nota, /IA/);
    assert.ok(nota.length > 30);
  }
});
