// Genera los dos PDF de la checklist de food cost (el recurso gratuito de la newsletter): public/recursos/checklist-food-cost-{es,ca}.pdf
// Una página A4, doce casillas. Los textos salen de aquí (antes solo existía el binario), así que se pueden corregir y volver a generar.
// Uso: node scripts/checklist.mjs        Requiere Chromium (Playwright): PLAYWRIGHT_BROWSERS_PATH o CHROMIUM_PATH.
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(RAIZ, "public/recursos");
mkdirSync(OUT, { recursive: true });

const COPY = {
  es: {
    lang: "es",
    file: "checklist-food-cost-es.pdf",
    title: "RESTORA · Checklist semanal de food cost",
    eyebrow: "Checklist semanal · Food cost",
    h1: "¿Se te escapa el margen esta semana?",
    intro: "Doce comprobaciones de food cost para revisar cada semana. Imprímela y cuélgala en el pase: si marcas las doce, tu margen está bajo control.",
    formula: "<b>Food cost</b> = coste de materia prima ÷ ventas sin IVA. Compáralo cada semana con tu objetivo, no con tu intuición.",
    groups: [
      { t: "Compras y proveedores", items: [
        "He registrado todos los albaranes de la semana; ninguno pendiente en la carpeta.",
        "He comparado el precio de las cinco referencias que más pesan en la compra con la semana anterior.",
        "Cada subida relevante tiene una decisión tomada: negociar, cambiar de proveedor o ajustar receta o precio.",
      ] },
      { t: "Escandallos y mermas", items: [
        "Los escandallos de los platos más vendidos están actualizados con los precios de compra actuales.",
        "He revisado el rendimiento real (merma) de las materias primas críticas: pescado, carne, verdura.",
        "Ningún plato nuevo o de temporada sale a carta sin su escandallo hecho.",
      ] },
      { t: "Inventario y consumo", items: [
        "He hecho recuento de las referencias caras y perecederas.",
        "El consumo teórico (ventas × recetas) cuadra con el consumo real; las diferencias tienen explicación.",
        "No hay producto caducado ni sobrestock de referencias de baja rotación.",
      ] },
      { t: "Carta y margen", items: [
        "Sé cuál es el food cost de la semana y cómo se compara con mi objetivo.",
        "Conozco los tres platos que más margen aportan y los tres que menos; los segundos tienen un plan.",
        "Los precios de venta reflejan los costes actuales: la última revisión de PVP no tiene más de un trimestre.",
      ] },
    ],
    semana: "Semana del ____ / ____ / ________",
    revisado: "Revisado por ______________________",
    pie: "Hecho en Cataluña · restoraapp.app · hola@restoraapp.com",
    cierre: "RESTORA conecta compras, escandallos e inventario para que varias de estas casillas las tengas ya calculadas.",
  },
  ca: {
    lang: "ca",
    file: "checklist-food-cost-ca.pdf",
    title: "RESTORA · Checklist setmanal de food cost",
    eyebrow: "Checklist setmanal · Food cost",
    h1: "Se't escapa el marge aquesta setmana?",
    intro: "Dotze comprovacions de food cost per revisar cada setmana. Imprimeix-la i penja-la al pas: si marques les dotze, el teu marge està sota control.",
    formula: "<b>Food cost</b> = cost de matèria primera ÷ vendes sense IVA. Compara'l cada setmana amb el teu objectiu, no amb la intuïció.",
    groups: [
      { t: "Compres i proveïdors", items: [
        "He registrat tots els albarans de la setmana; cap pendent a la carpeta.",
        "He comparat el preu de les cinc referències que més pesen a la compra amb la setmana anterior.",
        "Cada pujada rellevant té una decisió presa: negociar, canviar de proveïdor o ajustar recepta o preu.",
      ] },
      { t: "Escandalls i minves", items: [
        "Els escandalls dels plats més venuts estan actualitzats amb els preus de compra actuals.",
        "He revisat el rendiment real (minva) de les matèries primeres crítiques: peix, carn, verdura.",
        "Cap plat nou o de temporada surt a carta sense l'escandall fet.",
      ] },
      { t: "Inventari i consum", items: [
        "He fet recompte de les referències cares i peribles.",
        "El consum teòric (vendes × receptes) quadra amb el consum real; les diferències tenen explicació.",
        "No hi ha producte caducat ni sobreestoc de referències de baixa rotació.",
      ] },
      { t: "Carta i marge", items: [
        "Sé quin és el food cost de la setmana i com es compara amb el meu objectiu.",
        "Conec els tres plats que més marge aporten i els tres que menys; els segons tenen un pla.",
        "Els preus de venda reflecteixen els costos actuals: l'última revisió de PVP no té més d'un trimestre.",
      ] },
    ],
    semana: "Setmana del ____ / ____ / ________",
    revisado: "Revisat per ______________________",
    pie: "Fet a Catalunya · restoraapp.app · hola@restoraapp.com",
    cierre: "RESTORA connecta compres, escandalls i inventari perquè diverses d'aquestes caselles les tinguis ja calculades.",
  },
};

const C = { marca: "#1E3D2F", acento: "#3E8E6A", tinta: "#14201A", suave: "#EEF3EF", linea: "#D5DDD6", mudo: "#55645B" };
const fuente = (f) => readFileSync(resolve(RAIZ, "producto/public/fonts", f)).toString("base64");
const FONT_CSS = `@font-face{font-family:"Inter";font-weight:100 900;src:url(data:font/woff2;base64,${fuente("inter-latin.woff2")}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:"Inter";font-weight:100 900;src:url(data:font/woff2;base64,${fuente("inter-latin-ext.woff2")}) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}`;

const simbolo = `<svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="${C.marca}"/><circle cx="32" cy="35" r="17" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.38"/><polyline points="19,41 27,35 35,38 45,23" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="45" cy="23" r="4.2" fill="#fff"/></svg>`;

function html(c) {
  let n = 0;
  const grupos = c.groups
    .map(
      (g) => `<section class="grupo"><h2>${g.t}</h2><ol>${g.items
        .map((t) => `<li><span class="caja"></span><span class="num">${String(++n).padStart(2, "0")}</span><span class="txt">${t}</span></li>`)
        .join("")}</ol></section>`,
    )
    .join("");
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><title>${c.title}</title><style>
${FONT_CSS}
@page { size: A4; margin: 13mm 16mm 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Inter", "DejaVu Sans", sans-serif; font-size: 10.2pt; line-height: 1.42; color: ${C.tinta}; }
header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid ${C.marca}; padding-bottom: 10px; }
.marca { display: flex; align-items: center; gap: 8px; font-weight: 700; letter-spacing: 0.18em; font-size: 12.5pt; color: ${C.marca}; }
.eyebrow { font-size: 8.4pt; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: ${C.mudo}; }
h1 { font-family: "Liberation Serif", "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 28pt; line-height: 1.06; margin: 18px 0 8px; letter-spacing: -0.01em; }
.intro { margin: 0 0 10px; max-width: 160mm; font-size: 10.6pt; color: ${C.tinta}; }
.formula { margin: 0 0 16px; padding: 8px 12px; background: ${C.suave}; border-left: 3px solid ${C.acento}; border-radius: 3px; font-size: 9.2pt; color: ${C.mudo}; }
.grupo { margin: 0 0 13px; break-inside: avoid; }
h2 { margin: 0 0 6px; font-size: 8.6pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: ${C.acento}; }
ol { list-style: none; margin: 0; padding: 0; }
li { display: flex; align-items: flex-start; gap: 8px; padding: 6.5px 0; border-top: 1px solid ${C.linea}; }
.caja { flex: none; width: 5mm; height: 5mm; margin-top: 1px; border: 1.3px solid ${C.marca}; border-radius: 1.2mm; }
.num { flex: none; width: 18px; margin-top: 2px; font-size: 8.4pt; font-weight: 700; color: ${C.acento}; font-variant-numeric: tabular-nums; }
.txt { flex: 1; }
footer { margin-top: 16px; padding-top: 10px; border-top: 1.5px solid ${C.marca}; font-size: 9pt; }
.firma { display: flex; justify-content: space-between; margin-bottom: 10px; color: ${C.tinta}; }
.pie { color: ${C.mudo}; }
.cierre { margin-top: 4px; color: ${C.marca}; font-weight: 600; }
</style></head><body>
<header><div class="marca">${simbolo}RESTORA</div><div class="eyebrow">${c.eyebrow}</div></header>
<h1>${c.h1}</h1>
<p class="intro">${c.intro}</p>
<p class="formula">${c.formula}</p>
${grupos}
<footer><div class="firma"><span>${c.semana}</span><span>${c.revisado}</span></div><div class="pie">${c.pie}</div><div class="cierre">${c.cierre}</div></footer>
</body></html>`;
}

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
for (const c of Object.values(COPY)) {
  const page = await navegador.newPage();
  await page.setContent(html(c), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (process.env.CHECKLIST_PREVIEW) {
    // Vista previa en PNG (a 96 ppp, como saldría impresa) para revisar la maquetación sin abrir el PDF
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.emulateMedia({ media: "print" });
    await page.screenshot({ path: resolve(process.env.CHECKLIST_PREVIEW, `checklist-${c.lang}.png`), fullPage: true });
  }
  const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (paginas !== 1) throw new Error(`${c.file} sale en ${paginas} páginas: tiene que caber en una`);
  writeFileSync(resolve(OUT, c.file), pdf);
  console.log(`✓ public/recursos/${c.file} (${Math.round(pdf.length / 1024)} KB, ${paginas} página)`);
  await page.close();
}
await navegador.close();
