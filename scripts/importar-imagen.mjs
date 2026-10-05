// Lleva una imagen generada (png, jpg, jfif o webp) a su hueco de la web: recorta a la proporción exacta, convierte a .webp y la deja en public/images/.
// Uso: node scripts/importar-imagen.mjs <archivo> <hueco> [--recorte=izquierda,arriba,ancho,alto]
//   --recorte: zona que se conserva, en fracciones de 0 a 1 de la imagen original (0,0,0.44,1 = el 44 % de la izquierda, a toda altura).
//   Sin --recorte se recorta hacia el centro de interés. Las variantes responsive las genera `npm run build:cf`.
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const HUECOS = {
  "sobre-nosotros": { ancho: 1200, alto: 1500 }, // 4:5 · Sobre nosotros, «Quién está detrás»
  "video-poster": { ancho: 1600, alto: 900 }, // 16:9 · miniatura del vídeo de la home
  recepcion: { ancho: 1400, alto: 1120 }, // 5:4 · home, fila «Proveedores»
  "sala-servicio": { ancho: 1800, alto: 1000 }, // 16:9 · Sobre nosotros, banda de la tesis
  "explorar-funcionalidades": { ancho: 1200, alto: 750 }, // 16:10 · home, tarjetas de «Explora»
  "explorar-como-funciona": { ancho: 1200, alto: 750 },
  "explorar-precios": { ancho: 1200, alto: 750 },
};
const args = process.argv.slice(2);
const [archivo, hueco] = args.filter((a) => !a.startsWith("--"));
const recorteArg = args.find((a) => a.startsWith("--recorte="));
if (!archivo || !HUECOS[hueco]) {
  console.error(`Uso: node scripts/importar-imagen.mjs <archivo> <${Object.keys(HUECOS).join("|")}> [--recorte=izquierda,arriba,ancho,alto]`);
  process.exit(1);
}
if (!existsSync(archivo)) { console.error("No existe el archivo:", archivo); process.exit(1); }

const { ancho, alto } = HUECOS[hueco];
const meta = await sharp(archivo).metadata();
const girada = (meta.orientation ?? 1) >= 5; // con la orientación EXIF ya aplicada el ancho y el alto se cruzan
const W = girada ? meta.height : meta.width;
const H = girada ? meta.width : meta.height;

let imagen = sharp(archivo).rotate();
let anchoUtil = W;
if (recorteArg) {
  const [x, y, w, h] = recorteArg.slice("--recorte=".length).split(",").map(Number);
  if ([x, y, w, h].some((n) => !Number.isFinite(n)) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) {
    console.error("--recorte necesita cuatro fracciones entre 0 y 1 que quepan en la imagen (izquierda, arriba, ancho, alto).");
    process.exit(1);
  }
  const zona = { left: Math.round(x * W), top: Math.round(y * H), width: Math.min(Math.round(w * W), W - Math.round(x * W)), height: Math.min(Math.round(h * H), H - Math.round(y * H)) };
  const desvio = Math.abs(zona.width / zona.height / (ancho / alto) - 1);
  if (desvio > 0.02) console.warn(`⚠ La zona elegida no tiene la proporción del hueco (${(zona.width / zona.height).toFixed(3)} frente a ${(ancho / alto).toFixed(3)}): se recortará un poco más hacia el centro de interés.`);
  imagen = imagen.extract(zona);
  anchoUtil = zona.width;
}
if (anchoUtil < ancho * 0.8) console.warn(`⚠ La zona útil mide ${anchoUtil} px de ancho: queda por debajo de lo ideal (${ancho}×${alto}); se verá blanda en pantallas grandes.`);
const salida = path.join("public/images", `${hueco}.webp`);
mkdirSync(path.dirname(salida), { recursive: true });
await imagen.resize({ width: ancho, height: alto, fit: "cover", position: "attention", withoutEnlargement: false }).webp({ quality: 82, effort: 5 }).toFile(salida);
console.log(`✓ ${salida} (${ancho}×${alto})`);
