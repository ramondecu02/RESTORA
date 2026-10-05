// Lleva una imagen generada (png, jpg o webp) a su hueco de la web: recorta a la proporción exacta, convierte a .webp y la deja en public/images/.
// Uso: node scripts/importar-imagen.mjs <archivo> <hueco>
// Huecos: sobre-nosotros (1200×1500, 4:5) · video-poster (1600×900, 16:9). Las variantes responsive las genera `npm run build:cf`.
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const HUECOS = {
  "sobre-nosotros": { ancho: 1200, alto: 1500 },
  "video-poster": { ancho: 1600, alto: 900 },
};
const [, , archivo, hueco] = process.argv;
if (!archivo || !HUECOS[hueco]) {
  console.error(`Uso: node scripts/importar-imagen.mjs <archivo> <${Object.keys(HUECOS).join("|")}>`);
  process.exit(1);
}
if (!existsSync(archivo)) { console.error("No existe el archivo:", archivo); process.exit(1); }

const { ancho, alto } = HUECOS[hueco];
const meta = await sharp(archivo).metadata();
if ((meta.width ?? 0) < ancho * 0.8) console.warn(`⚠ La imagen mide ${meta.width}×${meta.height}: queda por debajo de lo ideal (${ancho}×${alto}); se verá blanda en pantallas grandes.`);
const salida = path.join("public/images", `${hueco}.webp`);
mkdirSync(path.dirname(salida), { recursive: true });
await sharp(archivo).rotate().resize({ width: ancho, height: alto, fit: "cover", position: "attention", withoutEnlargement: false }).webp({ quality: 82, effort: 5 }).toFile(salida);
console.log(`✓ ${salida} (${ancho}×${alto})`);
