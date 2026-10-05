// Kit de marca para crear las redes sociales de RESTORA: avatar, portadas, imagen para compartir y plantillas de publicación.
// Todo sale del símbolo y los colores de la marca (nada inventado: sin cifras, sin testimonios, sin sellos).
// Uso: node scripts/marca.mjs [carpeta]      (por defecto docs/marketing/marca)
// Requiere Chromium (Playwright): PLAYWRIGHT_BROWSERS_PATH o CHROMIUM_PATH.
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const OUT = resolve(process.argv[2] || resolve(RAIZ, "docs/marketing/marca"));
mkdirSync(OUT, { recursive: true });

const C = { marca: "#1E3D2F", acento: "#3E8E6A", tinta: "#14201A", fondo: "#F5F6F3", suave: "#E3F0E8", blanco: "#FFFFFF" };
const FRASES = {
  lema: "El control inteligente de tu restaurante.",
  datos: "De los datos a las decisiones.",
  coste: "Conoce el coste real de cada plato.",
};
const fuente = (f) => readFileSync(resolve(RAIZ, "producto/public/fonts", f)).toString("base64");
const FONT_CSS = `@font-face{font-family:"Inter";font-weight:100 900;src:url(data:font/woff2;base64,${fuente("inter-latin.woff2")}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:"Inter";font-weight:100 900;src:url(data:font/woff2;base64,${fuente("inter-latin-ext.woff2")}) format("woff2");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}`;

/** El símbolo («plato inteligente»): el plato como aro y la línea que sube hasta su punto. Cabe en un cuadrado de 64. */
const simbolo = (color = C.blanco, aro = 0.38) => `
  <circle cx="32" cy="35" r="17" fill="none" stroke="${color}" stroke-width="2.5" opacity="${aro}"/>
  <polyline points="19,41 27,35 35,38 45,23" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="45" cy="23" r="4.2" fill="${color}"/>`;
/** Baldosa con el símbolo (el icono de la app). */
const baldosa = (x, y, s, fondo = C.marca, color = C.blanco) => `
  <g transform="translate(${x} ${y}) scale(${s / 64})"><rect width="64" height="64" rx="16" fill="${fondo}"/>${simbolo(color)}</g>`;
const texto = (x, y, t, { size, peso = 700, color = C.blanco, ls = 0, anchor = "start", op = 1 }) =>
  `<text x="${x}" y="${y}" font-family="Inter" font-weight="${peso}" font-size="${size}" letter-spacing="${ls}" fill="${color}" text-anchor="${anchor}" opacity="${op}">${t}</text>`;
/** Marca de agua: aros concéntricos y una línea que sube, como el símbolo a gran escala. */
const trama = (w, h, color = C.acento, op = 0.18) => {
  const cx = w * 0.82, cy = h * 0.62, r = Math.max(w, h) * 0.2;
  return `<g fill="none" stroke="${color}" opacity="${op}">
    ${[1, 1.7, 2.5, 3.4].map((k) => `<circle cx="${cx}" cy="${cy}" r="${r * k}" stroke-width="${Math.max(2, h / 220)}"/>`).join("")}
    <polyline points="${w * 0.52},${h * 0.9} ${w * 0.64},${h * 0.74} ${w * 0.74},${h * 0.8} ${w * 0.9},${h * 0.42}" stroke-width="${Math.max(4, h / 90)}" stroke-linecap="round" stroke-linejoin="round" opacity="1"/>
  </g>`;
};
/** La palabra RESTORA, ya convertida en trazos (Inter 800 con 0,16 em de separación): se ve igual en cualquier sitio, sin depender de la fuente. */
const PALABRA = { d: "M116.2 0V-1490H726.5Q894.4 -1490 1016 -1429.7Q1137.6 -1369.5 1203.5 -1258.3Q1269.4 -1147 1269.4 -995Q1269.4 -841.5 1202.4 -733.4Q1135.4 -625.4 1011.2 -569Q887 -512.6 716.1 -512.6H327V-791.8H651.6Q734.6 -791.8 790.6 -813.8Q846.5 -835.8 874.9 -880.6Q903.4 -925.5 903.4 -995Q903.4 -1065 874.9 -1111.2Q846.5 -1157.3 790.4 -1180.5Q734.4 -1203.7 651.1 -1203.7H468.8V0ZM934.2 0 571.1 -680.9H949.3L1321.4 0ZM1799.8 0V-1490H2834V-1201.9H2152.5V-893.8H2779.7V-611.8H2152.5V-288.1H2833.1V0ZM3951.6 19.9Q3765.5 19.9 3627.2 -36.3Q3489 -92.4 3412.1 -206.1Q3335.2 -319.7 3332.3 -491.8H3670.9Q3675.9 -420 3710.8 -371.2Q3745.8 -322.4 3806.3 -297.8Q3866.8 -273.2 3947 -273.2Q4020.6 -273.2 4073.4 -293.3Q4126.2 -313.4 4154.5 -349.4Q4182.9 -385.5 4182.9 -432.6Q4182.9 -475.7 4156.9 -505.9Q4130.8 -536 4077.5 -559Q4024.2 -581.9 3941.9 -600.1L3784.7 -636.6Q3591.8 -680.8 3481.5 -780.7Q3371.2 -880.7 3371.2 -1049.2Q3371.2 -1187.4 3446.1 -1291Q3520.9 -1394.6 3651.7 -1452.3Q3782.6 -1510 3951.6 -1510Q4124.5 -1510 4251.5 -1451.5Q4378.6 -1393.1 4448.7 -1288.4Q4518.7 -1183.7 4520.4 -1045.6H4180.9Q4174 -1127.2 4115.3 -1172.3Q4056.6 -1217.4 3950.2 -1217.4Q3880 -1217.4 3832.2 -1198.8Q3784.4 -1180.2 3760.4 -1147.4Q3736.4 -1114.5 3736.4 -1072.6Q3736.4 -1027.3 3763.6 -995.8Q3790.8 -964.2 3840.6 -943.1Q3890.4 -921.9 3956.5 -906.9L4085 -877.3Q4192.9 -853.7 4277.5 -814.3Q4362.2 -774.9 4421 -720Q4479.8 -665.2 4510.1 -593.3Q4540.4 -521.4 4540.4 -431.8Q4540.4 -290.8 4470.1 -189.4Q4399.8 -88 4268.1 -34Q4136.5 19.9 3951.6 19.9ZM5006.1 -1201.9V-1490H6259.8V-1201.9H5809.5V0H5456.9V-1201.9ZM7445.3 20Q7245.2 20 7084.3 -69.1Q6923.4 -158.2 6829.8 -328.9Q6736.2 -499.6 6736.2 -744Q6736.2 -990.1 6829.8 -1161.2Q6923.4 -1332.4 7084.3 -1421.2Q7245.2 -1510 7445.3 -1510Q7645.4 -1510 7805.8 -1421.2Q7966.2 -1332.4 8060.1 -1161.2Q8154 -990.1 8154 -744Q8154 -498.9 8060.1 -328.1Q7966.2 -157.4 7805.8 -68.7Q7645.4 20 7445.3 20ZM7445.3 -289.8Q7554 -289.8 7631.9 -342.1Q7709.7 -394.4 7751.6 -495.8Q7793.4 -597.3 7793.4 -744Q7793.4 -891.9 7751.6 -993.8Q7709.7 -1095.6 7631.9 -1147.9Q7554 -1200.2 7445.3 -1200.2Q7337.2 -1200.2 7259.2 -1147.8Q7181.2 -1095.4 7139 -993.5Q7096.8 -891.7 7096.8 -744Q7096.8 -597.3 7139 -496Q7181.2 -394.6 7259.2 -342.2Q7337.2 -289.8 7445.3 -289.8ZM8680.6 0V-1490H9290.9Q9458.8 -1490 9580.4 -1429.7Q9702 -1369.5 9767.9 -1258.3Q9833.8 -1147 9833.8 -995Q9833.8 -841.5 9766.8 -733.4Q9699.8 -625.4 9575.6 -569Q9451.4 -512.6 9280.5 -512.6H8891.4V-791.8H9216Q9299 -791.8 9355 -813.8Q9410.9 -835.8 9439.3 -880.6Q9467.8 -925.5 9467.8 -995Q9467.8 -1065 9439.3 -1111.2Q9410.9 -1157.3 9354.8 -1180.5Q9298.8 -1203.7 9215.5 -1203.7H9033.2V0ZM9498.6 0 9135.5 -680.9H9513.7L9885.8 0ZM10295.5 0 10792.4 -1490H11264.8L11777 0H11381L11173.6 -651.4Q11124.1 -814 11077.6 -997.3Q11031.2 -1180.6 10984.5 -1378.2H11063.1Q11018.2 -1180.1 10976 -996.3Q10933.9 -812.6 10886.6 -651.4L10687.5 0ZM10632.9 -317.2V-586.6H11439.7V-317.2Z", w: 11824.08, upm: 2048, cap: 1490 };
const palabra = (x, baseY, size, color) => `<path transform="translate(${x} ${baseY}) scale(${size / PALABRA.upm})" d="${PALABRA.d}" fill="${color}"/>`;
const anchoPalabra = (size) => (PALABRA.w * size) / PALABRA.upm;
/** Marca + palabra: h es la altura de la baldosa; la palabra mide 0,62 h y se centra en vertical con la baldosa. */
const lockup = (x, y, h, { color = C.blanco, fondo = C.marca, simbolo: sim = color } = {}) => {
  const size = h * 0.62;
  return `${baldosa(x, y, h, fondo, sim)}${palabra(x + h * 1.32, y + h / 2 + (PALABRA.cap * size) / PALABRA.upm / 2, size, color)}`;
};
const anchoLockup = (h) => h * 1.32 + anchoPalabra(h * 0.62);
const svg = (w, h, cuerpo, fondo = C.marca) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${fondo === "none" ? "" : `<rect width="${w}" height="${h}" fill="${fondo}"/>`}${cuerpo}</svg>`;

/** Líneas de texto apiladas, cada una con su color; `y` es la línea base de la primera. */
const bloque = (lineas, x, y, size, colores, { peso = 800, interlineado = 1.16 } = {}) =>
  lineas.map((t, i) => texto(x, y + i * size * interlineado, t, { size, peso, color: colores[i % colores.length] })).join("");

/** Portada: el logotipo y el lema dentro de la zona segura (cada red tapa partes distintas con el avatar y los botones). */
const portada = (w, h, seguro) => async (fit) => {
  const [sx, sy, sw, sh] = seguro;
  const alto = Math.min(sh * 0.34, sw * 0.12);
  const lemaSize = fit([FRASES.lema], sw, Math.min(sh * 0.17, sw * 0.05), 600);
  const gap = alto * 0.55;
  const y0 = sy + (sh - (alto + gap + lemaSize)) / 2;
  return svg(w, h, `${trama(w, h)}${lockup(sx, y0, alto, { color: C.blanco, fondo: C.acento })}${texto(sx, y0 + alto + gap + lemaSize * 0.82, FRASES.lema, { size: lemaSize, peso: 600, color: C.blanco, op: 0.86 })}`);
};

const PIEZAS = [
  // [archivo, ancho, alto, (fit) => svg]
  ["avatar-1080.png", 1080, 1080, async () => svg(1080, 1080, `<g transform="translate(216 216) scale(${648 / 64})">${simbolo(C.blanco, 0.42)}</g>`)],
  ["avatar-400.png", 400, 400, async () => svg(400, 400, `<g transform="translate(80 80) scale(${240 / 64})">${simbolo(C.blanco, 0.42)}</g>`)],
  // LinkedIn 1584×396 (el avatar tapa la esquina inferior izquierda): contenido a la derecha del primer cuarto
  ["portada-linkedin-1584x396.png", 1584, 396, portada(1584, 396, [480, 70, 1000, 256])],
  // X 1500×500 (avatar abajo a la izquierda, recorte en móvil): zona central
  ["portada-x-1500x500.png", 1500, 500, portada(1500, 500, [420, 110, 900, 280])],
  // Facebook 820×312 (en móvil se recorta a 640×360 de la parte central)
  ["portada-facebook-820x312.png", 820, 312, portada(820, 312, [170, 56, 480, 200])],
  // YouTube 2560×1440: la zona segura para todos los dispositivos es 1546×423 en el centro
  ["portada-youtube-2560x1440.png", 2560, 1440, portada(2560, 1440, [507, 508, 1546, 423])],
  // Imagen para compartir (Open Graph) 1200×630
  ["og-1200x630.png", 1200, 630, async (fit) => {
    const L = ["El control inteligente", "de tu restaurante."], size = fit(L, 1020, 76, 800);
    return svg(1200, 630, `${trama(1200, 630)}${lockup(90, 100, 96, { color: C.blanco, fondo: C.acento })}${bloque(L, 90, 340, size, [C.blanco, C.suave])}${texto(90, 560, "restoraapp.app", { size: 34, peso: 600, color: C.blanco, op: 0.8 })}`);
  }],
  // Publicación 1080×1350 (4:5): portada de carrusel
  ["post-portada-1080x1350.png", 1080, 1350, async (fit) => {
    const L = ["El control", "inteligente", "de tu", "restaurante."], size = fit(L, 920, 124, 800);
    return svg(1080, 1350, `${trama(1080, 1350)}${lockup(80, 90, 80, { color: C.blanco, fondo: C.acento })}${bloque(L, 80, 560, size, [C.blanco, C.blanco, C.suave, C.suave])}${texto(80, 1240, "restoraapp.app", { size: 40, peso: 600, color: C.blanco, op: 0.8 })}`);
  }],
  // Publicación 1080×1350: pregunta (sin cifras: la respuesta va en el texto de la publicación)
  ["post-pregunta-1080x1350.png", 1080, 1350, async (fit) => {
    const L = ["¿Sabes lo que", "te cuesta cada", "plato hoy?"], size = fit(L, 920, 116, 800);
    return svg(1080, 1350, `${trama(1080, 1350, C.marca, 0.08)}${lockup(80, 90, 72, { color: C.marca, fondo: C.marca, simbolo: C.blanco })}${bloque(L, 80, 620, size, [C.tinta, C.tinta, C.acento])}${texto(80, 1240, "restoraapp.app", { size: 40, peso: 600, color: C.tinta, op: 0.6 })}`, C.fondo);
  }],
  // Historia 1080×1920
  ["historia-1080x1920.png", 1080, 1920, async (fit) => {
    const L = ["De los datos", "a las", "decisiones."], size = fit(L, 920, 150, 800);
    return svg(1080, 1920, `${trama(1080, 1920)}${lockup(80, 160, 90, { color: C.blanco, fondo: C.acento })}${bloque(L, 80, 900, size, [C.blanco, C.suave, C.suave])}${texto(80, 1640, "restoraapp.app", { size: 46, peso: 600, color: C.blanco, op: 0.8 })}`);
  }],
];

// Logotipos vectoriales (para web, documentos e impresión)
const ANCHO_LOGO = Math.ceil(anchoLockup(96) + 32);
const VECTORES = [
  ["logo-color.svg", svg(ANCHO_LOGO, 128, lockup(16, 16, 96, { color: C.tinta, fondo: C.marca, simbolo: C.blanco }), "none")],
  ["logo-blanco.svg", svg(ANCHO_LOGO, 128, lockup(16, 16, 96, { color: C.blanco, fondo: C.acento }), "none")],
  ["simbolo.svg", svg(256, 256, `<g transform="scale(4)"><rect width="64" height="64" rx="16" fill="${C.marca}"/>${simbolo()}</g>`, "none")],
];

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
try {
  const pag = await navegador.newPage();
  // Una página aparte para medir con la fuente real (la de dibujar se reemplaza en cada pieza)
  const pm = await navegador.newPage();
  await pm.setContent(`<!doctype html><meta charset="utf-8"><style>${FONT_CSS}</style><canvas id="c"></canvas>`);
  await pm.evaluate(async () => { for (const p of [600, 800]) await document.fonts.load(`${p} 100px Inter`); });
  const medidas = new Map();
  const fit = (lineas, ancho, maximo, peso) => {
    const k = JSON.stringify([lineas, ancho, maximo, peso]);
    if (!medidas.has(k)) throw new Error("medida no preparada");
    return medidas.get(k);
  };
  for (const [archivo, w, h, hacer] of PIEZAS) {
    // Primera pasada: se piden las medidas; segunda: se dibuja con ellas
    const pedidas = [];
    await hacer((lineas, ancho, maximo, peso) => { pedidas.push([lineas, ancho, maximo, peso]); return maximo; });
    for (const [lineas, ancho, maximo, peso] of pedidas) {
      const size = await pm.evaluate(([lineas, ancho, maximo, peso]) => {
        const ctx = document.getElementById("c").getContext("2d");
        ctx.font = `${peso} 100px Inter`;
        const mayor = Math.max(...lineas.map((t) => ctx.measureText(t).width));
        return Math.min(maximo, Math.floor((ancho / mayor) * 100));
      }, [lineas, ancho, maximo, peso]);
      medidas.set(JSON.stringify([lineas, ancho, maximo, peso]), size);
    }
    const cuerpo = await hacer(fit);
    await pag.setViewportSize({ width: w, height: h });
    await pag.setContent(`<!doctype html><meta charset="utf-8"><style>${FONT_CSS}html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>${cuerpo}`);
    await pag.evaluate(() => document.fonts.ready);
    await pag.screenshot({ path: resolve(OUT, archivo), type: "png", clip: { x: 0, y: 0, width: w, height: h } });
    console.log("✓", archivo, `${w}×${h}`);
  }
  for (const [archivo, cuerpo] of VECTORES) {
    writeFileSync(resolve(OUT, archivo), cuerpo);
    console.log("✓", archivo);
  }
} finally {
  await navegador.close();
}
