// Datos del panel Hoy: etapa del usuario, situación de la carta, histórico mensual, stock y avisos.
import { all, one, withTenant } from "../db";
import { hasPerm, type AppCtx } from "../ctx";
import { priceAlerts } from "../domain/avisos";
import { plantillasConCoste } from "./plantillas";
import { toArtCost, type ArtRow } from "../domain/costs";
import { costeBase, estadoFC, foodCost } from "@/lib/costing";
import { coberturaDias } from "@/lib/inventory";
import { margenPorFamilia, resumenCarta, salud, aporta, valorable } from "@/lib/menu";

export async function hoyData(ctx: AppCtx) {
  return withTenant(ctx.tenantId, async (c) => {
    const n = (await one<{ albs: number; provs: number; recs: number; pvps: number; imps: number; arts: number; artsprecio: number }>(c, `select
      (select count(*)::int from documentos where local_id = $1 and status = 'guardado' and kind in ('albaran','factura')) as albs,
      (select count(distinct proveedor_id)::int from documentos where local_id = $1 and status = 'guardado' and proveedor_id is not null) as provs,
      (select count(distinct receta_id)::int from receta_lineas rl join recetas r on r.id = rl.receta_id where r.local_id = $1 and not r.archived and r.tipo <> 'elaboracion') as recs,
      (select count(*)::int from recetas where local_id = $1 and not archived and tipo <> 'elaboracion' and pvp > 0) as pvps,
      (select count(*)::int from ventas_importes where local_id = $1) as imps,
      (select count(*)::int from articulos where local_id = $1 and not archived) as arts,
      (select count(*)::int from articulos where local_id = $1 and not archived and (pmp is not null or last_price is not null or precio_manual is not null)) as artsprecio`, [ctx.local.id]))!;
    const docs = await all<{ id: string; status: string; proveedor: string | null; lineas: number; created_at: Date }>(c, `
      select d.id, d.status, p.name as proveedor, coalesce(jsonb_array_length(d.draft->'lineas'), 0) as lineas, d.created_at
      from documentos d left join proveedores p on p.id = d.proveedor_id where d.local_id = $1 and d.kind in ('albaran','factura') and d.status in ('leyendo','subido','revisar','error')
      order by d.created_at desc limit 3`, [ctx.local.id]);
    const { alerts, stats } = await priceAlerts(c, ctx.local);
    const carta = stats.filter((s) => s.en_carta);
    const res = resumenCarta(carta);
    const iva = ctx.local.iva_venta;
    const fuera = carta.filter((s) => { const e = estadoFC(s.sinCoste ? null : foodCost(s.coste, s.pvp, iva), s.fcObjetivo).estado; return e === "warn" || e === "crit"; });
    const arts = await all<ArtRow>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock, stock_min, consumo_semanal,
      track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key from articulos where local_id = $1 and not archived and track_stock`, [ctx.local.id]);
    const bajos = arts.filter((a) => a.stock_min != null && a.stock < a.stock_min).map((a) => ({ id: a.id, name: a.name, unit: a.unit, stock: a.stock, min: a.stock_min!, dias: coberturaDias(a.stock, a.consumo_semanal) }))
      .sort((a, b) => a.dias - b.dias);
    const valorAlmacen = arts.reduce((s, a) => s + Math.max(0, a.stock) * (costeBase(toArtCost(a)) ?? 0), 0);
    const comprasMes = (await one<{ t: number }>(c, "select coalesce(sum(base),0)::float as t from documentos where local_id = $1 and status = 'guardado' and fecha >= date_trunc('month', current_date)", [ctx.local.id]))!.t;
    // Ventas y rentabilidad solo para los roles que ven Ventas (cocina no)
    const ventas = hasPerm(ctx, "ventas");
    const hist = !ventas ? [] : await all<{ mes: string; neto: number; coste: number; uds: number }>(c, `select to_char(date_trunc('month', fecha), 'YYYY-MM') as mes, sum(neto)::float as neto, sum(coste_total)::float as coste, sum(unidades)::float as uds
      from ventas_lineas where local_id = $1 and fecha >= date_trunc('month', current_date) - interval '5 months' and fecha < date_trunc('month', current_date) group by 1 order by 1`, [ctx.local.id]);
    const com = !ventas ? [] : await all<{ mes: string; comensales: number; dias: number }>(c, `select to_char(date_trunc('month', desde), 'YYYY-MM') as mes, sum(comensales)::float as comensales,
      sum(greatest(1, hasta - desde + 1))::float as dias from ventas_importes where local_id = $1 and comensales is not null and desde >= date_trunc('month', current_date) - interval '5 months' group by 1`, [ctx.local.id]);
    const tpl = n.albs > 0 && n.recs === 0 ? (await plantillasConCoste(c, ctx.local.id)).filter((t) => t.coste != null) : [];
    return { n, docs, alerts, stats: carta, res, fuera, bajos, valorAlmacen, comprasMes, hist, com, tpl,
      salud: salud(res.fc, fuera.length, bajos.length, ctx.local.fc_objetivo), familias: ventas ? margenPorFamilia(carta) : [],
      aporta: !ventas ? [] : carta.filter(valorable).sort((a, b) => aporta(b) - aporta(a)).slice(0, 8).map((s) => ({ id: s.id, name: s.name, familia: s.familia, value: aporta(s) })) };
  });
}
