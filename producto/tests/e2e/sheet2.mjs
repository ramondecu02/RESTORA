// Hoja de contactos con sharp: node sheet2.mjs out.png H file1 file2 ... (recorta cada captura a H px de alto)
import sharp from "sharp";
import { SHOTS } from "./lib.mjs";
const [out, H, ...files] = process.argv.slice(2);
const h = Number(H), gap = 12;
const metas = await Promise.all(files.map((f) => sharp(SHOTS + f).metadata()));
const W = metas.reduce((s, m) => s + m.width, 0) + gap * (files.length - 1);
const parts = await Promise.all(files.map(async (f, i) => ({ input: await sharp(SHOTS + f).extract({ left: 0, top: 0, width: metas[i].width, height: Math.min(h, metas[i].height) }).toBuffer(), top: 0, left: metas.slice(0, i).reduce((s, m) => s + m.width + gap, 0) })));
await sharp({ create: { width: W, height: h, channels: 3, background: "#888" } }).composite(parts).png().toFile(out);
console.log(out, W + "x" + h);
