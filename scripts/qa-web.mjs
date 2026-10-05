// QA de la web exportada (out/): sirve la exportación con compresión, como Cloudflare Pages, y la recorre en Chromium.
// Por cada página × idioma × ancho × tema comprueba: desborde horizontal, imágenes rotas, errores de consola y de red, textos cortados, accesibilidad (axe, WCAG 2.2 AA)
// y, para los textos sobre foto o degradado que axe no sabe medir, el contraste REAL: oculta el texto, fotografía el fondo que queda detrás de cada línea y mide el punto
// más desfavorable (percentil 3 y 97 de luminancia) contra el color del texto con su opacidad. Mínimo 4,5:1 (3:1 en texto grande).
// Uso:   npm run build:cf && npm run qa:web [-- --rapido] [--idiomas=es,ca] [--temas=light,dark] [--anchos=390,768,1280] [--rutas=precios,contacto]
//        --rapido = solo castellano y dos anchos (390 y 1280). Sin opciones, todo (unos 10 minutos).
// Las páginas salen de out/sitemap.xml (más /marca, el kit de marca). Requiere Chromium (CHROMIUM_PATH o /opt/pw-browsers/chromium, como scripts/checklist.mjs). Código de salida 1 si hay problemas.
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import http from "node:http";
import zlib from "node:zlib";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const AXE = require.resolve("axe-core/axe.min.js");
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(RAIZ, "out");
if (!existsSync(join(OUT, "sitemap.xml"))) { console.error("No hay exportación en out/: ejecuta antes npm run build:cf"); process.exit(1); }

const arg = (nombre, defecto) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split("=")[1] ?? defecto;
const RAPIDO = process.argv.includes("--rapido");
const IDIOMAS = arg("idiomas", RAPIDO ? "es" : "es,ca").split(",");
const TEMAS = arg("temas", "light,dark").split(",");
const ANCHOS = arg("anchos", RAPIDO ? "390,1280" : "390,768,1280").split(",").map(Number);
const FILTRO = arg("rutas", "").split(",").filter((s) => s !== "");
const ALTO = 900;
const ETIQUETAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// ---- Servidor estático con compresión y caché (la caché depende del archivo y de su fecha: una reconstrucción nunca sirve lo antiguo)
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".txt": "text/plain", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf", ".xml": "application/xml", ".ico": "image/x-icon" };
const COMPRIMIBLE = new Set([".html", ".js", ".css", ".svg", ".json", ".txt", ".xml"]);
const comprimidos = new Map();
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const f = [p, p + ".html", join(p, "index.html")].map((c) => join(OUT, c)).find((c) => existsSync(c) && statSync(c).isFile());
  if (!f) { res.writeHead(404, { "content-type": "text/plain" }); res.end("404"); return; }
  const ext = extname(f);
  const cabeceras = { "content-type": TIPOS[ext] || "application/octet-stream", "cache-control": "public, max-age=0, must-revalidate" };
  const acepta = String(req.headers["accept-encoding"] || "");
  const codec = COMPRIMIBLE.has(ext) ? (/\bbr\b/.test(acepta) ? "br" : /\bgzip\b/.test(acepta) ? "gzip" : null) : null;
  if (!codec) { res.writeHead(200, cabeceras); createReadStream(f).pipe(res); return; }
  const clave = codec + f + statSync(f).mtimeMs;
  if (!comprimidos.has(clave)) {
    const buf = readFileSync(f);
    comprimidos.set(clave, codec === "br" ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }) : zlib.gzipSync(buf));
  }
  const salida = comprimidos.get(clave);
  res.writeHead(200, { ...cabeceras, "content-encoding": codec, vary: "accept-encoding", "content-length": salida.length });
  res.end(salida);
});
await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

// ---- Páginas: las del sitemap, filtradas por idioma y, si se pide, por trozo de ruta
const sitemap = readFileSync(join(OUT, "sitemap.xml"), "utf8");
// El sitemap trae las páginas públicas; la del kit de marca (/marca) no está en él pero también se exporta, así que se añade
const EN_SITEMAP = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
const RUTAS = [...EN_SITEMAP, ...IDIOMAS.map((i) => `/${i}/marca`).filter((r) => existsSync(join(OUT, `${r}.html`)))]
  .filter((r) => IDIOMAS.some((i) => r === `/${i}` || r.startsWith(`/${i}/`)))
  .filter((r) => FILTRO.length === 0 || FILTRO.some((t) => r.endsWith(`/${t}`) || (t === "inicio" && /^\/[a-z]{2}$/.test(r))));
if (RUTAS.length === 0) { console.error("Ninguna página coincide con esas opciones."); process.exit(1); }

// ---- Utilidades de contraste
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razon = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };
const gris = (l) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055));
const OCULTAR_TEXTO = "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}";

/** Textos cortados en seco: un elemento con overflow oculto, sin puntos suspensivos, cuyo texto no cabe en su caja. */
const recortados = (page) => page.evaluate(() => {
  const nombre = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + "«" + (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 30) + "»";
  const salida = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const cs = getComputedStyle(el);
    if (cs.overflowX !== "hidden" && cs.overflowX !== "clip") continue;
    if (cs.display === "inline" || (cs.textOverflow === "ellipsis" && !/flex|grid/.test(cs.display))) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (el.scrollWidth > el.clientWidth + 1) salida.push(nombre(el) + ` ${el.scrollWidth}>${el.clientWidth}`);
  }
  return salida;
});

/** Contraste real de un elemento con texto (la página debe estar ya en la posición en que se ve). Devuelve null si no tiene texto propio. */
async function medirSobreFondo(page, sel) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s); if (!el) return null;
    const cs = getComputedStyle(el);
    let op = 1, fijo = false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); op *= parseFloat(c.opacity); if (c.position === "fixed" || c.position === "sticky") fijo = true; }
    const lineas = [];
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) if (q.width > 1 && q.height > 1) lineas.push({ x: q.x, y: q.y, width: q.width, height: q.height }); }
    return { color: cs.color, tam: parseFloat(cs.fontSize), peso: parseInt(cs.fontWeight) || 400, op, fijo, lineas, texto: el.textContent.trim().replace(/\s+/g, " ").slice(0, 42) };
  }, sel);
  if (!info || !info.lineas.length) return null;
  const c = info.color.match(/[\d.]+/g).map(Number);
  const alfa = (c[3] ?? 1) * info.op;
  const lumTexto = (lumFondo) => { const g = gris(lumFondo); return lum([0, 1, 2].map((k) => alfa * c[k] + (1 - alfa) * g)); };
  await page.addStyleTag({ content: OCULTAR_TEXTO }).then((h) => h.evaluate((n) => { n.id = "qa-ocultar"; }));
  await page.waitForTimeout(80);
  let peor = Infinity;
  try {
    for (const q of info.lineas) {
      const clip = { x: Math.max(0, q.x), y: Math.max(0, q.y), width: Math.min(q.width, page.viewportSize().width - Math.max(0, q.x)), height: Math.min(q.height, ALTO - Math.max(0, q.y)) };
      if (clip.width < 2 || clip.height < 2) continue;
      const { data } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const ls = []; for (let k = 0; k < data.length; k += 3) ls.push(lum([data[k], data[k + 1], data[k + 2]]));
      ls.sort((a, b) => a - b);
      const en = (p) => ls[Math.min(ls.length - 1, Math.max(0, Math.floor(p * (ls.length - 1))))];
      for (const lf of [en(0.03), en(0.5), en(0.97)]) peor = Math.min(peor, razon(lumTexto(lf), lf));
    }
  } finally { await page.evaluate(() => document.getElementById("qa-ocultar")?.remove()); }
  return { ...info, peor };
}

// ---- Recorrido
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const problemas = [];
let paginas = 0, medidos = 0;
for (const tema of TEMAS) {
  for (const ancho of ANCHOS) {
    const cx = await navegador.newContext({ viewport: { width: ancho, height: ALTO }, locale: "es-ES", reducedMotion: "reduce" });
    await cx.addInitScript((t) => { try { localStorage.setItem("restora-theme", t); } catch {} }, tema);
    await cx.addInitScript({ path: AXE });
    for (const ruta of RUTAS) {
      const etq = `${ruta} ${ancho}px ${tema}`;
      const page = await cx.newPage();
      const consola = [];
      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consola.push(m.text().slice(0, 140)); });
      page.on("pageerror", (e) => consola.push("pageerror " + e.message));
      page.on("response", (r) => { if (r.status() >= 400) consola.push(`${r.status()} ${r.url()}`); });
      await page.goto(BASE + ruta, { waitUntil: "load" });
      // Recorre la página para que se muestren los bloques que aparecen al hacer scroll
      await page.evaluate(async () => { const T = document.documentElement.scrollHeight; for (let y = 0; y < T; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(400);
      const d = await page.evaluate(() => ({ desborde: document.documentElement.scrollWidth - innerWidth, rotas: [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0)).length, tema: document.documentElement.dataset.theme }));
      if (d.tema !== tema) problemas.push(`${etq}: el tema pedido (${tema}) no se aplicó (${d.tema})`);
      if (d.desborde > 0) problemas.push(`${etq}: desborde horizontal de ${d.desborde}px`);
      if (d.rotas) problemas.push(`${etq}: ${d.rotas} imágenes rotas`);
      if (consola.length) problemas.push(`${etq}: consola/red → ${consola.slice(0, 3).join(" | ")}`);
      const rec = await recortados(page);
      if (rec.length) problemas.push(`${etq}: textos cortados → ${rec.slice(0, 3).join(" ; ")}`);

      const axe = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] }), ETIQUETAS);
      for (const v of axe.violations) problemas.push(`${etq}: axe [${v.impact}] ${v.id} ×${v.nodes.length} → ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" ; ")}`);

      // Lo que axe no sabe medir (texto sobre foto o degradado) se mide con píxeles reales
      const dudosos = [...new Set(axe.incomplete.filter((v) => v.id === "color-contrast").flatMap((v) => v.nodes.map((n) => n.target[0])))];
      await page.evaluate((sels) => sels.forEach((s, i) => document.querySelector(s)?.setAttribute("data-qa", String(i))), dudosos);
      const vistos = new Set();
      for (let i = 0; i < dudosos.length; i++) {
        const sel = `[data-qa="${i}"]`;
        // Centrado en la ventana: así la barra de navegación fija nunca tapa lo que se fotografía
        await page.evaluate((q) => document.querySelector(q)?.scrollIntoView({ block: "center", behavior: "instant" }), sel);
        await page.waitForTimeout(90);
        const medidas = [await medirSobreFondo(page, sel)];
        if (medidas[0]?.fijo) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250); medidas.push(await medirSobreFondo(page, sel)); }
        for (const m of medidas) {
          if (!m) continue;
          medidos++;
          const minimo = m.tam >= 24 || (m.tam >= 18.66 && m.peso >= 700) ? 3 : 4.5;
          const clave = `${m.texto}|${m.tam}|${m.color}`;
          if (m.peor < minimo && !vistos.has(clave)) { vistos.add(clave); problemas.push(`${etq}: contraste sobre foto ${m.peor.toFixed(2)} (mín. ${minimo}) → «${m.texto}» ${m.tam}px/${m.peso} ${m.color}`); }
        }
      }
      paginas++;
      await page.close();
    }
    await cx.close();
  }
}
await navegador.close();
servidor.close();
console.log(`Páginas revisadas: ${paginas} · textos sobre foto medidos con píxeles: ${medidos}`);
console.log(problemas.length ? problemas.join("\n") : "Sin problemas");
process.exit(problemas.length ? 1 : 0);
