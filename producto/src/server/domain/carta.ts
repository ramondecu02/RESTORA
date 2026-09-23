// Estadísticas de la carta (coste, food cost, margen) con el motor de costes.
import type { Db } from "../db";
import type { Local } from "../ctx";
import { recetaCost, type CostContext } from "@/lib/costing";
import { resumenCarta, type DishStat } from "@/lib/menu";
import { loadCostContext, type RecetaRow } from "./costs";

export const fcObj = (r: Pick<RecetaRow, "fc_objetivo" | "reventa" | "margen_objetivo">, local: Pick<Local, "fc_objetivo">) =>
  r.fc_objetivo ?? (r.reventa && r.margen_objetivo != null ? 100 - r.margen_objetivo : local.fc_objetivo);

export type Stat = DishStat & { tipo: string; foto_key: string | null; en_carta: boolean; orden: number; estado: string; missing: number; descripcion: string };

export function computeStats(recetas: RecetaRow[], ctx: CostContext, local: Local, overrides?: Map<string, number>): Stat[] {
  const c2: CostContext = overrides ? { ...ctx, overrides } : ctx;
  const stats: Stat[] = [];
  for (const r of recetas) {
    if (r.tipo === "elaboracion") continue;
    const rc = recetaCost(r.id, c2);
    stats.push({
      id: r.id, name: r.name, familia: r.familia || (r.reventa ? "Bebidas" : "Otros"), reventa: r.reventa, pvp: r.pvp, iva: local.iva_venta,
      coste: rc.perUnit, ventas: r.ventas_mes, fcObjetivo: fcObj(r, local), tipo: r.tipo, foto_key: r.foto_key, en_carta: r.en_carta,
      orden: r.orden, estado: r.estado, missing: rc.missing, descripcion: r.descripcion,
    });
  }
  return stats;
}

export async function dishStats(c: Db, local: Local, overrides?: Map<string, number>) {
  const loaded = await loadCostContext(c, local.id);
  return { ...loaded, stats: computeStats(loaded.recetas, loaded.ctx, local, overrides) };
}

/** Food cost ponderado de la carta con y sin un cambio de precio. */
export async function fcCartaConCambio(c: Db, local: Local, articuloId: string, nuevoPrecio: number) {
  const l = await loadCostContext(c, local.id);
  const a = computeStats(l.recetas, l.ctx, local).filter((s) => s.en_carta);
  const b = computeStats(l.recetas, l.ctx, local, new Map([[articuloId, nuevoPrecio]])).filter((s) => s.en_carta);
  const ra = resumenCarta(a), rb = resumenCarta(b);
  return { antes: ra.fc, despues: rb.fc, costeMesAntes: ra.coste, costeMesDespues: rb.coste };
}
