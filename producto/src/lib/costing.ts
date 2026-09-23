// Motor de costes: artículo → elaboración → plato → menú, recursivo y con detección de ciclos.
import type { BaseUnit, LineUnit } from "./units";

export type ArtCost = {
  id: string;
  name: string;
  unit: BaseUnit;
  rend: number; // % aprovechable (100 − merma)
  pmp: number | null;
  lastPrice: number | null;
  lastPurchaseAt: string | null;
  precioManual: number | null;
  precioManualAt: string | null;
};

/** Precio de compra vigente (€/unidad base, sin IVA). El precio manual manda hasta que llega un albarán posterior. */
export function costeBase(a: ArtCost): number | null {
  if (a.precioManual != null) {
    if (!a.lastPurchaseAt || (a.precioManualAt && new Date(a.precioManualAt) >= new Date(a.lastPurchaseAt))) return a.precioManual;
  }
  return a.pmp ?? a.lastPrice ?? a.precioManual ?? null;
}
/** Coste por unidad aprovechable: precio / rendimiento. Equivale al precioNeto del prototipo: precio / (1 − merma). */
export function costeNeto(a: ArtCost, override?: number): number | null {
  const b = override ?? costeBase(a);
  if (b == null) return null;
  return b / (Math.max(1, a.rend) / 100);
}

export type RecetaLinea = { articuloId?: string | null; subrecetaId?: string | null; cantidad: number; unidad: LineUnit };
export type RecetaNode = {
  id: string;
  tipo: "elaboracion" | "plato" | "menu";
  name: string;
  raciones: number;
  rinde: number;
  rindeUnit: BaseUnit;
  reventa: boolean;
  costeManual: number | null;
  lineas: RecetaLinea[];
};
export type CostContext = {
  arts: Map<string, ArtCost>;
  recetas: Map<string, RecetaNode>;
  /** Precios simulados por artículo (€/unidad base), para "¿y si sube?". */
  overrides?: Map<string, number>;
};
export type LineCost = {
  idx: number;
  kind: "articulo" | "elaboracion" | "plato";
  refId: string;
  name: string;
  cantidad: number; // en unidad base del artículo o de la subreceta
  unidad: LineUnit;
  unitCost: number | null; // €/unidad base neta
  cost: number | null;
};
export type RecetaCost = { total: number; perUnit: number; lines: LineCost[]; missing: number; cycle: boolean };

export function recetaCost(id: string, ctx: CostContext, stack: Set<string> = new Set()): RecetaCost {
  const r = ctx.recetas.get(id);
  if (!r) return { total: 0, perUnit: 0, lines: [], missing: 1, cycle: false };
  if (stack.has(id)) return { total: 0, perUnit: 0, lines: [], missing: 1, cycle: true };
  stack.add(id);
  const lines: LineCost[] = [];
  let total = 0, missing = 0, cycle = false;
  r.lineas.forEach((l, idx) => {
    if (l.articuloId) {
      const a = ctx.arts.get(l.articuloId);
      const uc = a ? costeNeto(a, ctx.overrides?.get(a.id)) : null;
      const cost = uc == null ? null : uc * l.cantidad;
      if (cost == null) missing++; else total += cost;
      lines.push({ idx, kind: "articulo", refId: l.articuloId, name: a?.name ?? "Artículo eliminado", cantidad: l.cantidad, unidad: l.unidad, unitCost: uc, cost });
    } else if (l.subrecetaId) {
      const sub = ctx.recetas.get(l.subrecetaId);
      const sc = recetaCost(l.subrecetaId, ctx, stack);
      if (sc.cycle) cycle = true;
      const uc = sub && !sc.cycle ? sc.perUnit : null;
      const cost = uc == null || sc.missing ? (uc == null ? null : uc * l.cantidad) : uc * l.cantidad;
      if (cost == null) missing++; else total += cost;
      if (sc.missing) missing += sc.missing;
      lines.push({ idx, kind: sub?.tipo === "elaboracion" ? "elaboracion" : "plato", refId: l.subrecetaId, name: sub?.name ?? "Receta eliminada", cantidad: l.cantidad, unidad: l.unidad, unitCost: uc, cost });
    }
  });
  stack.delete(id);
  if (r.reventa && r.lineas.length === 0) {
    const c = r.costeManual ?? 0;
    return { total: c, perUnit: c, lines, missing: r.costeManual == null ? 1 : 0, cycle };
  }
  const div = r.tipo === "elaboracion" ? r.rinde : r.raciones;
  return { total, perUnit: div > 0 ? total / div : 0, lines, missing, cycle };
}

/** Cantidades netas de cada artículo por unidad de receta (ración o unidad de rinde), explotando subrecetas. */
export function explode(id: string, ctx: CostContext, mult = 1, acc: Map<string, number> = new Map(), stack: Set<string> = new Set()): Map<string, number> {
  const r = ctx.recetas.get(id);
  if (!r || stack.has(id)) return acc;
  stack.add(id);
  const div = r.tipo === "elaboracion" ? r.rinde : r.raciones;
  const k = div > 0 ? mult / div : 0;
  for (const l of r.lineas) {
    if (l.articuloId) acc.set(l.articuloId, (acc.get(l.articuloId) || 0) + l.cantidad * k);
    else if (l.subrecetaId) explode(l.subrecetaId, ctx, l.cantidad * k, acc, stack);
  }
  stack.delete(id);
  return acc;
}

// ---- Precio de venta, food cost y reventa (siempre sobre venta neta, sin IVA) ----
export const neto = (pvpConIva: number, iva: number) => pvpConIva / (1 + iva / 100);
export function foodCost(coste: number, pvpConIva: number | null | undefined, iva: number): number | null {
  if (!pvpConIva || pvpConIva <= 0) return null;
  return coste / neto(pvpConIva, iva);
}
export function pvpParaFc(coste: number, fcObjetivoPct: number, iva: number) {
  const net = fcObjetivoPct > 0 ? coste / (fcObjetivoPct / 100) : 0;
  return { net, gross: net * (1 + iva / 100) };
}
/** Reventa: el margen se mide sobre el precio de venta neto (no es un recargo). */
export function revPvp(coste: number, margenPct: number, iva: number) {
  const m = Math.min(99, Math.max(0, margenPct));
  const net = coste / (1 - m / 100);
  return net * (1 + iva / 100);
}
export function revMargen(coste: number, pvpConIva: number, iva: number) {
  const net = neto(pvpConIva, iva);
  return net > 0 ? ((net - coste) / net) * 100 : 0;
}
export type Estado = "ok" | "warn" | "crit";
export function estadoFC(fc: number | null, objetivoPct: number): { estado: Estado | "none"; label: string } {
  if (fc == null) return { estado: "none", label: "Sin PVP" };
  const p = fc * 100;
  if (p <= objetivoPct + 1e-9) return { estado: "ok", label: "En objetivo" };
  if (p <= objetivoPct + 3) return { estado: "warn", label: "Ajustado" };
  return { estado: "crit", label: "Revisar" };
}
