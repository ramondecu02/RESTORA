// Economía por local: lo que se lleva Stripe por cada cobro mensual y lo que cuesta la IA (API de Claude) por restaurante.
// Uso: node scripts/economia-por-local.mjs [precio1 precio2 ...]     (precios mensuales SIN IVA, en euros)
// Todos los supuestos están arriba y se cambian aquí. Las tarifas de Anthropic salen de platform.claude.com/docs/en/about-claude/pricing
// (consultada el 5/10/2026); las de Stripe, de resúmenes públicos de su tarifa para el EEE: confirmar en Panel de Stripe → Ajustes → Precios.

// ───────── Supuestos de cobro ─────────
const IVA = 0.21;                                   // IVA español sobre el precio; Stripe cobra su comisión sobre el IMPORTE TOTAL cobrado (con IVA)
const STRIPE = {
  tarjetaEEE:   { pct: 0.015, fijo: 0.25 },         // consumo Visa/Mastercard emitidas en el EEE
  tarjetaEmpresa: { pct: 0.019, fijo: 0.25 },       // tarjetas «premium»: de empresa o corporativas (las de muchos hosteleros)
  tarjetaInternacional: { pct: 0.0325, fijo: 0.25 },
  sepa: { pct: 0.008, fijo: 0, tope: 5 },           // adeudo directo SEPA: 0,8 % con tope de 5 € (hay fuentes que lo dan al 0,35 %: confirmar)
  billing: 0.007,                                   // Stripe Billing (suscripciones): 0,7 % del volumen recurrente, ENCIMA de la comisión de cobro
};
const USD_EUR = 0.90;                               // 1 USD en euros (a confirmar el día que se decida)

// ───────── Supuestos de IA (precios USD por millón de tokens) ─────────
const P = {
  sonnet55: { in: 2, out: 10 },                     // lectura de albaranes y cartas, sugerencias de escandallo
  opus55: { in: 4, out: 20 },                       // repaso cuando la primera lectura sale dudosa
};
// Medido en el código: prompt del sistema 2.999 caracteres (~940 tokens), esquema JSON de salida 4.347 caracteres (~1.360 tokens),
// foto del móvil recortada a 2.200 px de lado largo (⌈2200/28⌉ × ⌈1650/28⌉ ≈ 4.660 «tokens visuales» por página).
const FIJO_ALBARAN = 2400;                          // sistema + esquema + texto del usuario
const TOK_PAGINA = 4660;
// Lo que no se puede medir sin datos reales es lo que el modelo «piensa» antes de contestar (cuenta como salida): se da como rango.
const ESCENARIOS = {
  bajo:   { nombre: "Local pequeño (bar, menú del día)", docsMes: 30,  paginas: 1.1, salidaSonnet: 2500, escala: 0.05, salidaOpus: 5000,  sugerencias: 5,  cartas: 0.2 },
  tipico: { nombre: "Restaurante típico",                docsMes: 60,  paginas: 1.3, salidaSonnet: 4000, escala: 0.15, salidaOpus: 8000,  sugerencias: 10, cartas: 0.3 },
  alto:   { nombre: "Local grande (mucho volumen)",      docsMes: 120, paginas: 1.5, salidaSonnet: 7000, escala: 0.25, salidaOpus: 12000, sugerencias: 30, cartas: 0.5 },
};
const REINTENTOS = 1.10;                            // 10 % extra: volver a leer, fotos repetidas
const CATALOGO = 283;                               // artículos del catálogo que se envían al sugerir ingredientes
const TOK_CATALOGO = CATALOGO * 36;                 // ~36 tokens por línea (el id tipo UUID cuesta ~24)

const usd = (tIn, tOut, m) => (tIn * m.in + tOut * m.out) / 1e6;
const eur = (x, d = 2) => x.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }) + " €";
const pc = (x, d = 1) => (x * 100).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }) + " %";

export function costeIA(e) {
  const entrada = FIJO_ALBARAN + e.paginas * TOK_PAGINA;
  const sonnet = usd(entrada, e.salidaSonnet, P.sonnet55);
  const opus = usd(entrada, e.salidaOpus, P.opus55);
  const porAlbaran = sonnet + e.escala * opus;
  const albaranes = e.docsMes * porAlbaran * REINTENTOS;
  const carta = e.cartas * usd(2 * TOK_PAGINA + 500, 3500, P.sonnet55);
  const sugerencias = e.sugerencias * usd(TOK_CATALOGO + 700, 1000, P.sonnet55);
  return { entrada, sonnet, opus, porAlbaran, albaranes, carta, sugerencias, totalUsd: albaranes + carta + sugerencias };
}
// «Inteligencia» con un modelo de lenguaje (no existe hoy: Avisos se calcula con reglas, sin IA): resumen semanal + preguntas a tus datos.
export function costeInteligencia(modelo = P.sonnet55) {
  const resumen = 4.3 * usd(3500, 700, modelo);
  const preguntas = 20 * usd(6000, 1000, modelo);
  return { resumen, preguntas, totalUsd: resumen + preguntas };
}

export function stripe(precioSinIva, tipo = "tarjetaEEE", { anual = false, factorAnual = 10 } = {}) {
  const neto = anual ? precioSinIva * factorAnual : precioSinIva;      // plan anual: paga 10 meses y lleva 12 (dos gratis)
  const bruto = neto * (1 + IVA);
  const t = STRIPE[tipo];
  const proc = tipo === "sepa" ? Math.min(t.tope, bruto * t.pct) : bruto * t.pct + t.fijo;
  const bil = bruto * STRIPE.billing;
  const total = proc + bil;
  return { neto, bruto, proc, bil, total, pctNeto: total / neto, porMes: anual ? total / 12 : total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const precios = process.argv.slice(2).map(Number).filter(Boolean);
  const lista = precios.length ? precios : [39, 49, 69, 89, 99, 129, 149, 179];

  console.log("## Comisión de Stripe por cobro mensual (suscripción con Stripe Billing, IVA 21 % incluido en lo cobrado)\n");
  console.log("| Precio sin IVA | Cobrado con IVA | Tarjeta estándar | Tarjeta de empresa | SEPA | Anual (2 meses gratis), tarjeta estándar, por mes |");
  console.log("|---:|---:|---:|---:|---:|---:|");
  for (const p of lista) {
    const a = stripe(p), b = stripe(p, "tarjetaEmpresa"), c = stripe(p, "sepa"), d = stripe(p, "tarjetaEEE", { anual: true });
    console.log(`| ${eur(p)} | ${eur(a.bruto)} | ${eur(a.total)} (${pc(a.pctNeto)}) | ${eur(b.total)} (${pc(b.pctNeto)}) | ${eur(c.total)} (${pc(c.pctNeto)}) | ${eur(d.porMes)} (${pc(d.pctNeto)}) |`);
  }

  console.log("\n## Coste de IA por local y mes (API de Claude)\n");
  console.log("| Escenario | Albaranes/mes | Entrada por albarán | Por albarán (Sonnet + repaso Opus) | Albaranes | Carta | Sugerencias de escandallo | Total |");
  console.log("|---|---:|---:|---:|---:|---:|---:|---:|");
  const tot = {};
  for (const [k, e] of Object.entries(ESCENARIOS)) {
    const r = costeIA(e); tot[k] = r.totalUsd * USD_EUR;
    console.log(`| ${e.nombre} | ${e.docsMes} | ${Math.round(r.entrada).toLocaleString("es-ES")} tokens | ${eur(r.porAlbaran * USD_EUR, 3)} | ${eur(r.albaranes * USD_EUR)} | ${eur(r.carta * USD_EUR)} | ${eur(r.sugerencias * USD_EUR)} | **${eur(r.totalUsd * USD_EUR)}** |`);
  }
  const i1 = costeInteligencia(), i2 = costeInteligencia(P.opus55);
  console.log(`\n«Inteligencia» con modelo de lenguaje (opcional): resumen semanal ${eur(i1.resumen * USD_EUR)} + 20 preguntas al mes ${eur(i1.preguntas * USD_EUR)} = ${eur(i1.totalUsd * USD_EUR)}/local/mes con Sonnet 5.5 (${eur(i2.totalUsd * USD_EUR)} con Opus 5.5).`);

  console.log("\n## Lo que queda por local y mes (precio sin IVA − Stripe tarjeta de empresa − IA − 1 € de infraestructura)\n");
  console.log("| Precio sin IVA | Stripe | IA bajo | IA típico | IA alto | Margen bajo | Margen típico | Margen alto |");
  console.log("|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const p of lista) {
    const s = stripe(p, "tarjetaEmpresa").total, infra = 1;
    const m = (ia) => p - s - ia - infra;
    console.log(`| ${eur(p)} | ${eur(s)} | ${eur(tot.bajo)} | ${eur(tot.tipico)} | ${eur(tot.alto)} | ${eur(m(tot.bajo))} (${pc(m(tot.bajo) / p, 0)}) | ${eur(m(tot.tipico))} (${pc(m(tot.tipico) / p, 0)}) | ${eur(m(tot.alto))} (${pc(m(tot.alto) / p, 0)}) |`);
  }
}
