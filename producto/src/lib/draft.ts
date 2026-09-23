// De la lectura del modelo al borrador de validación: emparejado, unidades, IVA y comprobación de totales.
import type { Draft, DraftLine, OcrAlbaran, Conf } from "./ocr-types";
import { bestMatches, norm } from "./fuzzy";
import { inferPackFactor, type BaseUnit } from "./units";
import { lineaCoste } from "./pmp";

export type ArtRef = { id: string; name: string; aliases: string[]; unit: BaseUnit; categoryId: string; iva: number; rend: number };
export type CatRef = { id: string; name: string; aliases: string[]; unit: BaseUnit; categoryId: string; rend: number };
export type CatIva = Map<string, number>;
export type ProvRef = { id: string; name: string; cif: string };
export type PackMemory = Map<string, { unidadCompra: string; factor: number }>; // clave articuloId

const lid = (i: number) => "l" + (i + 1);
export const MATCH_AUTO = 0.84;

export function matchProveedor(nombre: string | null, cif: string | null, provs: ProvRef[]): ProvRef | null {
  if (cif) { const c = norm(cif).replace(/ /g, ""); const p = provs.find((x) => x.cif && norm(x.cif).replace(/ /g, "") === c); if (p) return p; }
  if (!nombre) return null;
  const best = bestMatches(nombre, provs, (p) => [p.name], 0.7, 1)[0];
  return best ? best.item : null;
}

export function buildDraft(ocr: OcrAlbaran, ctx: { arts: ArtRef[]; catalog: CatRef[]; catIva: CatIva; provs: ProvRef[]; packs: PackMemory }): Draft {
  const prov = matchProveedor(ocr.proveedor_nombre, ocr.proveedor_cif, ctx.provs);
  const singleRate = ocr.desglose_iva.length === 1 ? ocr.desglose_iva[0].tipo : null;
  const lineas: DraftLine[] = ocr.lineas.map((l, i) => {
    const texto = l.descripcion.trim();
    // 1) alias aprendido o artículo propio; 2) catálogo base; 3) sin coincidencia
    const own = bestMatches(texto, ctx.arts, (a) => [a.name, ...a.aliases], 0.4, 3);
    const cat = bestMatches(texto, ctx.catalog, (c) => [c.name, ...c.aliases], 0.4, 3);
    let match: DraftLine["match"] = null;
    if (own[0] && own[0].score >= MATCH_AUTO) match = { tipo: "tuyo", id: own[0].item.id, score: own[0].score, porUsuario: false };
    else if (cat[0] && cat[0].score >= MATCH_AUTO && !ctx.arts.some((a) => norm(a.name) === norm(cat[0].item.name))) match = { tipo: "catalogo", id: cat[0].item.id, score: cat[0].score, porUsuario: false };
    else if (cat[0] && cat[0].score >= MATCH_AUTO) { const a = ctx.arts.find((x) => norm(x.name) === norm(cat[0].item.name))!; match = { tipo: "tuyo", id: a.id, score: cat[0].score, porUsuario: false }; }
    const candidatos = [
      ...own.map((c) => ({ tipo: "tuyo" as const, id: c.item.id, name: c.item.name, score: c.score })),
      ...cat.filter((c) => !ctx.arts.some((a) => norm(a.name) === norm(c.item.name))).map((c) => ({ tipo: "catalogo" as const, id: c.item.id, name: c.item.name, score: c.score })),
    ].sort((a, b) => b.score - a.score).slice(0, 4);

    const base = lineBase(match, ctx);
    // Unidad de compra y factor de conversión
    let unidadCompra = (l.unidad || "").trim();
    let factor: number | null = null;
    let factorFuente: DraftLine["factorFuente"] = null;
    const mem = match && match.tipo === "tuyo" ? ctx.packs.get(match.id!) : undefined;
    if (base) {
      const u = norm(unidadCompra);
      const inferred = inferPackFactor(texto + " " + unidadCompra, base.unit);
      if (mem && (!u || norm(mem.unidadCompra) === u || !inferred)) { factor = mem.factor; unidadCompra = mem.unidadCompra || unidadCompra; factorFuente = "articulo"; }
      else if (inferred) { factor = inferred.factor; unidadCompra = unidadCompra || inferred.label; factorFuente = "texto"; }
      else if (!u || u === norm(base.unit) || (base.unit === "kg" && /^(kg|kilo|kilos|k)$/.test(u)) || (base.unit === "L" && /^(l|lt|litro|litros)$/.test(u)) || (base.unit === "ud" && /^(ud|uds|u|unidad|unidades|und|pieza|piezas)$/.test(u))) { factor = 1; unidadCompra = unidadCompra || base.unit; factorFuente = "unidad"; }
    }
    const ivaEsperado = base ? base.iva : null;
    const ivaLeido = l.iva_pct ?? singleRate ?? null;
    const cantidad = l.cantidad ?? (l.importe != null && l.precio_unitario ? round(l.importe / (l.precio_unitario * (1 - (l.descuento_pct || 0) / 100)), 3) : null);
    const precio = l.precio_unitario ?? (l.importe != null && cantidad ? round(l.importe / cantidad, 4) : null);
    const decisiones = {
      articulo: !match,
      iva: ivaLeido == null || (ivaEsperado != null && ivaLeido !== ivaEsperado),
      cantidad: l.cantidad == null || l.confianza_cantidad === "baja",
      unidad: !!base && factor == null,
    };
    return {
      id: lid(i), texto, cantidad, cantidadTexto: l.cantidad_texto || (l.cantidad != null ? String(l.cantidad) : ""), unidadCompra: unidadCompra || (base?.unit ?? ""),
      factor, factorFuente, precio, descuento: l.descuento_pct || 0, bonificadas: l.bonificadas || 0, importe: l.importe,
      ivaLeido, iva: decisiones.iva ? null : ivaLeido, ivaEsperado,
      conf: { linea: l.confianza, cantidad: l.confianza_cantidad, precio: l.confianza_precio }, duda: l.duda,
      match, nuevo: null, candidatos, decisiones,
      resuelto: { articulo: !decisiones.articulo, iva: !decisiones.iva, cantidad: !decisiones.cantidad, unidad: !decisiones.unidad },
    };
  });
  return {
    proveedor: { nombreLeido: ocr.proveedor_nombre, cif: ocr.proveedor_cif, id: prov?.id ?? null, conf: ocr.confianza_proveedor, nuevo: !prov, nombre: prov ? prov.name : prettyName(ocr.proveedor_nombre ?? "") },
    tipoDocumento: ocr.tipo_documento,
    duplicado: null,
    numero: ocr.numero, numeroAlt: ocr.numero_alternativo, confNumero: ocr.confianza_numero, numeroRevisado: ocr.confianza_numero === "alta",
    fecha: ocr.fecha, confFecha: ocr.confianza_fecha,
    total: ocr.total, confTotal: ocr.confianza_total,
    desglose: ocr.desglose_iva, lineas, observaciones: ocr.observaciones,
  };
}
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
  const diff = d.total != null ? total - d.total : null;
  const cuadra = diff != null && Math.abs(diff) <= Math.max(0.02, Math.abs(d.total ?? 0) * 0.0015);
  const desglose = d.desglose.map((r) => ({ ...r, calc: byRate.get(r.tipo) || 0, ok: r.base == null ? null : Math.abs((byRate.get(r.tipo) || 0) - r.base) <= 0.02 }));
  return { base, cuota, total, diff, cuadra, incompleto, pendientes: pend, desglose };
}
/** Nivel de confianza global para decidir si hay que releer con el modelo superior. */
export function needsEscalation(ocr: OcrAlbaran): boolean {
  if (!ocr.lineas.length) return true;
  const low = ocr.lineas.filter((l) => l.confianza === "baja").length;
  if (low / ocr.lineas.length > 0.3) return true;
  const base = ocr.lineas.reduce((s, l) => s + (l.importe ?? (l.cantidad ?? 0) * (l.precio_unitario ?? 0)), 0);
  const cuota = ocr.desglose_iva.reduce((s, r) => s + (r.cuota ?? 0), 0);
  if (ocr.total != null && base > 0) {
    const t = base + (cuota || 0);
    if (Math.abs(t - ocr.total) / ocr.total > 0.02) return true;
  }
  return false;
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
