import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { ComprasNav } from "@/components/subnav";
import { all, withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { getCatalog } from "@/server/queries/catalog";
import { costeBase } from "@/lib/costing";
import { toArtCost, type ArtRow } from "@/server/domain/costs";
import { eur, fecha, pct, plural, qty } from "@/lib/format";

export const metadata = { title: "Artículos" };

export default async function Articulos({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; orden?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60).toLowerCase();
  const { cats } = await getCatalog();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const arts = await all<ArtRow & { proveedor: string | null; variacion: number | null; ev_fecha: string | null; gasto: number | null }>(c, `
      select a.id, a.name, a.unit, a.rend, a.pmp, a.last_price, a.last_purchase_at, a.precio_manual, a.precio_manual_at, a.category_id, a.iva, a.stock, a.stock_min,
        a.consumo_semanal, a.track_stock, a.last_proveedor_id, a.proveedor_pref_id, a.catalog_item_id, a.aliases, a.demo, a.foto_key,
        p.name as proveedor, pe.variacion, pe.fecha as ev_fecha, g.gasto
      from articulos a
      left join proveedores p on p.id = coalesce(a.proveedor_pref_id, a.last_proveedor_id)
      left join lateral (select variacion, fecha from precio_eventos where articulo_id = a.id order by fecha desc, created_at desc limit 1) pe on true
      left join lateral (select sum(cl.importe)::float as gasto from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.articulo_id = a.id and d.fecha >= current_date - 90) g on true
      where a.local_id = $1 and not a.archived order by a.name`, [ctx.local.id]);
    const recientes = await all<{ id: string; name: string; variacion: number; fecha: string; unit: string; precio_nuevo: number }>(c, `
      select a.id, a.name, pe.variacion, pe.fecha, a.unit, pe.precio_nuevo from precio_eventos pe join articulos a on a.id = pe.articulo_id
      where a.local_id = $1 and pe.fecha >= current_date - 30 order by abs(pe.variacion) desc limit 6`, [ctx.local.id]);
    return { arts, recientes };
  });
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const counts = new Map<string, number>();
  for (const a of data.arts) counts.set(a.category_id, (counts.get(a.category_id) ?? 0) + 1);
  let list = data.arts.filter((a) => (!sp.cat || a.category_id === sp.cat) && (!q || a.name.toLowerCase().includes(q) || a.aliases.some((x) => x.includes(q))));
  const orden = sp.orden ?? "nombre";
  const price = (a: ArtRow) => costeBase(toArtCost(a));
  if (orden === "subida") list = [...list].sort((a, b) => (b.variacion ?? -9) - (a.variacion ?? -9));
  if (orden === "gasto") list = [...list].sort((a, b) => (b.gasto ?? 0) - (a.gasto ?? 0));
  if (orden === "precio") list = [...list].sort((a, b) => (price(b) ?? 0) - (price(a) ?? 0));
  const sinPrecio = data.arts.filter((a) => price(a) == null);
  const link = (o: Record<string, string | undefined>) => "/articulos?" + new URLSearchParams(Object.entries({ q: sp.q, cat: sp.cat, orden: sp.orden, ...o }).filter(([, v]) => v) as [string, string][]);

  return (
    <Screen title="Artículos" sub={`${plural(data.arts.length, "artículo", "artículos")} con su precio de compra`} fab
      actions={<Link className="btn btn-2 btn-sm only-wide" href="/articulos/nuevo"><Icon name="plus" size={18} /> Nuevo artículo</Link>}>
      <ComprasNav cur="articulos" />
      <div className="list-grid">
        <div className="stack">
          <form className="toolbar" action="/articulos">
            {sp.cat ? <input type="hidden" name="cat" value={sp.cat} /> : null}
            <div className="searchbox"><Icon name="search" size={18} /><input className="inp" type="search" name="q" defaultValue={sp.q} placeholder="Buscar artículo" aria-label="Buscar artículo" /></div>
            <select className="inp" name="orden" defaultValue={orden} aria-label="Ordenar" style={{ flex: "0 1 190px" }}>
              <option value="nombre">Por nombre</option><option value="gasto">Más compra</option><option value="subida">Subidas de precio</option><option value="precio">Más caros</option>
            </select>
            <button className="btn btn-2 btn-sm" type="submit">Aplicar</button>
          </form>
          <div className="chips" role="list">
            <Link role="listitem" className={`chip ${!sp.cat ? "is-on" : ""}`} href={link({ cat: undefined })}>Todos <span className="cnt">{data.arts.length}</span></Link>
            {cats.filter((c) => counts.get(c.id)).map((c) => (
              <Link role="listitem" key={c.id} className={`chip ${sp.cat === c.id ? "is-on" : ""}`} href={link({ cat: c.id })}>{c.name} <span className="cnt">{counts.get(c.id)}</span></Link>
            ))}
          </div>
          <section className="card">
            {list.length ? <div className="list">{list.map((a) => {
              const p = price(a);
              const src = a.precio_manual != null && p === a.precio_manual ? "manual" : a.pmp != null ? "precio medio" : a.last_price != null ? "última compra" : null;
              return (
                <Link key={a.id} className="li" href={`/articulos/${a.id}`}>
                  <span className="li-ic"><Icon name="box" /></span>
                  <span className="li-main"><b>{a.name}</b><small>{catName.get(a.category_id)}{a.proveedor ? ` · ${a.proveedor}` : ""}{a.track_stock ? ` · stock ${qty(a.stock)} ${a.unit}` : ""}</small></span>
                  <span className="li-end">
                    <b>{p != null ? `${eur(p)}/${a.unit}` : "Sin precio"}</b>
                    {a.variacion != null && Math.abs(a.variacion) >= 0.005 ? <span className={`tag ${a.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{a.variacion > 0 ? "+" : "−"}{pct(Math.abs(a.variacion))}</span> : src ? <small>{src}</small> : null}
                  </span>
                </Link>
              );
            })}</div> : (
              <div className="empty"><span className="li-ic"><Icon name="box" /></span><b>{data.arts.length ? "Nada con ese filtro" : "Aún no tienes artículos"}</b>
                <p>{data.arts.length ? "Prueba con otra búsqueda." : "Se crean solos al guardar tu primer albarán. También puedes añadirlos a mano."}</p>
                <div className="empty-actions"><Link className="btn" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link><Link className="btn btn-2" href="/articulos/nuevo">Nuevo artículo</Link></div></div>
            )}
          </section>
        </div>
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
              <div className="list">{sinPrecio.slice(0, 6).map((a) => <Link key={a.id} className="li" href={`/articulos/${a.id}`}><span className="li-main"><b>{a.name}</b><small>{catName.get(a.category_id)}</small></span><Icon name="chevR" size={18} /></Link>)}</div>
            </section>
          ) : null}
          <Link className="btn btn-2 only-narrow" href="/articulos/nuevo"><Icon name="plus" size={18} /> Nuevo artículo</Link>
        </div>
      </div>
    </Screen>
  );
}
