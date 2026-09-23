import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { LineChart } from "@/components/charts";
import { all, isUuid, one, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { getCatalog } from "@/server/queries/catalog";
import { toArtCost, type ArtRow } from "@/server/domain/costs";
import { consumoAnual } from "@/server/domain/consumo";
import { dishStats } from "@/server/domain/carta";
import { costeBase, costeNeto } from "@/lib/costing";
import { resumenCarta } from "@/lib/menu";
import { eur, fecha, fechaNum, pct, qty } from "@/lib/format";
import { toBase } from "@/lib/units";
import { ArtForm, ArchivarArticulo } from "./form";
import { ProvCompare } from "./compare";

export const metadata = { title: "Artículo" };

export default async function Articulo({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApp();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { cats } = await getCatalog();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const a = await one<ArtRow & { created_at: Date }>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock,
      stock_min, consumo_semanal, track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key, created_at
      from articulos where id = $1 and local_id = $2 and not archived`, [id, ctx.local.id]);
    if (!a) return null;
    const compras = await all<{ doc: string; fecha: string; proveedor: string | null; cantidad: number; unidad_compra: string; precio: number; coste_unit: number }>(c, `
      select d.id as doc, d.fecha, p.name as proveedor, cl.cantidad, cl.unidad_compra, cl.precio, cl.coste_unit from compra_lineas cl join documentos d on d.id = cl.documento_id
      left join proveedores p on p.id = d.proveedor_id where cl.articulo_id = $1 and d.status = 'guardado' order by d.fecha desc, d.saved_at desc limit 24`, [id]);
    const provs = await all<{ proveedor_id: string; name: string; precio_unit: number | null; precio: number | null; unidad_compra: string; factor: number; fecha: string | null; origen: string; nota: string; entrega: string }>(c, `
      select ap.proveedor_id, p.name, ap.precio_unit, ap.precio, ap.unidad_compra, ap.factor, ap.fecha, ap.origen, ap.nota, p.entrega
      from articulo_proveedor ap join proveedores p on p.id = ap.proveedor_id where ap.articulo_id = $1 order by ap.precio_unit nulls last`, [id]);
    const allProvs = await all<{ id: string; name: string }>(c, "select id, name from proveedores where local_id = $1 and not archived order by name", [ctx.local.id]);
    const usos = await all<{ id: string; name: string; tipo: string; cantidad: number; unidad: "g" | "kg" | "ml" | "L" | "ud"; raciones: number; rinde: number }>(c, `
      select r.id, r.name, r.tipo, l.cantidad, l.unidad, r.raciones, r.rinde from receta_lineas l join recetas r on r.id = l.receta_id
      where l.articulo_id = $1 and not r.archived order by r.name`, [id]);
    const consumo = (await consumoAnual(c, ctx.local.id)).get(id) ?? null;
    // Food cost de la carta con cada precio alternativo (para "Cambiar a este")
    const base = await dishStats(c, ctx.local);
    const fcNow = resumenCarta(base.stats.filter((s) => s.en_carta)).fc;
    const alt: Record<string, number | null> = {};
    for (const p of provs) if (p.precio_unit != null) {
      const s = await dishStats(c, ctx.local, new Map([[id, p.precio_unit]]));
      alt[p.proveedor_id] = resumenCarta(s.stats.filter((x) => x.en_carta)).fc;
    }
    return { a, compras, provs, allProvs, usos, consumo, fcNow, alt };
  });
  if (!data) notFound();
  const { a } = data;
  const ac = toArtCost(a);
  const precio = costeBase(ac);
  const neto = costeNeto(ac);
  const fuente = a.precio_manual != null && precio === a.precio_manual ? "Precio puesto a mano" : a.pmp != null ? "Precio medio ponderado de tus compras" : a.last_price != null ? "Última compra" : "Sin precio todavía";
  const serie = [...data.compras].reverse().slice(-12);
  const catName = cats.find((c) => c.id === a.category_id)?.name ?? "";
  const canEdit = hasPerm(ctx, "compras");
  const actual = a.proveedor_pref_id ?? a.last_proveedor_id;

  return (
    <Screen title={a.name} sub={`${catName} · se mide en ${a.unit}`} back="/articulos">
      <div className="art-grid">
        <div className="stack">
          <div className="art-kpis">
            <div className="stat"><span className="stat-k">Precio</span><span className="stat-v">{precio != null ? eur(precio) : "—"}</span><span className="stat-s">por {a.unit} · sin IVA</span></div>
            <div className="stat"><span className="stat-k">Neto</span><span className="stat-v">{neto != null ? eur(neto) : "—"}</span><span className="stat-s">{a.rend < 100 ? `con ${qty(a.rend)} % aprovechable` : "sin merma"}</span></div>
            <div className="stat"><span className="stat-k">Stock</span><span className="stat-v">{qty(a.stock, 2)}</span><span className="stat-s">{a.unit}{a.stock_min != null ? ` · mín. ${qty(a.stock_min)}` : ""}</span></div>
          </div>
          <p className="hint">{fuente}{a.precio_manual != null && precio === a.precio_manual ? ". Manda hasta que llegue un albarán más reciente." : "."}</p>
          <section className="card" aria-labelledby="h-hist">
            <div className="card-h"><h2 className="h3" id="h-hist">Historial de precio</h2><span className="muted small">€/{a.unit} por compra</span></div>
            {serie.length ? <LineChart values={serie.map((s) => s.coste_unit)} labels={serie.map((s) => fecha(s.fecha, { day: "numeric", month: "short" }))} unit="€" fmt={(n) => `${eur(n)}/${a.unit}`} h={200} />
              : <p className="muted small">Aún no hay compras de este artículo.</p>}
          </section>
          <ProvCompare articuloId={a.id} unit={a.unit} actual={actual} canEdit={hasPerm(ctx, "proveedores:editar")}
            provs={data.provs.map((p) => ({ id: p.proveedor_id, name: p.name, precio: p.precio_unit, fecha: p.fecha, origen: p.origen as "albaran" | "cotizacion", nota: p.nota, entrega: p.entrega, unidad: p.unidad_compra, factor: p.factor }))}
            allProvs={data.allProvs} consumo={data.consumo} fcNow={data.fcNow} fcAlt={data.alt} precioActual={precio} />
          <section className="card" aria-labelledby="h-compras">
            <div className="card-h"><h2 className="h3" id="h-compras">Compras</h2><span className="tag">{data.compras.length}</span></div>
            {data.compras.length ? <div className="list">{data.compras.slice(0, 10).map((cp, i) => (
              <Link key={i} className="li" href={`/compras/${cp.doc}`}>
                <span className="li-main"><b>{cp.proveedor ?? "Sin proveedor"}</b><small>{fechaNum(cp.fecha)} · {qty(cp.cantidad)} {cp.unidad_compra} a {eur(cp.precio)}</small></span>
                <span className="li-end"><b>{eur(cp.coste_unit)}/{a.unit}</b></span>
              </Link>))}</div> : <p className="muted small">Cuando guardes un albarán con este artículo, aparecerá aquí.</p>}
          </section>
        </div>
        <div className="stack">
          <ArtForm canEdit={canEdit} cats={cats.map((c) => ({ id: c.id, name: c.name, iva: c.iva }))} a={{
            id: a.id, name: a.name, categoryId: a.category_id, unit: a.unit, rend: a.rend, iva: a.iva, precioManual: a.precio_manual,
            stockMin: a.stock_min, consumo: a.consumo_semanal, trackStock: a.track_stock, aliases: a.aliases,
          }} unitLocked={data.compras.length > 0 || data.usos.length > 0} />
          <section className="card" aria-labelledby="h-usos">
            <div className="card-h"><h2 className="h3" id="h-usos">Dónde se usa</h2><span className="tag">{data.usos.length}</span></div>
            {data.usos.length ? <div className="list">{data.usos.map((u, i) => {
              const perUnit = toBase(u.cantidad, u.unidad) / (u.tipo === "elaboracion" ? u.rinde : u.raciones);
              return (
                <Link key={u.id + i} className="li" href={`/escandallos/${u.id}`}>
                  <span className="li-ic"><Icon name={u.tipo === "elaboracion" ? "layers" : "book"} /></span>
                  <span className="li-main"><b>{u.name}</b><small>{qty(u.cantidad)} {u.unidad}{u.tipo === "elaboracion" ? ` para ${qty(u.rinde)} de rinde` : u.raciones > 1 ? ` para ${qty(u.raciones)} raciones` : " por ración"}</small></span>
                  <span className="li-end"><b>{neto != null ? eur(neto * perUnit) : "—"}</b><small>{u.tipo === "elaboracion" ? "por unidad de rinde" : "por ración"}</small></span>
                </Link>);
            })}</div> : <p className="muted small">Todavía no está en ningún escandallo.</p>}
          </section>
          {data.consumo ? <p className="hint">Consumo estimado: {qty(data.consumo.anual, 1)} {a.unit} al año ({data.consumo.fuente === "recetas" ? "según tus recetas y ventas" : data.consumo.fuente === "declarado" ? "según el consumo semanal que indicaste" : "según tus compras de los últimos 3 meses"}).</p> : null}
          {data.fcNow != null ? <p className="hint">Food cost actual de la carta: {pct(data.fcNow)}.</p> : null}
          {canEdit ? <ArchivarArticulo id={a.id} /> : null}
        </div>
      </div>
    </Screen>
  );
}
