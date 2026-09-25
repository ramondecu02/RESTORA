import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { ComprasNav } from "@/components/subnav";
import { all, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { consumoAnual } from "@/server/domain/consumo";
import { eur, eur0, plural, qty } from "@/lib/format";
import { ProvFormButton } from "./form";

export const metadata = { title: "Proveedores" };

type Row = { id: string; name: string; empresa: string; tipo: string; responsable: string; phone: string; email: string; entrega: string; notas: string; productos: number; gasto: number; subidas: number; docs: number };

export default async function Proveedores() {
  const ctx = await requireApp();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const provs = await all<Row>(c, `select p.id, p.name, p.empresa, p.tipo, p.responsable, p.phone, p.email, p.entrega, p.notas,
      (select count(*)::int from articulos a where coalesce(a.proveedor_pref_id, a.last_proveedor_id) = p.id and not a.archived) as productos,
      (select coalesce(sum(base), 0)::float from documentos d where d.proveedor_id = p.id and d.status = 'guardado' and d.fecha >= date_trunc('month', current_date)) as gasto,
      (select count(distinct articulo_id)::int from precio_eventos pe where pe.proveedor_id = p.id and pe.variacion > 0 and pe.fecha >= current_date - 90) as subidas,
      (select count(*)::int from documentos d where d.proveedor_id = p.id and d.status = 'guardado') as docs
      from proveedores p where p.local_id = $1 and not p.archived order by gasto desc, p.name`, [ctx.local.id]);
    const cmp = await all<{ articulo_id: string; articulo: string; unit: string; actual: string | null; proveedor_id: string; proveedor: string; precio_unit: number; origen: string; nota: string; entrega: string }>(c, `
      select a.id as articulo_id, a.name as articulo, a.unit, coalesce(a.proveedor_pref_id, a.last_proveedor_id) as actual, ap.proveedor_id, p.name as proveedor, ap.precio_unit, ap.origen, ap.nota, p.entrega
      from articulo_proveedor ap join articulos a on a.id = ap.articulo_id join proveedores p on p.id = ap.proveedor_id
      where a.local_id = $1 and not a.archived and ap.precio_unit is not null
        and a.id in (select articulo_id from articulo_proveedor where precio_unit is not null group by articulo_id having count(*) > 1)
      order by a.name, ap.precio_unit`, [ctx.local.id]);
    const consumo = cmp.length ? await consumoAnual(c, ctx.local.id) : new Map();
    return { provs, cmp, consumo };
  });
  const groups = new Map<string, typeof data.cmp>();
  for (const r of data.cmp) groups.set(r.articulo_id, [...(groups.get(r.articulo_id) ?? []), r]);
  const canEdit = hasPerm(ctx, "proveedores:editar");
  let ahorroTotal = 0;
  const comps = [...groups.values()].map((rows) => {
    // Sin proveedor actual con precio (sin compras ni cambio elegido) no hay ahorro que calcular
    const cur = rows.find((r) => r.proveedor_id === rows[0].actual) ?? null;
    const best = rows[0];
    const ud = cur ? cur.precio_unit - best.precio_unit : 0;
    const cons = data.consumo.get(rows[0].articulo_id)?.anual ?? null;
    const anual = ud > 0 && cons ? ud * cons : null;
    if (anual) ahorroTotal += anual;
    return { rows, cur, best, ud, cons, anual };
  }).sort((a, b) => (b.anual ?? 0) - (a.anual ?? 0));

  return (
    <Screen title="Proveedores" sub="El mismo producto, comparado entre quienes te lo sirven" fab
      actions={canEdit ? <span className="only-wide"><ProvFormButton label="Proveedor" goTo /></span> : undefined}>
      <ComprasNav cur="proveedores" />
      <div className="list-grid">
        <div className="stack">
          <section className="card" aria-labelledby="h-cmp">
            <div className="card-h"><h2 className="h3" id="h-cmp">Comparar proveedores</h2>{ahorroTotal > 0 ? <span className="tag tag-ok">Ahorro posible: {eur0(ahorroTotal)}/año</span> : null}</div>
            {comps.length ? comps.slice(0, 12).map(({ rows, cur, best, ud, cons, anual }) => (
              <div key={rows[0].articulo_id} className="stack-sm">
                <div className="row-sb"><Link className="link" href={`/articulos/${rows[0].articulo_id}`}>{rows[0].articulo}</Link><span className="muted xs">{plural(rows.length, "proveedor", "proveedores")}</span></div>
                <div className="versus">
                  {rows.map((r) => (
                    <div key={r.proveedor_id} className={`vs ${r.proveedor_id === best.proveedor_id ? "best" : ""}`}>
                      <div className="vs-sup"><span>{r.proveedor}</span>{r.proveedor_id === best.proveedor_id ? <span className="tag tag-ok">Mejor</span> : null}</div>
                      <span className="vs-price">{eur(r.precio_unit)}<small className="muted" style={{ fontSize: 13 }}>/{r.unit}</small></span>
                      <span className="vs-meta">{r.proveedor_id === cur?.proveedor_id ? "Proveedor actual" : r.origen === "cotizacion" ? (r.nota || "Cotización") : "Por albarán"}{r.entrega ? ` · ${r.entrega}` : ""}</span>
                      {cur && r.proveedor_id !== cur.proveedor_id ? (r.precio_unit < cur.precio_unit
                        ? <Link className="linkbtn" style={{ minHeight: 32 }} href={`/articulos/${r.articulo_id}`}>Cambiar a este <Icon name="arrowR" size={16} /></Link>
                        : <span className="vs-meta">+{eur(r.precio_unit - cur.precio_unit)} más caro</span>) : null}
                    </div>
                  ))}
                </div>
                {ud > 0 ? <p className="hint">Mejor alternativa −{eur(ud)}/{rows[0].unit}{cons ? ` · consumo estimado ${qty(cons, 0)} ${rows[0].unit}/año` : ""}{anual ? ` · ahorro si cambias ${eur0(anual)}/año` : ""}</p>
                  : <p className="hint">{cur ? "Tu proveedor actual es el más barato de los comparados." : `Sin proveedor actual con precio: el más barato de los comparados es ${best.proveedor}.`}</p>}
              </div>
            )) : <div className="empty"><span className="li-ic"><Icon name="swap" /></span><b>Aún no tienes comparativas</b><p>Aparecen solas cuando compras lo mismo a dos proveedores. También puedes añadir el precio que te ofrece otro desde la ficha del artículo.</p></div>}
          </section>
        </div>
        <div className="stack">
          <div className="row-sb"><h2 className="h3">Tus proveedores</h2>{canEdit ? <span className="only-narrow"><ProvFormButton label="Proveedor" goTo className="btn btn-2 btn-xs" /></span> : null}</div>
          {data.provs.length ? data.provs.map((p) => (
            <section key={p.id} className="card">
              <div className="card-h"><Link className="h3 link" href={`/proveedores/${p.id}`}>{p.name}</Link>{p.subidas ? <span className="tag tag-warn">{plural(p.subidas, "producto con subida", "productos con subida")}</span> : p.docs ? <span className="tag tag-ok">Precios estables</span> : null}</div>
              {p.empresa || p.entrega ? <p className="muted small">{[p.empresa, p.entrega ? `Entrega ${p.entrega}` : "", p.tipo].filter(Boolean).join(" · ")}</p> : null}
              <div className="contact">
                {p.responsable ? <span><Icon name="user" /> {p.responsable}</span> : null}
                {p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`}><Icon name="phone" /> {p.phone}</a> : null}
                {p.email ? <a href={`mailto:${p.email}`}><Icon name="mail" /> {p.email}</a> : null}
              </div>
              <div className="stats stats-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <div className="stat"><span className="stat-k">Productos</span><span className="stat-v">{p.productos}</span></div>
                <div className="stat"><span className="stat-k">Gasto mes</span><span className="stat-v">{eur0(p.gasto)}</span></div>
              </div>
              <Link className="linkbtn" href={`/proveedores/${p.id}`}>Ver productos y albaranes <Icon name="arrowR" size={18} /></Link>
            </section>
          )) : <div className="card"><div className="empty"><span className="li-ic"><Icon name="truck" /></span><b>Sin proveedores todavía</b><p>Se añaden solos con cada albarán nuevo.</p></div></div>}
        </div>
      </div>
    </Screen>
  );
}
