// Recorta una zona de una captura: node crop.mjs in.png out.png x y w h
import sharp from "sharp";
const [inp, out, x, y, w, h] = process.argv.slice(2);
const meta = await sharp(inp).metadata();
const L = Math.max(0, +x), T = Math.max(0, +y);
await sharp(inp).extract({ left: L, top: T, width: Math.min(+w, meta.width - L), height: Math.min(+h, meta.height - T) }).toFile(out);
console.log(meta.width + "x" + meta.height);
