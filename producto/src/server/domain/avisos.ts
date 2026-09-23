// Inteligencia: subidas de precio que afectan a tus platos, con impacto al mes y platos que se salen del objetivo.
import { all, type Db } from "../db";
import type { Local } from "../ctx";
import { explode, foodCost } from "@/lib/costing";
import { resumenCarta } from "@/lib/menu";
import { loadCostContext } from "./costs";
import { computeStats, type Stat } from "./carta";

export type PriceAlert = {
  articuloId: string; name: string; unit: string; proveedor: string | null; fecha: string; antes: number; ahora: number; variacion: number;
  platos: { id: string; name: string }[]; salen: { id: string; name: string }[]; impactoMes: number; fcAntes: number | null; fcDespues: number | null;
  alternativa: { proveedor: string; precio: number } | null;
};

export async function priceAlerts(c: Db, local: Local, dias = 45): Promise<{ alerts: PriceAlert[]; stats: Stat[] }> {
  const loaded = await loadCostContext(c, local.id);
  const now = computeStats(loaded.recetas, loaded.ctx, local);
  const evs = await all<{ articulo_id: string; name: string; unit: string; precio_anterior: number; precio_nuevo: number; variacion: number; fecha: string; proveedor: string | null }>(c, `
    select distinct on (pe.articulo_id) pe.articulo_id, a.name, a.unit, pe.precio_anterior, pe.precio_nuevo, pe.variacion, pe.fecha, p.name as proveedor
    from precio_eventos pe join articulos a on a.id = pe.articulo_id left join proveedores p on p.id = pe.proveedor_id
    where a.local_id = $1 and not a.archived and pe.fecha >= current_date - $2::int order by pe.articulo_id, pe.fecha desc, pe.created_at desc`, [local.id, dias]);
  const alts = await all<{ articulo_id: string; proveedor: string; precio_unit: number }>(c, `select ap.articulo_id, p.name as proveedor, ap.precio_unit from articulo_proveedor ap
    join proveedores p on p.id = ap.proveedor_id join articulos a on a.id = ap.articulo_id where a.local_id = $1 and ap.precio_unit is not null`, [local.id]);
  const carta = now.filter((s) => s.en_carta);
  const resNow = resumenCarta(carta);
  const uses = new Map<string, Set<string>>();
  for (const s of carta) for (const aid of explode(s.id, loaded.ctx).keys()) { const set = uses.get(aid) ?? new Set(); set.add(s.id); uses.set(aid, set); }
  const alerts: PriceAlert[] = [];
  for (const e of evs) {
    if (e.variacion <= 0.005) continue;
    const affected = uses.get(e.articulo_id);
    if (!affected?.size) continue;
    const before = computeStats(loaded.recetas, loaded.ctx, local, new Map([[e.articulo_id, e.precio_anterior]])).filter((s) => s.en_carta);
    const bMap = new Map(before.map((s) => [s.id, s]));
    let impacto = 0;
    const platos: { id: string; name: string }[] = [], salen: { id: string; name: string }[] = [];
    for (const s of carta) {
      if (!affected.has(s.id)) continue;
      const b = bMap.get(s.id)!;
      impacto += (s.coste - b.coste) * s.ventas;
      platos.push({ id: s.id, name: s.name });
      const fb = foodCost(b.coste, s.pvp, s.iva), fn = foodCost(s.coste, s.pvp, s.iva);
      if (fb != null && fn != null && fb <= s.fcObjetivo / 100 && fn > s.fcObjetivo / 100) salen.push({ id: s.id, name: s.name });
    }
    const cheaper = alts.filter((a) => a.articulo_id === e.articulo_id && a.precio_unit < e.precio_nuevo * 0.995).sort((a, b) => a.precio_unit - b.precio_unit)[0];
    alerts.push({
      articuloId: e.articulo_id, name: e.name, unit: e.unit, proveedor: e.proveedor, fecha: e.fecha, antes: e.precio_anterior, ahora: e.precio_nuevo, variacion: e.variacion,
      platos, salen, impactoMes: impacto, fcAntes: resumenCarta(before).fc, fcDespues: resNow.fc,
      alternativa: cheaper ? { proveedor: cheaper.proveedor, precio: cheaper.precio_unit } : null,
    });
  }
  alerts.sort((a, b) => (b.salen.length - a.salen.length) || (b.impactoMes - a.impactoMes));
  return { alerts, stats: now };
}
