// Importación de ventas del TPV (CSV): líneas con coste congelado, alias recordados, stock y unidades al mes.
import { all, one, withTenant, type Db } from "../db";
import { UserError, type AppCtx } from "../ctx";
import { audit } from "../audit";
import { explode, recetaCost } from "@/lib/costing";
import { norm } from "@/lib/fuzzy";
import { neto } from "@/lib/costing";
import { isoDate } from "@/lib/format";
import { loadCostContext } from "./costs";
import { rebuildArticulo } from "./articulos";

export type VentaIn = { fecha: string | null; producto: string; unidades: number; importe: number | null };
export type ImportIn = { filename: string; fuente: string; rows: VentaIn[]; mapa: Record<string, string | null>; actualizarUds: boolean; descontarStock: boolean; comensales: number | null };

export async function importarVentas(ctx: AppCtx, input: ImportIn) {
  if (input.rows.length > 50_000) throw new UserError("El archivo es demasiado grande. Divídelo por meses.");
  return withTenant(ctx.tenantId, async (c) => {
    const { recetas, ctx: cc } = await loadCostContext(c, ctx.local.id);
    const valid = new Map(recetas.filter((r) => r.tipo !== "elaboracion").map((r) => [r.id, r]));
    const hoy = isoDate();
    const fechas = input.rows.map((r) => r.fecha).filter((f): f is string => !!f && /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
    const desde = fechas[0] ?? hoy, hasta = fechas[fechas.length - 1] ?? hoy;
    const imp = await one<{ id: string }>(c, `insert into ventas_importes (tenant_id, local_id, fuente, filename, desde, hasta, filas, total, comensales, created_by)
      values ($1,$2,$3,$4,$5,$6,0,0,$7,$8) returning id`, [ctx.tenantId, ctx.local.id, input.fuente.slice(0, 40), input.filename.slice(0, 120), desde, hasta, input.comensales, ctx.userId]);
    const unidadesPorReceta = new Map<string, number>();
    let filas = 0, total = 0, sinAsignar = 0;
    const costeCache = new Map<string, number>();
    for (const r of input.rows) {
      const recId = input.mapa[norm(r.producto)] ?? null;
      if (!recId || !valid.has(recId)) { sinAsignar++; continue; }
      if (!(r.unidades > 0) && !(r.importe && r.importe > 0)) continue;
      const rec = valid.get(recId)!;
      const uds = r.unidades > 0 ? r.unidades : r.importe && rec.pvp ? Math.round((r.importe / rec.pvp) * 100) / 100 : 0;
      const importe = r.importe != null ? r.importe : (rec.pvp ?? 0) * uds;
      if (!costeCache.has(recId)) costeCache.set(recId, recetaCost(recId, cc).perUnit);
      const cu = costeCache.get(recId)!;
      await c.query(`insert into ventas_lineas (tenant_id, local_id, import_id, fecha, nombre, receta_id, unidades, importe, neto, coste_unit, coste_total)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [ctx.tenantId, ctx.local.id, imp!.id, r.fecha && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r.fecha : hasta, r.producto.slice(0, 120), recId, uds, importe, neto(importe, ctx.local.iva_venta), cu, cu * uds]);
      unidadesPorReceta.set(recId, (unidadesPorReceta.get(recId) ?? 0) + uds);
      filas++; total += importe;
    }
    for (const [k, v] of Object.entries(input.mapa)) {
      if (v && valid.has(v)) await c.query(`insert into ventas_alias (tenant_id, local_id, nombre_norm, receta_id) values ($1,$2,$3,$4)
        on conflict (local_id, nombre_norm) do update set receta_id = excluded.receta_id`, [ctx.tenantId, ctx.local.id, k.slice(0, 120), v]);
    }
    await c.query("update ventas_importes set filas = $2, total = $3 where id = $1", [imp!.id, filas, Math.round(total * 100) / 100]);
    let articulos = 0;
    if (input.descontarStock) {
      const consumo = new Map<string, number>();
      for (const [recId, uds] of unidadesPorReceta) for (const [aid, q] of explode(recId, cc)) consumo.set(aid, (consumo.get(aid) ?? 0) + q * uds);
      const tracked = new Set((await all<{ id: string }>(c, "select id from articulos where local_id = $1 and track_stock", [ctx.local.id])).map((a) => a.id));
      for (const [aid, q] of consumo) {
        if (!tracked.has(aid) || q <= 0) continue;
        await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, ref_tipo, ref_id, fecha, nota, created_by) values ($1,$2,$3,'venta',$4,'ventas',$5,$6,'Ventas importadas',$7)",
          [ctx.tenantId, ctx.local.id, aid, -Math.round(q * 1000) / 1000, imp!.id, new Date(hasta + "T20:00:00Z"), ctx.userId]);
        await rebuildArticulo(c, aid);
        articulos++;
      }
    }
    if (input.actualizarUds) {
      const dias = Math.max(1, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 864e5) + 1);
      for (const [recId, uds] of unidadesPorReceta) await c.query("update recetas set ventas_mes = $2 where id = $1", [recId, Math.round((uds * 30) / dias)]);
    }
    await audit(c, ctx.tenantId, ctx.userId, "importar", "ventas", imp!.id, { filas, total, sinAsignar });
    return { id: imp!.id, filas, total, sinAsignar, recetas: unidadesPorReceta.size, articulos, desde, hasta };
  });
}

export async function borrarImportacion(ctx: AppCtx, id: string) {
  await withTenant(ctx.tenantId, async (c: Db) => {
    const imp = await one(c, "select 1 from ventas_importes where id = $1 and local_id = $2", [id, ctx.local.id]);
    if (!imp) throw new UserError("Importación no encontrada.");
    const arts = (await all<{ articulo_id: string }>(c, "select distinct articulo_id from stock_movimientos where ref_id = $1", [id])).map((r) => r.articulo_id);
    await c.query("delete from stock_movimientos where ref_id = $1", [id]);
    await c.query("delete from ventas_importes where id = $1", [id]);
    for (const a of arts) await rebuildArticulo(c, a);
    await audit(c, ctx.tenantId, ctx.userId, "borrar", "ventas", id, {});
  });
}
