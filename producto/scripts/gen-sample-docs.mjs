// Genera las imágenes de ejemplo (albaranes) de public/demo con Chromium.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const here = new URL("..", import.meta.url).pathname;
const mono = readFileSync(here + "public/fonts/plexmono-400.woff2").toString("base64");
const mono6 = readFileSync(here + "public/fonts/plexmono-600.woff2").toString("base64");
const eur = (n) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoy = new Date(); const d2 = new Date(hoy); d2.setDate(hoy.getDate() - 2);
const f = (d) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

function doc({ emisor, cif, dir, num, fecha, lineas, desg, total, rot, stain }) {
  const rows = lineas.map((l) => `<tr><td>${l.ref}</td><td>${l.t}</td><td class="r ${l.blur ? "blur" : ""}">${l.q}</td><td>${l.u}</td><td class="r">${eur(l.p)}</td><td class="r">${l.dto ?? ""}</td><td class="r">${eur(l.imp)}</td><td class="r">${l.iva}</td></tr>`).join("");
  const dg = desg.map((x) => `<tr><td>${x.t} %</td><td class="r">${eur(x.b)}</td><td class="r">${eur(x.c)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:M;src:url(data:font/woff2;base64,${mono})} @font-face{font-family:M;font-weight:600;src:url(data:font/woff2;base64,${mono6})}
  body{margin:0;background:#8d8a82;width:1400px;height:1900px;display:grid;place-items:center;font-family:M,monospace}
  .p{width:1180px;padding:70px 76px 90px;background:#fbfaf5;color:#23262a;transform:rotate(${rot}deg);box-shadow:0 30px 70px rgba(0,0,0,.35);position:relative;font-size:21px;line-height:1.5}
  .p:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at ${stain}, rgba(160,130,60,.10), transparent 22%);pointer-events:none}
  h1{font-size:34px;margin:0;letter-spacing:.02em} .top{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:18px;margin-bottom:22px}
  .box{border:2px solid #333;padding:10px 16px;text-align:right} table{width:100%;border-collapse:collapse} th{border-bottom:2px solid #333;text-align:left;padding:8px 6px;font-size:18px}
  td{padding:9px 6px;border-bottom:1px dotted #999;font-size:20px} .r{text-align:right} .blur{filter:blur(2.2px)} .cli{margin:0 0 22px;font-size:19px}
  .foot{display:flex;justify-content:space-between;margin-top:30px;gap:40px} .foot table{width:auto;min-width:420px} .tot{font-size:30px;font-weight:600;border:2px solid #333;padding:14px 22px;align-self:flex-end}
  small{color:#555}
  </style></head><body><div class="p">
  <div class="top"><div><h1>${emisor}</h1><div>${dir}</div><div>CIF ${cif}</div></div>
  <div class="box"><b>ALBARÁN</b><br>Nº ${num}<br>Fecha ${fecha}</div></div>
  <p class="cli">Cliente: CASA PUJOL · C/ Major 14 · 43003 Tarragona</p>
  <table><thead><tr><th>Ref.</th><th>Descripción</th><th class="r">Cant.</th><th>Ud.</th><th class="r">Precio</th><th class="r">Dto.</th><th class="r">Importe</th><th class="r">IVA</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="foot"><table><thead><tr><th>Tipo</th><th class="r">Base</th><th class="r">Cuota</th></tr></thead><tbody>${dg}</tbody></table>
  <div class="tot">TOTAL ${eur(total)} €</div></div>
  <p style="margin-top:40px"><small>Recibí conforme: ______________________ &nbsp; Forma de pago: recibo a 30 días</small></p>
  </div></body></html>`;
}

const A = {
  emisor: "DISTRIBUCIONES MARTINEZ S.L.", cif: "B43123456", dir: "Pol. Ind. Francolí, nave 7 · 43006 Tarragona", num: "A-2231", fecha: f(d2), rot: -1.1, stain: "82% 12%",
  lineas: [
    ["1021", "TOMATE PERA", "12", "kg", 1.85, 4], ["1034", "CEBOLLA DULCE", "10", "kg", 0.95, 4], ["1040", "PATATA AGRIA", "25", "kg", 0.62, 4],
    ["2210", "HUEVO CAMPERO L EST.30", "2", "est", 8.10, 4], ["1102", "LIMON", "5", "kg", 1.90, 4], ["1015", "LECHUGA ROMANA", "12", "ud", 0.80, 4],
    ["3301", "ACEITE OLIVA V.EXTRA 5L", "2", "gar", 34.50, 4], ["3410", "VINAGRE JEREZ 1L", "3", "bot", 3.40, 10], ["3420", "SAL MARINA 1KG", "2", "paq", 0.55, 10],
    ["5102", "POLLO ENTERO", "6,0", "kg", 3.90, 10, true], ["7730", "CERVEZA BARRIL 30L", "1", "bar", 62.00, 10], ["1188", "MIX GOURMET 125G", "6", "bdj", 1.45, 4],
  ].map(([ref, t, q, u, p, iva, blur]) => ({ ref, t, q, u, p, iva, blur, imp: Math.round(parseFloat(String(q).replace(",", ".")) * p * 100) / 100 })),
  desg: [{ t: 4, b: 160.2, c: 6.41 }, { t: 10, b: 34.7, c: 3.47 }, { t: 21, b: 62.0, c: 13.02 }], total: 279.8,
};
const G = {
  emisor: "FRUTAS HERMANOS GIL", cif: "B43987654", dir: "Mercado Central, puestos 12-14 · 43001 Tarragona", num: "FG-0419", fecha: f(hoy), rot: 0.8, stain: "15% 88%",
  lineas: [["T01", "TOMATE PERA CAT.I", "10", "kg", 1.62, 4], ["C07", "CEBOLLA DULCE FUENTES", "8", "kg", 0.98, 4], ["L02", "LIMON PRIMOFIORI", "4", "kg", 1.75, 4],
    ["L11", "LECHUGA ROMANA", "10", "ud", 0.85, 4], ["P25", "PATATA AGRIA SACO 25KG", "1", "saco", 14.25, 4]].map(([ref, t, q, u, p, iva]) => ({ ref, t, q, u, p, iva, imp: Math.round(parseFloat(q) * p * 100) / 100 })),
  desg: [{ t: 4, b: 53.79, c: 2.15 }], total: 55.94,
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1400, height: 1900 }, deviceScaleFactor: 1 });
for (const [name, data] of [["albaran-ejemplo", A], ["albaran-gil", G]]) {
  await page.setContent(doc(data), { waitUntil: "load" });
  await page.screenshot({ path: here + `public/demo/${name}.jpg`, type: "jpeg", quality: 78, fullPage: false });
  console.log("ok", name);
}
// Carta de ejemplo (coincide con la lectura simulada)
const carta = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:M;src:url(data:font/woff2;base64,${mono})}
body{margin:0;width:1400px;height:1900px;background:#6f6a5f;display:grid;place-items:center;font-family:Georgia,serif}
.c{width:1060px;padding:90px 100px;background:#fbf7ee;color:#2b2a26;transform:rotate(0.7deg);box-shadow:0 30px 70px rgba(0,0,0,.35)}
h1{text-align:center;font-size:54px;letter-spacing:.08em;margin:0 0 6px} .sub{text-align:center;letter-spacing:.3em;font-size:18px;color:#7a735f;margin-bottom:50px}
h2{font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:#3E6B55;text-align:center;margin:40px 0 18px}
.it{display:flex;align-items:baseline;gap:12px;font-size:28px;margin:12px 0} .it i{flex:1;border-bottom:2px dotted #b9b19c} .d{font-size:19px;color:#6e6b5f;font-style:italic;margin:-6px 0 8px}
</style></head><body><div class="c"><h1>CARTA</h1><div class="sub">COCINA DE MERCADO</div>
<h2>Entrantes</h2><div class="it"><span>Croquetas de jamón ibérico</span><i></i><b>9,50</b></div><div class="d">Ocho unidades, cremosas</div>
<div class="it"><span>Ensalada de temporada</span><i></i><b>9,50</b></div><div class="d">Burrata, aguacate y tomate de rama</div>
<h2>Pescados</h2><div class="it"><span>Lubina a la brasa</span><i></i><b>24,00</b></div><div class="d">Con patata confitada y salsa de la casa</div>
<h2>Arroces</h2><div class="it"><span>Arroz de carabineros</span><i></i><b>26,50</b></div><div class="d">Mínimo dos personas, precio por ración</div>
<h2>Carnes</h2><div class="it"><span>Canelón de rustido</span><i></i><b>14,50</b></div>
<h2>Postres</h2><div class="it"><span>Crema catalana</span><i></i><b>6,50</b></div>
<h2>Vinos</h2><div class="it"><span>Copa de Priorat DOQ</span><i></i><b>6,50</b></div>
</div></body></html>`;
await page.setContent(carta, { waitUntil: "load" });
await page.screenshot({ path: here + "public/demo/carta-ejemplo.jpg", type: "jpeg", quality: 78 });
console.log("ok carta-ejemplo");
await browser.close();
