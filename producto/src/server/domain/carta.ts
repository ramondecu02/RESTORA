// Estadísticas de la carta (coste, food cost, margen) con el motor de costes.
import type { Db } from "../db";
import type { Local } from "../ctx";
import { recetaCost } from "@/lib/costing";
import { resumenCarta, type DishStat } from "@/lib/menu";
import { loadCostContext, type RecetaRow } from "./costs";

export const fcObj = (r: Pick<RecetaRow, "fc_objetivo" | "reventa" | "margen_objetivo">, local: Pick<Local, "fc_objetivo">) =>
  r.fc_objetivo ?? (r.reventa && r.margen_objetivo != null ? 100 - r.margen_objetivo : local.fc_objetivo);

export async function dishStats(c: Db, local: Local, overrides?: Map<string, number>) {
  const loaded = await loadCostContext(c, local.id);
  if (overrides) loaded.ctx.overrides = overrides;
  const stats: (DishStat & { tipo: string; foto_key: string | null; en_carta: boolean; orden: number; estado: string; missing: number; descripcion: string })[] = [];
  for (const r of loaded.recetas) {
    if (r.tipo === "elaboracion") continue;
    const rc = recetaCost(r.id, loaded.ctx);
    stats.push({
      id: r.id, name: r.name, familia: r.familia || (r.reventa ? "Bebidas" : "Otros"), reventa: r.reventa, pvp: r.pvp, iva: local.iva_venta,
      coste: rc.perUnit, ventas: r.ventas_mes, fcObjetivo: fcObj(r, local), tipo: r.tipo, foto_key: r.foto_key, en_carta: r.en_carta,
      orden: r.orden, estado: r.estado, missing: rc.missing, descripcion: r.descripcion,
    });
  }
  return { ...loaded, stats };
}

/** Food cost ponderado de la carta con y sin un cambio de precio. */
export async function fcCartaConCambio(c: Db, local: Local, articuloId: string, nuevoPrecio: number) {
  const a = await dishStats(c, local);
  const b = await dishStats(c, local, new Map([[articuloId, nuevoPrecio]]));
  const ra = resumenCarta(a.stats.filter((s) => s.en_carta));
  const rb = resumenCarta(b.stats.filter((s) => s.en_carta));
  return { antes: ra.fc, despues: rb.fc, costeMesAntes: ra.coste, costeMesDespues: rb.coste };
}
