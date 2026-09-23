// Consumo estimado de cada artículo: por recetas × ventas, por consumo semanal declarado o por compras recientes.
import { all, type Db } from "../db";
import { explode } from "@/lib/costing";
import { loadCostContext } from "./costs";

/** Consumo anual estimado (en unidad base) por artículo. */
export async function consumoAnual(c: Db, localId: string): Promise<Map<string, { anual: number; fuente: "recetas" | "declarado" | "compras" }>> {
  const { arts, recetas, ctx } = await loadCostContext(c, localId);
  const out = new Map<string, { anual: number; fuente: "recetas" | "declarado" | "compras" }>();
  const byRecipes = new Map<string, number>();
  for (const r of recetas) {
    if (r.tipo === "elaboracion" || !r.ventas_mes) continue;
    const ex = explode(r.id, ctx);
    for (const [aid, q] of ex) byRecipes.set(aid, (byRecipes.get(aid) ?? 0) + q * r.ventas_mes * 12);
  }
  const compras = await all<{ articulo_id: string; q: number }>(c, `select cl.articulo_id, sum((cl.cantidad + cl.bonificadas) * cl.factor)::float as q
    from compra_lineas cl join documentos d on d.id = cl.documento_id where d.local_id = $1 and d.status = 'guardado' and d.fecha >= current_date - 90
    group by cl.articulo_id`, [localId]);
  const byCompras = new Map(compras.map((x) => [x.articulo_id, x.q * 4]));
  for (const a of arts) {
    const rend = Math.max(1, a.rend) / 100;
    const rec = byRecipes.get(a.id);
    if (rec) out.set(a.id, { anual: rec / rend, fuente: "recetas" });
    else if (a.consumo_semanal) out.set(a.id, { anual: a.consumo_semanal * 52, fuente: "declarado" });
    else if (byCompras.get(a.id)) out.set(a.id, { anual: byCompras.get(a.id)!, fuente: "compras" });
  }
  return out;
}
