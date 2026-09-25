import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { ComprasNav } from "@/components/subnav";
import { BarsH, Delta, LineChart } from "@/components/charts";
import { all, one, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { eur, eur0, fecha, plural, ultimosMeses } from "@/lib/format";

export const metadata = { title: "Albaranes y facturas" };
const PAGE = 20;
const STATUS: Record<string, [string, string]> = {
  leyendo: ["Leyendo…", "tag"], subido: ["Leyendo…", "tag"], revisar: ["Por revisar", "tag tag-warn"], error: ["No se pudo leer", "tag tag-bad"], guardado: ["Guardado", "tag tag-ok"],
};

export default async function Compras({ searchParams }: { searchParams: Promise<{ q?: string; p?: string; prov?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(sp.p) || 1);
  const data = await withTenant(ctx.tenantId, async (c) => {
    const like = q ? "%" + q.replace(/[%_\\]/g, (m) => "\\" + m) + "%" : null;
    const where = `d.local_id = $1 and d.kind in ('albaran','factura') and d.status <> 'descartado'
      and ($2::text is null or d.numero ilike $2 or p.name ilike $2) and ($3::uuid is null or d.proveedor_id = $3)`;
    const prov = sp.prov && /^[0-9a-f-]{36}$/i.test(sp.prov) ? sp.prov : null;
    const docs = await all<{ id: string; status: string; kind: string; source: string; numero: string | null; fecha: string | null; total: number | null; proveedor: string | null; lineas: number; created_at: Date }>(c, `
      select d.id, d.status, d.kind, d.source, d.numero, d.fecha, d.total, p.name as proveedor, d.created_at,
        (select count(*)::int from compra_lineas cl where cl.documento_id = d.id) as lineas
      from documentos d left join proveedores p on p.id = d.proveedor_id where ${where}
      order by (d.status in ('revisar','leyendo','subido','error')) desc, d.fecha desc nulls last, d.created_at desc limit ${PAGE + 1} offset ${(page - 1) * PAGE}`, [ctx.local.id, like, prov]);
    const mes = await one<{ total: number; n: number; provs: number }>(c, `select coalesce(sum(base),0)::float as total, count(*)::int as n, count(distinct proveedor_id)::int as provs
      from documentos where local_id = $1 and status = 'guardado' and fecha >= date_trunc('month', current_date)`, [ctx.local.id]);
    const gasto = await all<{ name: string; id: string; total: number }>(c, `select p.name, p.id, sum(d.base)::float as total from documentos d join proveedores p on p.id = d.proveedor_id
      where d.local_id = $1 and d.status = 'guardado' and d.fecha >= current_date - 30 group by p.id, p.name order by total desc limit 8`, [ctx.local.id]);
    // Misma ventana que la serie (los 6 meses de la gráfica), para que ningún artículo salga sin puntos
    const top = await all<{ id: string; name: string; unit: string; gasto: number }>(c, `select a.id, a.name, a.unit, sum(cl.importe)::float as gasto from compra_lineas cl
      join documentos d on d.id = cl.documento_id join articulos a on a.id = cl.articulo_id
      where d.local_id = $1 and d.status = 'guardado' and d.fecha >= date_trunc('month', current_date) - interval '5 months'
        and d.fecha < date_trunc('month', current_date) + interval '1 month' group by a.id, a.name, a.unit order by gasto desc limit 4`, [ctx.local.id]);
    const series = top.length ? await all<{ articulo_id: string; mes: string; precio: number }>(c, `select cl.articulo_id, to_char(date_trunc('month', d.fecha), 'YYYY-MM') as mes,
      (sum(cl.coste_unit * cl.cantidad * cl.factor) / nullif(sum(cl.cantidad * cl.factor), 0))::float as precio
      from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.articulo_id = any($1::uuid[]) and d.status = 'guardado' and d.fecha >= date_trunc('month', current_date) - interval '5 months'
      group by cl.articulo_id, 2 order by 2`, [top.map((t) => t.id)]) : [];
    const provs = await all<{ id: string; name: string }>(c, "select id, name from proveedores where local_id = $1 and not archived order by name", [ctx.local.id]);
    return { docs, mes, gasto, top, series, provs, prov };
  });
  const more = data.docs.length > PAGE;
  const docs = data.docs.slice(0, PAGE);
  const months: string[] = [];
  months.push(...ultimosMeses(6));
  const mLabel = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const gTotal = data.gasto.reduce((s, g) => s + g.total, 0);
  const canUpload = hasPerm(ctx, "compras");
  const qs = (p: number) => `/compras?${new URLSearchParams({ ...(q ? { q } : {}), ...(data.prov ? { prov: data.prov } : {}), p: String(p) })}`;

  return (
    <Screen title="Compras" sub="Albaranes y facturas, con los precios al día" fab>
      <ComprasNav cur="albaranes" />
      <section className="carta-banner">
        <img src="/demo/market.webp" alt="" />
        <div>
          <h2>Compras del mes: {eur0(data.mes?.total ?? 0)}</h2>
          <p>{plural(data.mes?.n ?? 0, "documento", "documentos")} de {plural(data.mes?.provs ?? 0, "proveedor", "proveedores")} · sin IVA. Registra un albarán y los precios se actualizan solos.</p>
          {canUpload ? <div className="row-wrap"><Link className="btn btn-light btn-sm" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link><Link className="btn btn-ghost-light btn-sm" href="/compras/nueva">Apuntar a mano</Link></div> : null}
        </div>
      </section>
      <div className="list-grid">
        <div className="stack">
          <form className="toolbar" action="/compras">
            <div className="searchbox"><Icon name="search" size={18} /><input className="inp" type="search" name="q" defaultValue={q} placeholder="Buscar por número o proveedor" aria-label="Buscar documentos" /></div>
            <select className="inp" name="prov" defaultValue={data.prov ?? ""} aria-label="Proveedor" style={{ flex: "0 1 220px" }}>
              <option value="">Todos los proveedores</option>
              {data.provs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn btn-2 btn-sm" type="submit">Filtrar</button>
          </form>
          <section className="card" aria-labelledby="h-docs">
            <div className="card-h"><h2 className="h3" id="h-docs">Documentos</h2>{q || data.prov ? <Link className="linkbtn" href="/compras">Quitar filtros</Link> : null}</div>
            {docs.length ? (
              <div className="list">
                {docs.map((d) => {
                  const [label, cls] = STATUS[d.status] ?? [d.status, "tag"];
                  return (
                    <Link key={d.id} className="li" href={`/compras/${d.id}`}>
                      <span className={`li-ic ${d.status === "revisar" ? "warn" : d.status === "error" ? "bad" : ""}`}><Icon name={d.status === "leyendo" ? "refresh" : "receipt"} /></span>
                      <span className="li-main">
                        <b>{d.proveedor ?? (d.status === "guardado" ? "Sin proveedor" : d.status === "revisar" ? "Proveedor por confirmar" : "Documento subido")}</b>
                        <small>{d.kind === "factura" ? "Factura" : "Albarán"}{d.numero ? ` ${d.numero}` : ""} · {fecha(d.fecha ?? new Date(d.created_at).toISOString())}{d.lineas ? ` · ${plural(d.lineas, "línea", "líneas")}` : ""}{d.source === "manual" ? " · a mano" : ""}</small>
                      </span>
                      <span className="li-end"><b>{eur(d.total)}</b><span className={cls}>{label}</span></span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <span className="li-ic"><Icon name="receipt" /></span>
                <b>{q || data.prov ? "Nada con ese filtro" : "Aún no hay albaranes"}</b>
                <p>{q || data.prov ? "Prueba con otro número o proveedor." : "Sube una foto del primero y en unos segundos tendrás cada precio al día."}</p>
                {canUpload && !q ? <div className="empty-actions"><Link className="btn" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link></div> : null}
              </div>
            )}
            {page > 1 || more ? (
              <div className="pager"><span>Página {page}</span><div className="pager-b">
                {page > 1 ? <Link className="btn btn-2 btn-xs" href={qs(page - 1)}>Anteriores</Link> : null}
                {more ? <Link className="btn btn-2 btn-xs" href={qs(page + 1)}>Siguientes</Link> : null}
              </div></div>
            ) : null}
          </section>
        </div>
        <div className="stack">
          <section className="card" aria-labelledby="h-evo">
            <div className="card-h"><h2 className="h3" id="h-evo">Evolución de precio</h2><span className="muted small">Lo que más compras · 6 meses</span></div>
            {data.top.length ? data.top.map((t) => {
              const vals = months.map((m) => data.series.find((s) => s.articulo_id === t.id && s.mes === m)?.precio ?? null);
              const known = vals.filter((v): v is number => v != null);
              const delta = known.length > 1 ? ((known[known.length - 1] - known[0]) / known[0]) * 100 : null;
              const up = delta != null && delta > 0.05;
              return (
                <div key={t.id} className="stack-xs">
                  <div className="row-sb"><Link className="link" href={`/articulos/${t.id}`}>{t.name}</Link><Delta value={delta} goodWhenUp={false} /></div>
                  <span className="muted xs">{known.length > 1 ? `${eur(known[0])} → ${eur(known[known.length - 1])}/${t.unit}` : `${eur(known[0])}/${t.unit}`}</span>
                  <LineChart values={vals} labels={months.map(mLabel)} h={120} unit="€" color={up ? "var(--bad)" : "var(--ok)"} fmt={(n) => eur(n) + "/" + t.unit} />
                </div>
              );
            }) : <p className="muted small">Cuando guardes albaranes verás aquí cómo cambian los precios de lo que más compras.</p>}
          </section>
          <section className="card" aria-labelledby="h-gasto">
            <div className="card-h"><h2 className="h3" id="h-gasto">Gasto por proveedor</h2><span className="muted small">Últimos 30 días · sin IVA</span></div>
            {data.gasto.length ? <BarsH fmt={eur0} rows={data.gasto.map((g) => ({ label: g.name, value: g.total, href: `/proveedores/${g.id}`, tip: `${g.name}|${eur(g.total)} · ${Math.round((g.total / gTotal) * 100)} % del gasto` }))} />
              : <p className="muted small">Sin compras en los últimos 30 días.</p>}
          </section>
        </div>
      </div>
    </Screen>
  );
}
