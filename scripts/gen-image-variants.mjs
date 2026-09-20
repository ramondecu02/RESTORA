// Pre-renders width variants of every public/images/*.webp for the static
// export (see lib/image-loader.ts). Output is git-ignored; runs inside
// `npm run build:cf`. Idempotent: existing up-to-date variants are kept.
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/images";
const OUT = path.join(SRC, "_w");
const WIDTHS = [128, 256, 480, 768, 1080, 1440, 1920];

mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => f.endsWith(".webp"));
let made = 0;
for (const file of files) {
  const input = path.join(SRC, file);
  const name = file.replace(/\.webp$/, "");
  const srcTime = statSync(input).mtimeMs;
  for (const w of WIDTHS) {
    const target = path.join(OUT, `${name}-${w}.webp`);
    if (existsSync(target) && statSync(target).mtimeMs >= srcTime) continue;
    // Never upscale: a 1200px source rendered at "1920" stays 1200px wide.
    await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(target);
    made++;
  }
}
console.log(`✓ image variants: ${files.length} sources × ${WIDTHS.length} widths (${made} written)`);
