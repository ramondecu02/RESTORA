// Vista de grupo: los locales del negocio, uno junto a otro, con las mismas cifras (un mes natural frente al anterior)
// y los artículos que se compran en varios locales con el precio de cada uno. Solo lectura: no cambia nada de ningún local.
import { all, withTenant } from "../db";
import { navBadges } from "./badges";
import type { AppCtx } from "../ctx";

export type FilaGrupo = {
  id: string; name: string; actual: boolean;
  neto: number; coste: number; uds: number; netoAnt: number; costeAnt: number;
  compras: number; comprasAnt: number;
  /** Lo que pide atención en ese local (los mismos contadores del menú). */
  fuera: number; avisos: number; revisar: number; bajo: number;
};
export type PrecioGrupo = { name: string; unit: string; precios: { localId: string; local: string; precio: number }[]; dif: number };

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const mesActual = () => new Date().toISOString().slice(0, 7);

/** Los meses con ventas o compras (hasta seis, del más reciente al más antiguo) y el que se enseña: el pedido o, si no, el último con ventas. */
export async function mesesDelGrupo(ctx: AppCtx, pedido?: string) {
  const r = await withTenant(ctx.tenantId, (c) => all<{ mes: string; ventas: boolean }>(c, `
    select to_char(date_trunc('month', fecha), 'YYYY-MM') as mes, bool_or(v) as ventas from (
      select fecha, true as v from ventas_lineas union all select fecha, false from documentos where status = 'guardado' and fecha is not null
    ) x group by 1 order by 1 desc limit 6`));
  const meses = r.map((x) => x.mes);
  const elegido = pedido && MES.test(pedido) ? pedido : (r.find((x) => x.ventas) ?? r[0])?.mes ?? mesActual();
  return { meses: meses.includes(elegido) ? meses : [elegido, ...meses].sort().reverse().slice(0, 7), elegido };
}

export async function grupoData(ctx: AppCtx, mes: string, conVentas: boolean) {
  const base = await withTenant(ctx.tenantId, async (c) => {
    const d = `${mes}-01`;
    // «Este mes» es el natural elegido; «el anterior», el mes de antes
    const v = !conVentas ? [] : await all<{ local_id: string; neto: number; coste: number; uds: number; neto_ant: number; coste_ant: number }>(c, `
      select local_id,
        coalesce(sum(neto) filter (where fecha >= $1::date), 0)::float as neto,
        coalesce(sum(coste_total) filter (where fecha >= $1::date), 0)::float as coste,
        coalesce(sum(unidades) filter (where fecha >= $1::date), 0)::float as uds,
        coalesce(sum(neto) filter (where fecha < $1::date), 0)::float as neto_ant,
        coalesce(sum(coste_total) filter (where fecha < $1::date), 0)::float as coste_ant
      from ventas_lineas where fecha >= ($1::date - interval '1 month') and fecha < ($1::date + interval '1 month') group by local_id`, [d]);
    const k = await all<{ local_id: string; compras: number; compras_ant: number }>(c, `
      select local_id,
        coalesce(sum(base) filter (where fecha >= $1::date), 0)::float as compras,
        coalesce(sum(base) filter (where fecha < $1::date), 0)::float as compras_ant
      from documentos where status = 'guardado' and fecha >= ($1::date - interval '1 month') and fecha < ($1::date + interval '1 month') group by local_id`, [d]);
    // Un artículo cuenta como «el mismo» si se llama igual y se mide en la misma unidad; solo salen los que están en más de un local
    const p = await all<{ k: string; name: string; unit: string; precios: { localId: string; local: string; precio: number }[]; dif: number }>(c, `
      with pr as (
        select a.local_id, l.name as local, a.name, lower(a.name) as k, a.unit, coalesce(a.pmp, a.last_price, a.precio_manual)::float as precio
        from articulos a join locales l on l.id = a.local_id
        where not a.archived and coalesce(a.pmp, a.last_price, a.precio_manual) > 0
      )
      select k, min(name) as name, unit,
        json_agg(json_build_object('localId', local_id, 'local', local, 'precio', precio) order by precio) as precios,
        ((max(precio) - min(precio)) / min(precio) * 100)::float as dif
      from pr group by k, unit having count(distinct local_id) > 1
      order by dif desc, k limit 15`);
    return { v, k, p };
  });
  const filas: FilaGrupo[] = await Promise.all(ctx.locales.map(async (l) => {
    // Los contadores de cada local: el mismo cálculo que el menú, con ese local en lugar del elegido
    const b = await navBadges({ ...ctx, local: l });
    const v = base.v.find((x) => x.local_id === l.id), k = base.k.find((x) => x.local_id === l.id);
    return {
      id: l.id, name: l.name, actual: l.id === ctx.local.id,
      neto: v?.neto ?? 0, coste: v?.coste ?? 0, uds: v?.uds ?? 0, netoAnt: v?.neto_ant ?? 0, costeAnt: v?.coste_ant ?? 0,
      compras: k?.compras ?? 0, comprasAnt: k?.compras_ant ?? 0, fuera: b.fuera, avisos: b.avisos, revisar: b.revisar, bajo: b.bajo,
    };
  }));
  const precios: PrecioGrupo[] = base.p.map((x) => ({ name: x.name, unit: x.unit, precios: x.precios, dif: x.dif }));
  return { filas, precios };
}
