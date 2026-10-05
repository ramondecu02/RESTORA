// De la lectura del modelo al borrador de validación: emparejado, unidades, IVA y comprobación de totales.
import type { Draft, DraftLine, OcrAlbaran, Conf } from "./ocr-types";
import { bestMatches, norm } from "./fuzzy";
import { inferPackFactor, type BaseUnit } from "./units";
import { lineaCoste } from "./pmp";
import { eur } from "./format";

export type ArtRef = { id: string; name: string; aliases: string[]; unit: BaseUnit; categoryId: string; iva: number; rend: number };
export type CatRef = { id: string; name: string; aliases: string[]; unit: BaseUnit; categoryId: string; rend: number };
export type CatIva = Map<string, number>;
export type ProvRef = { id: string; name: string; cif: string };
/** Envase aprendido de albaranes anteriores (clave articuloId). propio = false: se aprendió con otro proveedor y solo se sugiere. */
export type PackMemory = Map<string, { unidadCompra: string; factor: number; propio?: boolean }>;

const lid = (i: number) => "l" + (i + 1);
export const MATCH_AUTO = 0.84;

export function matchProveedor(nombre: string | null, cif: string | null, provs: ProvRef[]): ProvRef | null {
  if (cif) { const c = norm(cif).replace(/ /g, ""); const p = provs.find((x) => x.cif && norm(x.cif).replace(/ /g, "") === c); if (p) return p; }
  if (!nombre) return null;
  const best = bestMatches(nombre, provs, (p) => [p.name], 0.7, 1)[0];
  return best ? best.item : null;
}

/** La unidad impresa es la unidad base del artículo o un sinónimo (kilos, litros, unidades...). */
export function esUnidadBase(u: string, base: BaseUnit): boolean {
  const x = norm(u);
  if (!x) return false;
  if (x === norm(base)) return true;
  if (base === "kg") return /^(kg|kgs|kilo|kilos|k)$/.test(x);
  if (base === "L") return /^(l|lt|lts|litro|litros)$/.test(x);
  return /^(ud|uds|u|un|unid|unidad|unidades|und|pieza|piezas|pz)$/.test(x);
}
/** Conversión de la unidad de compra a la unidad base. Manda la unidad impresa: si ya es la base, factor 1;
 *  el tamaño que aparezca en el texto solo cuenta si la unidad es un envase (caja, saco, garrafa...) o no se lee. */
export function convertir(texto: string, unidad: string, base: BaseUnit): { factor: number; fuente: "unidad" | "texto"; unidad: string } | null {
  const u = unidad.trim();
  if (esUnidadBase(u, base)) return { factor: 1, fuente: "unidad", unidad: u };
  const inf = inferPackFactor(texto + " " + u, base, u);
  if (inf) return { factor: inf.factor, fuente: "texto", unidad: u || inf.label };
  return u ? null : { factor: 1, fuente: "unidad", unidad: base };
}
/** Tipo de IVA leído, solo si es un tipo entero posible: 5,2 o 1,4 son recargo de equivalencia, no IVA. */
export function tipoIva(x: number | null | undefined): number | null {
  if (x == null || !Number.isFinite(x)) return null;
  const r = Math.round(x);
  return Math.abs(x - r) < 0.01 && r >= 0 && r <= 30 ? r : null;
}

/** Qué es la línea. Lecturas antiguas no lo traen: se entiende «producto». */
export const tipoLinea = (l: OcrAlbaran["lineas"][number]): "producto" | "portes" | "envase" | "devolucion" | "descuento" | "otro" => l.tipo ?? "producto";
const importeLinea = (l: OcrAlbaran["lineas"][number]) => l.importe ?? (l.cantidad ?? 0) * (l.precio_unitario ?? 0);

/** Descuento general del pie en %: el porcentaje impreso o, si solo hay importe, importe / suma de las líneas.
 *  Se aplica a todas las líneas menos a las devoluciones. */
export function dtoGlobalPct(ocr: OcrAlbaran): number {
  const pct = ocr.descuento_global_pct ?? 0;
  if (pct > 0 && pct < 100) return pct;
  const imp = ocr.descuento_global_importe ?? 0;
  if (!(imp > 0)) return 0;
  const suma = ocr.lineas.reduce((t, l) => t + (tipoLinea(l) === "devolucion" ? 0 : Math.max(0, importeLinea(l))), 0);
  return suma > 0 && imp < suma ? round((imp / suma) * 100, 4) : 0;
}
/** Importe de la línea contra lo que sale de cantidad × precio: un dígito mal leído o un precio por caja en vez de por unidad. */
const importeNoCuadra = (impreso: number | null, calculado: number | null) =>
  impreso != null && calculado != null && Math.abs(calculado - impreso) > Math.max(0.05, Math.abs(impreso) * 0.02);
const pctTxt = (n: number) => String(round(n, 2)).replace(".", ",");

export function buildDraft(ocr: OcrAlbaran, ctx: { arts: ArtRef[]; catalog: CatRef[]; catIva: CatIva; provs: ProvRef[]; packs: PackMemory }): Draft {
  const prov = matchProveedor(ocr.proveedor_nombre, ocr.proveedor_cif, ctx.provs);
  const tasas = ocr.desglose_iva.map((r) => tipoIva(r.tipo)).filter((t): t is number => t != null);
  const singleRate = ocr.desglose_iva.length === 1 ? tipoIva(ocr.desglose_iva[0].tipo) : null;
  const tasaMaxima = tasas.length ? Math.max(...tasas) : null; // los portes y los envases llevan el IVA más alto del documento
  const dg = dtoGlobalPct(ocr);
  let sinTasaBruto = false;
  const lineas: DraftLine[] = ocr.lineas.map((l, i) => {
    const texto = l.descripcion.trim();
    const tipo = tipoLinea(l);
    const noProducto = tipo !== "producto";
    // 1) alias aprendido o artículo propio; 2) catálogo base; 3) sin coincidencia. Lo que no es un producto no se empareja solo,
    //    pero conserva sus candidatos por si el usuario lo quiere deshacer
    const own = bestMatches(texto, ctx.arts, (a) => [a.name, ...a.aliases], 0.4, 3, true);
    const cat = bestMatches(texto, ctx.catalog, (c) => [c.name, ...c.aliases], 0.4, 3, true);
    let match: DraftLine["match"] = null;
    if (noProducto) match = null;
    else if (own[0] && own[0].score >= MATCH_AUTO) match = { tipo: "tuyo", id: own[0].item.id, score: own[0].score, porUsuario: false };
    else if (cat[0] && cat[0].score >= MATCH_AUTO && !ctx.arts.some((a) => norm(a.name) === norm(cat[0].item.name))) match = { tipo: "catalogo", id: cat[0].item.id, score: cat[0].score, porUsuario: false };
    else if (cat[0] && cat[0].score >= MATCH_AUTO) { const a = ctx.arts.find((x) => norm(x.name) === norm(cat[0].item.name))!; match = { tipo: "tuyo", id: a.id, score: cat[0].score, porUsuario: false }; }
    const candidatos = [
      ...own.map((c) => ({ tipo: "tuyo" as const, id: c.item.id, name: c.item.name, score: c.score })),
      ...cat.filter((c) => !ctx.arts.some((a) => norm(a.name) === norm(c.item.name))).map((c) => ({ tipo: "catalogo" as const, id: c.item.id, name: c.item.name, score: c.score })),
    ].sort((a, b) => b.score - a.score).slice(0, 4);

    const base = lineBase(match, ctx);
    // Unidad de compra y factor de conversión. Nunca se cambia la unidad impresa en la línea.
    let unidadCompra = (l.unidad || "").trim();
    let factor: number | null = null;
    let factorFuente: DraftLine["factorFuente"] = null;
    let sugerido = false;
    const mem = match && match.tipo === "tuyo" ? ctx.packs.get(match.id!) : undefined;
    if (base) {
      const u = norm(unidadCompra);
      // El envase recordado solo vale si la línea no trae unidad o trae la misma; si se aprendió con otro proveedor, se propone y se pregunta
      if (mem && mem.factor > 0 && !esUnidadBase(unidadCompra, base.unit) && (!u || norm(mem.unidadCompra) === u)) {
        const enBase = esUnidadBase(mem.unidadCompra, base.unit);
        factor = enBase ? 1 : mem.factor; unidadCompra = mem.unidadCompra || unidadCompra; factorFuente = "articulo";
        sugerido = mem.propio === false && !enBase;
      } else {
        const cv = convertir(texto, unidadCompra, base.unit);
        if (cv) { factor = cv.factor; unidadCompra = cv.unidad; factorFuente = cv.fuente; }
      }
    }
    const ivaEsperado = base ? base.iva : null;
    const ivaRaro = l.iva_pct != null && tipoIva(l.iva_pct) == null;
    const ivaLeido = tipoIva(l.iva_pct) ?? singleRate ?? (noProducto ? tasaMaxima : null);
    // Con descuento, el importe ya viene rebajado: cantidad y precio se deducen deshaciéndolo
    // Una lectura rara (descuento fuera de 0–100 %, bonificadas negativas) se deja en un valor válido y editable
    const descuentoPropio = Math.min(100, Math.max(0, l.descuento_pct || 0));
    const bonificadas = Math.max(0, l.bonificadas || 0);
    const kDesc = 1 - descuentoPropio / 100;
    const cantidad = l.cantidad ?? (l.importe != null && l.precio_unitario && kDesc > 0 ? round(l.importe / (l.precio_unitario * kDesc), 3) : null);
    let precio = l.precio_unitario ?? (l.importe != null && cantidad && kDesc > 0 ? round(l.importe / (cantidad * kDesc), 4) : null);
    let importe = l.importe;
    // El descuento general del pie rebaja el coste real de cada línea: se suma al descuento propio de la línea
    const descuento = dg > 0 && tipo !== "devolucion" ? round(100 * (1 - kDesc * (1 - dg / 100)), 4) : descuentoPropio;
    // Cantidad × precio contra el importe impreso (sin el descuento general, que el importe impreso no lleva)
    const calculado = l.cantidad != null && l.precio_unitario != null ? round(l.cantidad * l.precio_unitario * kDesc, 2) : null;
    const descuadre = !noProducto && importeNoCuadra(l.importe, calculado);
    // Precios con IVA incluido: se pasan a sin IVA cuando se sabe el tipo de la línea
    let brutoSinTasa = false;
    if (ocr.precios_con_iva && !noProducto) {
      if (ivaLeido != null) {
        const k = 1 / (1 + ivaLeido / 100);
        if (precio != null) precio = round(precio * k, 4);
        if (importe != null) importe = round(importe * k, 2);
      } else { brutoSinTasa = true; sinTasaBruto = true; }
    }
    const motivos: string[] = [];
    if (!noProducto && precio == null) motivos.push("No aparece el precio de esta línea: ponlo para calcular el coste.");
    else if (!noProducto && l.confianza_precio === "baja") motivos.push("El precio no se lee con seguridad.");
    if (!noProducto && l.confianza === "baja" && !l.duda) motivos.push("No estamos seguros de haber leído bien esta línea.");
    if (descuadre) motivos.push(`El importe de la línea (${eur(l.importe)}) no cuadra con ${qtyTxt(l.cantidad!)} × ${eur(l.precio_unitario)}${descuentoPropio ? ` − ${pctTxt(descuentoPropio)} %` : ""} (${eur(calculado)}).`);
    if (brutoSinTasa) motivos.push("El precio de este documento lleva el IVA incluido y esta línea no dice qué IVA tiene: elige el IVA y corrige el precio.");
    const decisiones = noProducto ? { articulo: false, iva: false, cantidad: false, unidad: false } : {
      articulo: !match,
      iva: ivaLeido == null || (ivaEsperado != null && ivaLeido !== ivaEsperado),
      // «cantidad» es la decisión de revisar la línea (cantidad y precio): se pide si algo de ella no se lee o no cuadra
      cantidad: l.cantidad == null || precio == null || l.confianza_cantidad === "baja" || l.confianza_precio === "baja" || l.confianza === "baja" || descuadre || brutoSinTasa,
      unidad: !!base && (factor == null || sugerido),
    };
    const duda = [l.duda, ivaRaro ? `En la línea pone IVA ${String(l.iva_pct).replace(".", ",")} %, que no es un tipo de IVA (¿recargo de equivalencia?)` : null, ...motivos].filter(Boolean).join(" · ") || null;
    return {
      id: lid(i), texto, cantidad, cantidadTexto: l.cantidad_texto || (l.cantidad != null ? String(l.cantidad) : ""), unidadCompra: unidadCompra || (base?.unit ?? ""),
      factor, factorFuente, precio, descuento, bonificadas, importe,
      ivaLeido, iva: decisiones.iva ? null : ivaLeido, ivaEsperado,
      conf: { linea: l.confianza, cantidad: l.confianza_cantidad, precio: l.confianza_precio }, duda,
      match, nuevo: null, candidatos, decisiones,
      resuelto: { articulo: !decisiones.articulo, iva: !decisiones.iva, cantidad: !decisiones.cantidad, unidad: !decisiones.unidad },
      ...(noProducto ? { ignorar: true, tipo: tipo as "portes" | "envase" | "devolucion" | "otro" } : {}),
    };
  });
  const notas: string[] = [];
  if (dg > 0) notas.push(`Descuento general del ${pctTxt(dg)} %${ocr.descuento_global_importe ? ` (${eur(ocr.descuento_global_importe)})` : ""}: ya está repartido entre las líneas.`);
  if (ocr.precios_con_iva) notas.push(sinTasaBruto ? "Los precios del documento llevan el IVA incluido: los hemos pasado a precios sin IVA, salvo en las líneas que no dicen su IVA." : "Los precios del documento llevan el IVA incluido: los hemos pasado a precios sin IVA.");
  if (lineas.some((l) => l.tipo === "devolucion")) notas.push("Hay una devolución o un abono: solo cuenta para el total. Si devuelves producto, ajusta a mano la cantidad de su línea.");
  return {
    proveedor: { nombreLeido: ocr.proveedor_nombre, cif: ocr.proveedor_cif, id: prov?.id ?? null, conf: ocr.confianza_proveedor, nuevo: !prov, nombre: prov ? prov.name : prettyName(ocr.proveedor_nombre ?? "") },
    tipoDocumento: ocr.tipo_documento,
    duplicado: null,
    numero: ocr.numero, numeroAlt: ocr.numero_alternativo, confNumero: ocr.confianza_numero, numeroRevisado: ocr.confianza_numero === "alta",
    fecha: ocr.fecha, confFecha: ocr.confianza_fecha,
    total: ocr.total, confTotal: ocr.confianza_total, totalSinIva: ocr.total_sin_iva ?? null,
    desglose: ocr.desglose_iva, lineas, observaciones: [...notas, ocr.observaciones].filter(Boolean).join(" · ") || null,
  };
}
const qtyTxt = (n: number) => String(round(n, 3)).replace(".", ",");
function lineBase(match: DraftLine["match"], ctx: { arts: ArtRef[]; catalog: CatRef[]; catIva: CatIva }) {
  if (!match) return null;
  if (match.tipo === "tuyo") { const a = ctx.arts.find((x) => x.id === match.id); return a ? { unit: a.unit, iva: a.iva } : null; }
  const c = ctx.catalog.find((x) => x.id === match.id);
  return c ? { unit: c.unit, iva: ctx.catIva.get(c.categoryId) ?? 10 } : null;
}
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function lineImporte(l: DraftLine): number | null {
  if (l.cantidad == null || l.precio == null) return l.importe;
  return lineaCoste(l.cantidad, l.precio, l.descuento, l.bonificadas, 1).importe;
}
export function pendientes(l: DraftLine): string[] {
  const p: string[] = [];
  if (l.ignorar) return p;
  if (!l.resuelto.articulo) p.push("articulo");
  if (!l.resuelto.cantidad) p.push("cantidad");
  if (!l.resuelto.unidad) p.push("unidad");
  if (!l.resuelto.iva) p.push("iva");
  return p;
}
export function draftCheck(d: Draft) {
  let base = 0, cuota = 0; let incompleto = false;
  const byRate = new Map<number, number>();
  for (const l of d.lineas) {
    const imp = lineImporte(l);
    if (l.ignorar && imp != null && (l.iva ?? l.ivaLeido) == null) { base += imp; continue; }
    const rate = l.iva ?? l.ivaLeido ?? l.ivaEsperado;
    if (imp == null || rate == null) { incompleto = true; continue; }
    base += imp; cuota += imp * rate / 100;
    byRate.set(rate, (byRate.get(rate) || 0) + imp);
  }
  const total = base + cuota;
  const pend = d.lineas.reduce((n, l) => n + pendientes(l).length, 0);
  // Un documento que no desglosa IVA (albarán valorado sin IVA) trae su total sin IVA: se compara con la suma de las bases
  const sinIva = d.total == null && d.totalSinIva != null;
  const objetivo = d.total ?? d.totalSinIva ?? null;
  const comparado = sinIva ? base : total;
  const diff = objetivo != null ? comparado - objetivo : null;
  const cuadra = diff != null && Math.abs(diff) <= Math.max(0.02, Math.abs(objetivo ?? 0) * 0.0015);
  const desglose = d.desglose.map((r) => ({ ...r, calc: byRate.get(r.tipo) || 0, ok: r.base == null ? null : Math.abs((byRate.get(r.tipo) || 0) - r.base) <= 0.02 }));
  return { base, cuota, total, diff, cuadra, incompleto, pendientes: pend, desglose, sinIva, objetivo, comparado };
}
/** Nivel de confianza global para decidir si hay que releer con el modelo superior. */
export function needsEscalation(ocr: OcrAlbaran): boolean {
  if (!ocr.lineas.length) return true;
  const low = ocr.lineas.filter((l) => l.confianza === "baja").length;
  if (low / ocr.lineas.length > 0.3) return true;
  // La suma de las líneas (con el descuento general, sin IVA) contra el total: si no cuadra, el documento está mal leído
  const k = 1 - dtoGlobalPct(ocr) / 100;
  const neto = (l: OcrAlbaran["lineas"][number]) => importeLinea(l) * (tipoLinea(l) === "devolucion" ? 1 : k);
  const base = ocr.lineas.reduce((s, l) => s + neto(l), 0);
  const sinIva = ocr.total == null && ocr.total_sin_iva != null;
  const objetivo = ocr.total ?? ocr.total_sin_iva ?? null;
  if (objetivo == null || !(base > 0)) return false;
  let comparado = base;
  if (!sinIva && !ocr.precios_con_iva) {
    // El IVA: el desglose del pie y, si no lo hay, el de cada línea. Sin ninguno de los dos no hay con qué comparar
    const cuotas = ocr.desglose_iva.map((r) => r.cuota).filter((c): c is number => c != null);
    if (cuotas.length) comparado += cuotas.reduce((s, c) => s + c, 0);
    else if (ocr.lineas.some((l) => tipoIva(l.iva_pct) != null)) comparado += ocr.lineas.reduce((s, l) => s + neto(l) * (tipoIva(l.iva_pct) ?? 0) / 100, 0);
    else return false;
  }
  return Math.abs(comparado - objetivo) / objetivo > 0.02;
}
export const CONF_ORDER: Record<Conf, number> = { alta: 0, media: 1, baja: 2 };

/** "DISTRIBUCIONES MARTINEZ S.L." → "Distribuciones Martinez". */
export function prettyName(s: string): string {
  const t = s.replace(/\b(s\.?\s?l\.?u?|s\.?\s?a\.?|s\.?\s?c\.?\s?c\.?\s?l\.?|c\.?\s?b\.?|sccl)\.?$/i, "").trim().replace(/[.,]+$/, "");
  return t.toLowerCase().replace(/(^|[\s-])([a-záéíóúñü])/g, (_m, a: string, b: string) => a + b.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y|El)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
}
/** "MIX GOURMET 125G" → "Mix gourmet 125 g" (nombre propuesto para un artículo nuevo). */
export function prettyProduct(s: string): string {
  return s.toLowerCase().replace(/(\d)\s?(kg|g|gr|l|ml|cl)\b/g, (_m, d: string, u: string) => d + " " + (u === "l" ? "L" : u === "gr" ? "g" : u)).replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}
