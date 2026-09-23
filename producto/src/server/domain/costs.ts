// Carga del contexto de costes (artículos + recetas) y recálculo de la caché de coste por receta.
import { all, type Db } from "../db";
import { recetaCost, type ArtCost, type CostContext, type RecetaNode } from "@/lib/costing";
import { toBase, type BaseUnit, type LineUnit } from "@/lib/units";

export type ArtRow = {
  id: string; name: string; unit: BaseUnit; rend: number; pmp: number | null; last_price: number | null; last_purchase_at: Date | null;
  precio_manual: number | null; precio_manual_at: Date | null; category_id: string; iva: number; stock: number; stock_min: number | null;
  consumo_semanal: number | null; track_stock: boolean; last_proveedor_id: string | null; proveedor_pref_id: string | null;
  catalog_item_id: string | null; aliases: string[]; demo: boolean; foto_key: string | null;
};
export type RecetaRow = {
  id: string; tipo: "elaboracion" | "plato" | "menu"; name: string; familia: string; raciones: number; rinde: number; rinde_unit: BaseUnit;
  fc_objetivo: number | null; pvp: number | null; reventa: boolean; coste_manual: number | null; margen_objetivo: number | null;
  ventas_mes: number; en_carta: boolean; orden: number; estado: "borrador" | "activo"; foto_key: string | null; descripcion: string;
  notas: string; coste_cache: number | null; demo: boolean; updated_at: Date;
};
export type LineaRow = { receta_id: string; idx: number; articulo_id: string | null; subreceta_id: string | null; cantidad: number; unidad: LineUnit };

export const toArtCost = (a: ArtRow): ArtCost => ({
  id: a.id, name: a.name, unit: a.unit, rend: a.rend, pmp: a.pmp, lastPrice: a.last_price,
  lastPurchaseAt: a.last_purchase_at ? new Date(a.last_purchase_at).toISOString() : null,
  precioManual: a.precio_manual, precioManualAt: a.precio_manual_at ? new Date(a.precio_manual_at).toISOString() : null,
});

export async function loadArticulos(c: Db, localId: string) {
  return all<ArtRow>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock,
    stock_min, consumo_semanal, track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key
    from articulos where local_id = $1 and not archived order by name`, [localId]);
}
export async function loadRecetas(c: Db, localId: string) {
  return all<RecetaRow>(c, `select id, tipo, name, familia, raciones, rinde, rinde_unit, fc_objetivo, pvp, reventa, coste_manual, margen_objetivo,
    ventas_mes, en_carta, orden, estado, foto_key, descripcion, notas, coste_cache, demo, updated_at
    from recetas where local_id = $1 and not archived order by orden, name`, [localId]);
}
export async function loadLineas(c: Db, localId: string) {
  return all<LineaRow>(c, `select l.receta_id, l.idx, l.articulo_id, l.subreceta_id, l.cantidad, l.unidad
    from receta_lineas l join recetas r on r.id = l.receta_id where r.local_id = $1 and not r.archived order by l.receta_id, l.idx`, [localId]);
}

export function buildContext(arts: ArtRow[], recetas: RecetaRow[], lineas: LineaRow[]): CostContext {
  const byR = new Map<string, LineaRow[]>();
  for (const l of lineas) { const a = byR.get(l.receta_id) ?? []; a.push(l); byR.set(l.receta_id, a); }
  return {
    arts: new Map(arts.map((a) => [a.id, toArtCost(a)])),
    recetas: new Map(recetas.map((r): [string, RecetaNode] => [r.id, {
      id: r.id, tipo: r.tipo, name: r.name, raciones: r.raciones, rinde: r.rinde, rindeUnit: r.rinde_unit, reventa: r.reventa, costeManual: r.coste_manual,
      lineas: (byR.get(r.id) ?? []).map((l) => ({ articuloId: l.articulo_id, subrecetaId: l.subreceta_id, cantidad: toBase(l.cantidad, l.unidad), unidad: l.unidad })),
    }])),
  };
}

export async function loadCostContext(c: Db, localId: string) {
  // Secuencial: una sola conexión (transacción) no admite consultas en paralelo
  const arts = await loadArticulos(c, localId);
  const recetas = await loadRecetas(c, localId);
  const lineas = await loadLineas(c, localId);
  return { arts, recetas, lineas, ctx: buildContext(arts, recetas, lineas) };
}

/** Recalcula y guarda el coste por ración (o por unidad de rinde) de todas las recetas del local. */
export async function recomputeCosts(c: Db, localId: string): Promise<Map<string, number>> {
  const { recetas, ctx } = await loadCostContext(c, localId);
  const out = new Map<string, number>();
  const ids: string[] = [], vals: (number | null)[] = [];
  for (const r of recetas) {
    const rc = recetaCost(r.id, ctx);
    const v = rc.cycle ? null : Math.round(rc.perUnit * 1e6) / 1e6;
    if (v != null) out.set(r.id, v);
    if ((r.coste_cache ?? null) !== v) { ids.push(r.id); vals.push(v); }
  }
  if (ids.length) {
    await c.query("update recetas r set coste_cache = v.c from unnest($1::uuid[], $2::numeric[]) as v(id, c) where r.id = v.id", [ids, vals]);
  }
  return out;
}
