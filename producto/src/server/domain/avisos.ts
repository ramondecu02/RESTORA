// Inteligencia: subidas de precio que afectan a tus platos, con impacto al mes y platos que se salen del objetivo.
import { all, type Db } from "../db";
import type { Local } from "../ctx";
import { explode, foodCost, type CostContext } from "@/lib/costing";
import { resumenCarta } from "@/lib/menu";
import { loadCostContext, type RecetaRow } from "./costs";
import { computeStats, type Stat } from "./carta";

/** Criterio de los avisos (lo usa también el contador del menú): último cambio de cada artículo en estos días y subida mínima. */
export const AVISO_DIAS = 45;
export const AVISO_MIN = 0.005;

export type PriceAlert = {
  articuloId: string; name: string; unit: string; proveedor: string | null; fecha: string; antes: number; ahora: number; variacion: number;
  platos: { id: string; name: string }[]; salen: { id: string; name: string }[]; impactoMes: number; fcAntes: number | null; fcDespues: number | null;
  alternativa: { proveedor: string; precio: number } | null;
};

/**
 * Efecto de un cambio de precio de un artículo en los platos de la carta que lo usan. Los dos lados se calculan igual
 * (precio anterior frente a precio nuevo), no frente al coste de hoy, que es el PMP o el precio manual.
 */
export function efectoCambio(recetas: RecetaRow[], ctx: CostContext, local: Local, articuloId: string, antes: number, ahora: number, afectados: Set<string>) {
  const conPrecio = (p: number) => computeStats(recetas, ctx, local, new Map([[articuloId, p]])).filter((s) => s.en_carta);
  const before = conPrecio(antes), after = conPrecio(ahora);
  const bMap = new Map(before.map((s) => [s.id, s]));
  let impactoMes = 0;
  const platos: { id: string; name: string }[] = [], salen: { id: string; name: string }[] = [];
  for (const s of after) {
    if (!afectados.has(s.id)) continue;
    const b = bMap.get(s.id)!;
    impactoMes += (s.coste - b.coste) * s.ventas;
    platos.push({ id: s.id, name: s.name });
    if (s.sinCoste) continue;
    const fb = foodCost(b.coste, s.pvp, s.iva), fn = foodCost(s.coste, s.pvp, s.iva);
    if (fb != null && fn != null && fb <= s.fcObjetivo / 100 && fn > s.fcObjetivo / 100) salen.push({ id: s.id, name: s.name });
  }
  return { platos, salen, impactoMes, fcAntes: resumenCarta(before).fc, fcDespues: resumenCarta(after).fc };
}

export async function priceAlerts(c: Db, local: Local, dias = AVISO_DIAS): Promise<{ alerts: PriceAlert[]; stats: Stat[] }> {
  const loaded = await loadCostContext(c, local.id);
  const now = computeStats(loaded.recetas, loaded.ctx, local);
  const evs = await all<{ articulo_id: string; name: string; unit: string; precio_anterior: number; precio_nuevo: number; variacion: number; fecha: string; proveedor: string | null }>(c, `
    select distinct on (pe.articulo_id) pe.articulo_id, a.name, a.unit, pe.precio_anterior, pe.precio_nuevo, pe.variacion, pe.fecha, p.name as proveedor
    from precio_eventos pe join articulos a on a.id = pe.articulo_id left join proveedores p on p.id = pe.proveedor_id
    where a.local_id = $1 and not a.archived and pe.fecha >= current_date - $2::int order by pe.articulo_id, pe.fecha desc, pe.created_at desc`, [local.id, dias]);
  const alts = await all<{ articulo_id: string; proveedor: string; precio_unit: number }>(c, `select ap.articulo_id, p.name as proveedor, ap.precio_unit from articulo_proveedor ap
    join proveedores p on p.id = ap.proveedor_id join articulos a on a.id = ap.articulo_id where a.local_id = $1 and ap.precio_unit is not null`, [local.id]);
  const carta = now.filter((s) => s.en_carta);
  const uses = new Map<string, Set<string>>();
  for (const s of carta) for (const aid of explode(s.id, loaded.ctx).keys()) { const set = uses.get(aid) ?? new Set(); set.add(s.id); uses.set(aid, set); }
  const alerts: PriceAlert[] = [];
  for (const e of evs) {
    if (e.variacion <= AVISO_MIN) continue;
    const affected = uses.get(e.articulo_id);
    if (!affected?.size) continue;
    const ef = efectoCambio(loaded.recetas, loaded.ctx, local, e.articulo_id, e.precio_anterior, e.precio_nuevo, affected);
    const cheaper = alts.filter((a) => a.articulo_id === e.articulo_id && a.precio_unit < e.precio_nuevo * 0.995).sort((a, b) => a.precio_unit - b.precio_unit)[0];
    alerts.push({
      articuloId: e.articulo_id, name: e.name, unit: e.unit, proveedor: e.proveedor, fecha: e.fecha, antes: e.precio_anterior, ahora: e.precio_nuevo, variacion: e.variacion,
      ...ef, alternativa: cheaper ? { proveedor: cheaper.proveedor, precio: cheaper.precio_unit } : null,
    });
  }
  alerts.sort((a, b) => (b.salen.length - a.salen.length) || (b.impactoMes - a.impactoMes));
  return { alerts, stats: now };
}
