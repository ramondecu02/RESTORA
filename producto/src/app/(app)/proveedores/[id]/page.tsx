import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { BarsH } from "@/components/charts";
import { all, isUuid, one, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { eur, eur0, fecha, pct } from "@/lib/format";
import { BorrarProveedor, ProvFormButton } from "../form";

export const metadata = { title: "Proveedor" };

export default async function Proveedor({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApp();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const p = await one<{ id: string; name: string; empresa: string; tipo: string; cif: string; responsable: string; phone: string; email: string; direccion: string; entrega: string; notas: string; origen: string }>(c,
      "select id, name, empresa, tipo, cif, responsable, phone, email, direccion, entrega, notas, origen from proveedores where id = $1 and local_id = $2 and not archived", [id, ctx.local.id]);
    if (!p) return null;
    const productos = await all<{ id: string; name: string; unit: string; precio_unit: number | null; fecha: string | null; origen: string; variacion: number | null }>(c, `
      select a.id, a.name, a.unit, ap.precio_unit, ap.fecha, ap.origen,
        (select variacion from precio_eventos pe where pe.articulo_id = a.id and pe.proveedor_id = $1 order by fecha desc limit 1) as variacion
      from articulo_proveedor ap join articulos a on a.id = ap.articulo_id where ap.proveedor_id = $1 and not a.archived order by a.name`, [id]);
    const docs = await all<{ id: string; numero: string | null; fecha: string | null; total: number | null; kind: string }>(c,
      "select id, numero, fecha, total, kind from documentos where proveedor_id = $1 and status = 'guardado' order by fecha desc limit 12", [id]);
    const meses = await all<{ mes: string; total: number }>(c, `select to_char(date_trunc('month', fecha), 'YYYY-MM') as mes, sum(base)::float as total from documentos
      where proveedor_id = $1 and status = 'guardado' and fecha >= date_trunc('month', current_date) - interval '5 months' group by 1 order by 1`, [id]);
    return { p, productos, docs, meses };
  });
  if (!data) notFound();
  const { p } = data;
  const canEdit = hasPerm(ctx, "proveedores:editar");
  const mLabel = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "long" });
  return (
    <Screen title={p.name} sub={[p.tipo, p.empresa].filter(Boolean).join(" · ") || "Proveedor"} back="/proveedores"
      actions={canEdit ? <span className="only-wide row"><ProvFormButton id={p.id} initial={p} label="Editar" icon="edit" /><BorrarProveedor id={p.id} name={p.name} /></span> : undefined}>
      <div className="art-grid">
        <div className="stack">
          <section className="card" aria-labelledby="h-prod">
            <div className="card-h"><h2 className="h3" id="h-prod">Productos que le compras</h2><span className="tag">{data.productos.length}</span></div>
            {data.productos.length ? <div className="list">{data.productos.map((a) => (
              <Link key={a.id} className="li" href={`/articulos/${a.id}`}>
                <span className="li-main"><b>{a.name}</b><small>{a.origen === "cotizacion" ? "Cotización" : `Último albarán ${fecha(a.fecha)}`}</small></span>
                <span className="li-end"><b>{eur(a.precio_unit)}/{a.unit}</b>{a.variacion != null ? <span className={`tag ${a.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{a.variacion > 0 ? "+" : "−"}{pct(Math.abs(a.variacion))}</span> : null}</span>
              </Link>))}</div> : <p className="muted small">Aún no hay productos de este proveedor.</p>}
          </section>
          <section className="card" aria-labelledby="h-docs">
            <div className="card-h"><h2 className="h3" id="h-docs">Albaranes y facturas</h2><Link className="linkbtn" href={`/compras?prov=${p.id}`}>Ver todos</Link></div>
            {data.docs.length ? <div className="list">{data.docs.map((d) => (
              <Link key={d.id} className="li" href={`/compras/${d.id}`}><span className="li-ic"><Icon name="receipt" /></span>
                <span className="li-main"><b>{d.kind === "factura" ? "Factura" : "Albarán"} {d.numero ?? ""}</b><small>{fecha(d.fecha, { day: "numeric", month: "long", year: "numeric" })}</small></span>
                <span className="li-end"><b>{eur(d.total)}</b></span></Link>))}</div> : <p className="muted small">Sin documentos guardados.</p>}
          </section>
        </div>
        <div className="stack">
          <section className="card" aria-labelledby="h-contacto">
            <div className="card-h"><h2 className="h3" id="h-contacto">Ficha de contacto</h2></div>
            {p.responsable || p.phone || p.email || p.direccion ? (
              <div className="contact">
                {p.responsable ? <span><Icon name="user" /> {p.responsable}</span> : null}
                {p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`}><Icon name="phone" /> {p.phone}</a> : null}
                {p.email ? <a href={`mailto:${p.email}`}><Icon name="mail" /> {p.email}</a> : null}
                {p.direccion ? <span><Icon name="pin" /> {p.direccion}</span> : null}
              </div>
            ) : <p className="muted small">Sin datos de contacto. {canEdit ? "Añádelos con «Editar»." : ""}</p>}
            <div className="tags">
              {p.entrega ? <span className="tag">Entrega {p.entrega}</span> : null}
              {p.cif ? <span className="tag tag-line">CIF {p.cif}</span> : null}
            </div>
            {p.notas ? <p className="small">{p.notas}</p> : null}
            {p.phone ? <a className="btn btn-2 btn-sm" href={`https://wa.me/${p.phone.replace(/\D/g, "").replace(/^(?!34)(\d{9})$/, "34$1")}`} target="_blank" rel="noopener"><Icon name="whatsapp" size={18} /> Escribir por WhatsApp</a> : null}
          </section>
          <section className="card" aria-labelledby="h-gasto">
            <div className="card-h"><h2 className="h3" id="h-gasto">Gasto por mes</h2><span className="muted small">Sin IVA</span></div>
            {data.meses.length ? <BarsH fmt={eur0} rows={data.meses.map((m) => ({ label: mLabel(m.mes), value: m.total }))} /> : <p className="muted small">Sin compras en los últimos meses.</p>}
          </section>
          {canEdit ? <div className="row-wrap only-narrow"><ProvFormButton id={p.id} initial={p} label="Editar" icon="edit" /><BorrarProveedor id={p.id} name={p.name} /></div> : null}
        </div>
      </div>
    </Screen>
  );
}
