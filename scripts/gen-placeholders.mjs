import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Generates elegant on-brand placeholder images so the landing looks complete
// before the real photos are dropped in. Each is an intentional brand gradient
// with a faint RESTORA glyph — NOT a broken-image box. Replace by overwriting
// the same filename with a real photo.

const OUT = resolve(process.argv[2] ?? "public/images");
mkdirSync(OUT, { recursive: true });

// [file, width, height, topColor, bottomColor, glyphOpacity]
const IMAGES = [
  ["hero.jpg", 1600, 900, "#2b5a44", "#12241b", 0.10],        // home band (dark overlay on top)
  ["chef.jpg", 1500, 950, "#356b51", "#16281f", 0.10],        // como-funciona hero
  ["chef2.jpg", 1500, 950, "#3e8e6a", "#1b3a2c", 0.10],       // funcionalidades hero
  ["restaurante.jpg", 1300, 980, "#e8efe9", "#c3d3c7", 0.14], // contacto (light)
  ["plato.jpg", 700, 700, "#e9dcc4", "#b98e5a", 0.16],        // escandallo thumbnail
];

function svg(w, h, top, bottom, glyphOpacity) {
  // Glyph: the RESTORA "rising line in a circle" mark, scaled large and faint.
  const gx = w * 0.5;
  const gy = h * 0.5;
  const s = Math.min(w, h) * 0.42; // glyph radius-ish
  const stroke = Math.max(3, s * 0.05);
  // rising polyline within the glyph box
  const bx = gx - s;
  const by = gy + s * 0.35;
  const p1 = `${gx - s * 0.85},${gy + s * 0.35}`;
  const p2 = `${gx - s * 0.25},${gy - s * 0.02}`;
  const p3 = `${gx + s * 0.2},${gy + s * 0.18}`;
  const p4 = `${gx + s * 0.82},${gy - s * 0.62}`;
  const light = "#ffffff";
  const isLight = top.toLowerCase() === "#e8efe9" || top.toLowerCase() === "#e9dcc4";
  const glyphColor = isLight ? "#1e3d2f" : light;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${top}"/>
        <stop offset="1" stop-color="${bottom}"/>
      </linearGradient>
      <radialGradient id="r" cx="0.7" cy="0.25" r="0.9">
        <stop offset="0" stop-color="${light}" stop-opacity="${isLight ? 0.35 : 0.12}"/>
        <stop offset="1" stop-color="${light}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#r)"/>
    <g opacity="${glyphOpacity}" fill="none" stroke="${glyphColor}" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="${gx}" cy="${gy}" r="${s}" stroke-width="${stroke * 0.8}" opacity="0.6"/>
      <polyline points="${p1} ${p2} ${p3} ${p4}" stroke-width="${stroke}"/>
      <circle cx="${gx + s * 0.82}" cy="${gy - s * 0.62}" r="${stroke * 1.1}" fill="${glyphColor}" stroke="none"/>
    </g>
  </svg>`);
}

for (const [file, w, h, top, bottom, op] of IMAGES) {
  await sharp(svg(w, h, top, bottom, op))
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(resolve(OUT, file));
  console.log("✓", file, `${w}×${h}`);
}
console.log("Done →", OUT);
