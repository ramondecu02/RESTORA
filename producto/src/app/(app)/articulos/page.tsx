import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { ComprasNav } from "@/components/subnav";
import { all, withTenant } from "@/server/db";
import { hasPerm, requireApp } from "@/server/ctx";
import { getCatalog } from "@/server/queries/catalog";
import { costeBase, costeNeto } from "@/lib/costing";
import { toArtCost, type ArtRow } from "@/server/domain/costs";
import { eur, fecha, pct, plural } from "@/lib/format";
import type { LineUnit } from "@/lib/units";
import { esReventa } from "@/lib/venta-articulo";
import { ListaArticulos, type ArtFila } from "./lista";

export const metadata = { title: "Artículos" };

export default async function Articulos({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; orden?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const { cats } = await getCatalog();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const arts = await all<ArtRow & { proveedor: string | null; variacion: number | null; ev_fecha: string | null; gasto: number | null; v_pvp: number | null; v_cant: number | null; v_unidad: LineUnit | null; v_rac: number | null }>(c, `
      select a.id, a.name, a.unit, a.rend, a.pmp, a.last_price, a.last_purchase_at, a.precio_manual, a.precio_manual_at, a.category_id, a.iva, a.stock, a.stock_min,
        a.consumo_semanal, a.track_stock, a.last_proveedor_id, a.proveedor_pref_id, a.catalog_item_id, a.aliases, a.demo, a.foto_key,
        p.name as proveedor, pe.variacion, pe.fecha as ev_fecha, g.gasto, v.v_pvp, v.v_cant, v.v_unidad, v.v_rac
      from articulos a
      left join proveedores p on p.id = coalesce(a.proveedor_pref_id, a.last_proveedor_id)
      left join lateral (select variacion, fecha from precio_eventos where articulo_id = a.id order by fecha desc, created_at desc limit 1) pe on true
      left join lateral (select sum(cl.importe)::float as gasto from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.articulo_id = a.id and d.fecha >= current_date - 90) g on true
      left join lateral (select r.pvp::float as v_pvp, l.cantidad::float as v_cant, l.unidad as v_unidad, r.raciones::float as v_rac from recetas r join receta_lineas l on l.receta_id = r.id
        where l.articulo_id = a.id and r.local_id = a.local_id and r.reventa and r.tipo = 'plato' and not r.archived
          and (select count(*) from receta_lineas x where x.receta_id = r.id) = 1 order by r.updated_at desc limit 1) v on true
      where a.local_id = $1 and not a.archived order by a.name`, [ctx.local.id]);
    const recientes = await all<{ id: string; name: string; variacion: number; fecha: string; unit: string; precio_nuevo: number }>(c, `
      select a.id, a.name, pe.variacion, pe.fecha, a.unit, pe.precio_nuevo from precio_eventos pe join articulos a on a.id = pe.articulo_id
      where a.local_id = $1 and pe.fecha >= current_date - 30 order by abs(pe.variacion) desc limit 6`, [ctx.local.id]);
    return { arts, recientes };
  });
  const catInfo = new Map(cats.map((c) => [c.id, c]));
  const price = (a: ArtRow) => costeBase(toArtCost(a));
  const sinPrecio = data.arts.filter((a) => price(a) == null);
  const filas: ArtFila[] = data.arts.map((a) => {
    const p = price(a), cat = catInfo.get(a.category_id);
    const src = a.precio_manual != null && p === a.precio_manual ? "manual" : a.pmp != null ? "precio medio" : a.last_price != null ? "última compra" : null;
    return {
      id: a.id, name: a.name, cat: a.category_id, catName: cat?.name ?? "Otros", catOrden: cat?.orden ?? 99, kind: cat?.kind ?? "otros", prov: a.proveedor, unit: a.unit,
      stock: a.track_stock ? a.stock : null, precio: p, src, variacion: a.variacion, gasto: a.gasto ?? 0, reventa: esReventa(a.category_id), costeNeto: costeNeto(toArtCost(a)),
      venta: a.v_cant != null && a.v_unidad ? { pvp: a.v_pvp, cantidad: a.v_cant, unidad: a.v_unidad, raciones: a.v_rac ?? 1 } : null,
    };
  });

  return (
    <Screen title="Artículos" sub={`${plural(data.arts.length, "artículo", "artículos")} con su precio de compra`} fab
      actions={<Link className="btn btn-2 btn-sm only-wide" href="/articulos/nuevo"><Icon name="plus" size={18} /> Nuevo artículo</Link>}>
      <ComprasNav cur="articulos" />
      <div className="list-grid">
        <ListaArticulos filas={filas} iva={ctx.local.iva_venta} fcObjetivo={ctx.local.fc_objetivo} canPrecios={hasPerm(ctx, "carta:precios") && hasPerm(ctx, "escandallos")}
          inicial={{ q: (sp.q ?? "").slice(0, 60), cat: sp.cat ?? "", orden: sp.orden ?? "" }} />
        <div className="stack">
          <section className="card">
            <div className="card-h"><h2 className="h3">Cambios de precio</h2><span className="muted small">Últimos 30 días</span></div>
            {data.recientes.length ? <div className="list">{data.recientes.map((r) => (
              <Link key={r.id + r.fecha} className="li" href={`/articulos/${r.id}`}>
                <span className={`li-ic ${r.variacion > 0 ? "bad" : "ok"}`}><Icon name={r.variacion > 0 ? "trendUp" : "trendDown"} /></span>
                <span className="li-main"><b>{r.name}</b><small>{fecha(r.fecha)} · ahora {eur(r.precio_nuevo)}/{r.unit}</small></span>
                <span className="li-end"><span className={`tag ${r.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{r.variacion > 0 ? "+" : "−"}{pct(Math.abs(r.variacion))}</span></span>
              </Link>))}</div> : <p className="muted small">Sin cambios de precio este mes.</p>}
          </section>
          {sinPrecio.length ? (
            <section className="card card-warn">
              <div className="card-h"><h2 className="h3">{plural(sinPrecio.length, "artículo sin precio", "artículos sin precio")}</h2></div>
              <p className="muted small">Sin precio no podemos calcular el coste de los platos que los usan. Súbelos con un albarán o pon un precio a mano.</p>
              <div className="list">{sinPrecio.slice(0, 6).map((a) => <Link key={a.id} className="li" href={`/articulos/${a.id}`}><span className="li-main"><b>{a.name}</b><small>{catInfo.get(a.category_id)?.name}</small></span><Icon name="chevR" size={18} /></Link>)}</div>
            </section>
          ) : null}
          <Link className="btn btn-2 only-narrow" href="/articulos/nuevo"><Icon name="plus" size={18} /> Nuevo artículo</Link>
        </div>
      </div>
    </Screen>
  );
}
