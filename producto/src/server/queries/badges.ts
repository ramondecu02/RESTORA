import { one, withTenant } from "../db";
import type { AppCtx } from "../ctx";
import type { Badges } from "@/components/shell/nav";
import { AVISO_DIAS, AVISO_MIN } from "../domain/avisos";

/** Objetivo de food cost efectivo: el del plato, o 100 − margen deseado en reventa, o el del local. */
export const FC_OBJ_SQL = "coalesce(r.fc_objetivo, case when r.reventa and r.margen_objetivo is not null then 100 - r.margen_objetivo end, $3)";

export async function navBadges(ctx: AppCtx): Promise<Badges> {
  // Avisos: mismo criterio que priceAlerts (último cambio de cada artículo, subida mínima y usado, también a través
  // de elaboraciones, por un plato de la carta)
  const r = await withTenant(ctx.tenantId, (c) => one<Badges>(c, `with recursive de_carta(id) as (
      select id from recetas where local_id = $1 and not archived and en_carta and tipo <> 'elaboracion'
      union
      select l.subreceta_id from receta_lineas l join de_carta e on e.id = l.receta_id join recetas s on s.id = l.subreceta_id where not s.archived
    )
    select
    (select count(*) from documentos where local_id = $1 and kind in ('albaran','factura') and status in ('subido','leyendo','revisar','error'))::int as revisar,
    (select count(*) from articulos where local_id = $1 and not archived and track_stock and stock_min is not null and stock < stock_min)::int as bajo,
    (select count(*) from recetas r where r.local_id = $1 and not r.archived and r.tipo <> 'elaboracion' and r.en_carta and r.pvp > 0 and r.coste_cache is not null
       and r.coste_cache / (r.pvp / (1 + $2 / 100.0)) > ${FC_OBJ_SQL} / 100.0)::int as fuera,
    (select count(*) from (select distinct on (pe.articulo_id) pe.articulo_id, pe.variacion from precio_eventos pe join articulos a on a.id = pe.articulo_id
       where a.local_id = $1 and not a.archived and pe.fecha >= current_date - $4::int order by pe.articulo_id, pe.fecha desc, pe.created_at desc) ev
       where ev.variacion > $5 and exists (select 1 from receta_lineas rl join de_carta e on e.id = rl.receta_id where rl.articulo_id = ev.articulo_id))::int as avisos`,
    [ctx.local.id, ctx.local.iva_venta, ctx.local.fc_objetivo, AVISO_DIAS, AVISO_MIN]));
  return r ?? { revisar: 0, bajo: 0, fuera: 0, avisos: 0 };
}
