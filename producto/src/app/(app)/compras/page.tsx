import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { ComprasNav } from "@/components/subnav";
import { BorrarDoc } from "./borrar-doc";
import { BarsH, Delta, LineChart } from "@/components/charts";
import { Atencion, porGravedad, type Foco } from "@/components/ui/atencion";
import { CountUp } from "@/components/ui/count-up";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Kpi, Kpis } from "@/components/ui/kpi";
import { all, one, withTenant } from "@/server/db";
import { requireApp, hasPerm, type AppCtx } from "@/server/ctx";
import { navBadges } from "@/server/queries/badges";
import { eur, eur0, fecha, plural, ultimosMeses } from "@/lib/format";

export const metadata = { title: "Albaranes y facturas" };
const PAGE = 20;
const STATUS: Record<string, [string, string]> = {
  leyendo: ["Leyendo…", "tag"], subido: ["Leyendo…", "tag"], revisar: ["Por revisar", "tag tag-warn"], error: ["No se pudo leer", "tag tag-bad"], guardado: ["Guardado", "tag tag-ok"],
};
type Sp = { q?: string; p?: string; prov?: string; estado?: string };

export default async function Compras({ searchParams }: { searchParams: Promise<Sp> }) {
  // Primero la sesión y el plan (si toca, redirige antes de enviar nada); después el contenido, que llega con su esqueleto
  const ctx = await requireApp();
  const sp = await searchParams;
  const canUpload = hasPerm(ctx, "compras");
  return (
    <Screen title="Compras" sub="Albaranes y facturas, con los precios al día" fab
      actions={canUpload ? <Link className="btn btn-sm only-wide" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link> : undefined}>
      <ComprasNav cur="albaranes" />
      <Suspense fallback={<Esqueleto kpis={4} filtros filas={7} lateral texto="Cargando tus albaranes…" />}><ComprasContenido ctx={ctx} sp={sp} canUpload={canUpload} /></Suspense>
    </Screen>
  );
}

async function ComprasContenido({ ctx, sp, canUpload }: { ctx: AppCtx; sp: Sp; canUpload: boolean }) {
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(sp.p) || 1);
  const estado = sp.estado === "revisar" || sp.estado === "guardados" ? sp.estado : "todos";
  const badges = await navBadges(ctx);
  const data = await withTenant(ctx.tenantId, async (c) => {
    const like = q ? "%" + q.replace(/[%_\\]/g, (m) => "\\" + m) + "%" : null;
    const estadoSql = estado === "revisar" ? "and d.status <> 'guardado'" : estado === "guardados" ? "and d.status = 'guardado'" : "";
    const where = `d.local_id = $1 and d.kind in ('albaran','factura') and d.status <> 'descartado' ${estadoSql}
      and ($2::text is null or d.numero ilike $2 or p.name ilike $2) and ($3::uuid is null or d.proveedor_id = $3)`;
    const prov = sp.prov && /^[0-9a-f-]{36}$/i.test(sp.prov) ? sp.prov : null;
    const docs = await all<{ id: string; status: string; kind: string; source: string; numero: string | null; fecha: string | null; total: number | null; proveedor: string | null; lineas: number; created_at: Date }>(c, `
      select d.id, d.status, d.kind, d.source, d.numero, d.fecha, d.total, p.name as proveedor, d.created_at,
        (select count(*)::int from compra_lineas cl where cl.documento_id = d.id) as lineas
      from documentos d left join proveedores p on p.id = d.proveedor_id where ${where}
      order by (d.status in ('revisar','leyendo','subido','error')) desc, d.fecha desc nulls last, d.created_at desc limit ${PAGE + 1} offset ${(page - 1) * PAGE}`, [ctx.local.id, like, prov]);
    // Los últimos 30 días frente a los 30 anteriores: la misma ventana que el gráfico de gasto por proveedor y sin el ruido de los primeros días del mes
    const mes = await one<{ total: number; ant: number; n: number; provs: number; docs: number }>(c, `select
        coalesce(sum(base) filter (where fecha > current_date - 30), 0)::float as total,
        coalesce(sum(base) filter (where fecha > current_date - 60 and fecha <= current_date - 30), 0)::float as ant,
        (count(*) filter (where fecha > current_date - 30))::int as n,
        (count(distinct proveedor_id) filter (where fecha > current_date - 30))::int as provs,
        (select count(*)::int from documentos where local_id = $1 and kind in ('albaran','factura') and status <> 'descartado') as docs
      from documentos where local_id = $1 and status = 'guardado' and fecha > current_date - 60`, [ctx.local.id]);
    const cuenta = await one<{ revisar: number; error: number; guardados: number; primero: string | null }>(c, `select
        (count(*) filter (where status = 'revisar'))::int as revisar, (count(*) filter (where status = 'error'))::int as error, (count(*) filter (where status = 'guardado'))::int as guardados,
        (array_agg(id order by created_at desc) filter (where status = 'revisar'))[1] as primero
      from documentos where local_id = $1 and kind in ('albaran','factura') and status <> 'descartado'`, [ctx.local.id]);
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
    return { docs, mes, cuenta, gasto, top, series, provs, prov };
  });
  const more = data.docs.length > PAGE;
  const docs = data.docs.slice(0, PAGE);
  const months = ultimosMeses(6);
  const mLabel = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const gTotal = data.gasto.reduce((s, g) => s + g.total, 0);
  const m = data.mes ?? { total: 0, ant: 0, n: 0, provs: 0, docs: 0 };
  const mayor = data.gasto[0] ?? null;
  const vsAnt = m.ant > 0 ? ((m.total - m.ant) / m.ant) * 100 : null;
  const cu = data.cuenta ?? { revisar: 0, error: 0, guardados: 0, primero: null };
  const filtrado = !!(q || data.prov || estado !== "todos");
  const hayDocs = m.docs > 0;

  // Lo que pide una decisión: albaranes leídos que esperan tu confirmación (sin ella no mueven precios ni stock) y los que no se pudieron leer
  const focos: Foco[] = [];
  if (cu.revisar) focos.push({ tono: "warn", ic: "receipt", k: "Por revisar", t: `${plural(cu.revisar, "albarán espera", "albaranes esperan")} tu confirmación`,
    p: "Hasta que los confirmes, sus precios no actualizan tus costes ni tu stock.", fig: [<CountUp key="f" value={cu.revisar} fmt="int" />, cu.revisar === 1 ? "albarán" : "albaranes"],
    a: [cu.revisar === 1 ? "Revisarlo" : "Revisar el último", `/compras/${cu.primero}`], b: cu.revisar > 1 ? ["Ver todos", "/compras?estado=revisar"] : undefined });
  if (cu.error) focos.push({ tono: "bad", ic: "alert", k: "No se pudo leer", t: `${plural(cu.error, "documento no se pudo leer", "documentos no se pudieron leer")}`,
    p: "Vuelve a subirlo con más luz, o apúntalo a mano.", fig: [<CountUp key="f" value={cu.error} fmt="int" />, cu.error === 1 ? "documento" : "documentos"], a: ["Ver cuáles", "/compras?estado=revisar"] });

  // Los enlaces conservan lo que se está mirando (búsqueda, proveedor y estado)
  const href = (o: Partial<Record<keyof Sp, string>>) => {
    const k = { q, prov: data.prov ?? "", estado: estado === "todos" ? "" : estado, ...o } as Record<string, string>;
    const s = new URLSearchParams(Object.entries(k).filter(([, v]) => v)).toString();
    return `/compras${s ? "?" + s : ""}`;
  };
  const provSel = data.provs.find((p) => p.id === data.prov)?.name;

  return (
    <>
      <Atencion focos={porGravedad(focos)} id="h-aten" titulo="Requiere tu atención" compacta />
      {hayDocs ? (
        <Kpis label="Compras de los últimos 30 días">
          <Kpi i={0} label="Compras · 30 días" value={m.total} fmt="eur0" delta={vsAnt} goodWhenUp={false} vs="vs los 30 días anteriores" sub="sin IVA · lo guardado" />
          <Kpi i={1} label="Albaranes · 30 días" value={m.n} fmt="int" sub={`de ${plural(m.provs, "proveedor", "proveedores")}`} />
          <Kpi i={2} label="Mayor proveedor" value={mayor && m.total > 0 ? (mayor.total / m.total) * 100 : null} fmt="pct0" sub={mayor ? mayor.name : undefined} hint="Sin compras en 30 días" href={mayor ? href({ prov: mayor.id, p: "" }) : null} />
          <Kpi i={3} label="Avisos de precio" value={badges.avisos} fmt="int" tone={badges.avisos ? "warn" : "ok"} sub={badges.avisos ? "subidas que tocan tus platos" : "ningún precio sube"} href="/hoy/avisos" />
        </Kpis>
      ) : null}
      <div className="list-grid">
        <div className="stack">
          {hayDocs ? (
            <>
              <form className="toolbar" action="/compras">
                <div className="searchbox"><Icon name="search" size={18} /><input className="inp" type="search" name="q" defaultValue={q} placeholder="Número o proveedor" aria-label="Buscar documentos" /></div>
                <select className="inp inp-prov" name="prov" defaultValue={data.prov ?? ""} aria-label="Proveedor">
                  <option value="">Todos los proveedores</option>
                  {data.provs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {estado !== "todos" ? <input type="hidden" name="estado" value={estado} /> : null}
                <button className="btn btn-2 btn-sm" type="submit">Filtrar</button>
              </form>
              <nav className="chips" aria-label="Filtrar por estado">
                <Link className={`chip ${estado === "todos" ? "is-on" : ""}`} href={href({ estado: "", p: "" })} aria-current={estado === "todos" ? "page" : undefined}>Todos <span className="cnt">{cu.guardados + badges.revisar}</span></Link>
                <Link className={`chip ${estado === "revisar" ? "is-on" : ""}`} href={href({ estado: "revisar", p: "" })} aria-current={estado === "revisar" ? "page" : undefined}>Por revisar <span className="cnt">{badges.revisar}</span></Link>
                <Link className={`chip ${estado === "guardados" ? "is-on" : ""}`} href={href({ estado: "guardados", p: "" })} aria-current={estado === "guardados" ? "page" : undefined}>Guardados <span className="cnt">{cu.guardados}</span></Link>
                {data.prov && provSel ? <Link className="chip is-on" href={href({ prov: "", p: "" })} aria-label={`Quitar el filtro de ${provSel}`}>{provSel} <Icon name="close" size={14} /></Link> : null}
              </nav>
            </>
          ) : null}
          <section className="card" aria-labelledby="h-docs">
            <div className="card-h"><h2 className="h3" id="h-docs">Documentos</h2>{filtrado ? <Link className="linkbtn" href="/compras">Quitar filtros</Link> : null}</div>
            {docs.length ? (
              <div className="list">
                {docs.map((d) => {
                  const [label, cls] = STATUS[d.status] ?? [d.status, "tag"];
                  return (
                    <div key={d.id} className="li-wrap">
                      <Link className="li" href={`/compras/${d.id}`}>
                        <span className={`li-ic ${d.status === "revisar" ? "warn" : d.status === "error" ? "bad" : ""}`}><Icon name={d.status === "leyendo" ? "refresh" : "receipt"} /></span>
                        <span className="li-main">
                          <b>{d.proveedor ?? (d.status === "guardado" ? "Sin proveedor" : d.status === "revisar" ? "Proveedor por confirmar" : "Documento subido")}</b>
                          <small>{d.kind === "factura" ? "Factura" : "Albarán"}{d.numero ? ` ${d.numero}` : ""} · {fecha(d.fecha ?? new Date(d.created_at).toISOString())}{d.lineas ? ` · ${plural(d.lineas, "línea", "líneas")}` : ""}{d.source === "manual" ? " · a mano" : ""}</small>
                        </span>
                        <span className="li-end"><b>{eur(d.total)}</b><span className={cls}>{label}</span></span>
                      </Link>
                      {canUpload ? <BorrarDoc id={d.id} status={d.status} kind={d.kind} variant="icon" /> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <span className="li-ic"><Icon name="receipt" /></span>
                <b>{filtrado ? "Nada con ese filtro" : "Aún no hay albaranes"}</b>
                <p>{filtrado ? "Prueba con otro número, proveedor o estado." : "Sube una foto del primero y en unos segundos tendrás cada precio al día."}</p>
                {canUpload && !filtrado ? <div className="empty-actions"><Link className="btn" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link><Link className="btn btn-2" href="/compras/nueva">Apuntar a mano</Link></div> : null}
              </div>
            )}
            {page > 1 || more ? (
              <div className="pager"><span>Página {page}</span><div className="pager-b">
                {page > 1 ? <Link className="btn btn-2 btn-xs" href={href({ p: String(page - 1) })}>Anteriores</Link> : null}
                {more ? <Link className="btn btn-2 btn-xs" href={href({ p: String(page + 1) })}>Siguientes</Link> : null}
              </div></div>
            ) : null}
          </section>
        </div>
        <div className="stack">
          <section className="card" aria-labelledby="h-evo">
            <div className="card-h"><h2 className="h3" id="h-evo">Evolución de precio</h2><span className="muted small">Lo que más compras · 6 meses</span></div>
            {data.top.length ? data.top.map((t) => {
              const vals = months.map((mm) => data.series.find((s) => s.articulo_id === t.id && s.mes === mm)?.precio ?? null);
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
            <div className="card-h"><h2 className="h3" id="h-gasto">Gasto por proveedor</h2><span className="muted small">Últimos 30 días · sin IVA · pulsa uno para filtrar</span></div>
            {data.gasto.length ? <BarsH fmt={eur0} rows={data.gasto.map((g) => ({ label: g.name, value: g.total, href: href({ prov: g.id, p: "" }), tip: `${g.name}|${eur(g.total)} · ${Math.round((g.total / gTotal) * 100)} % del gasto` }))} />
              : <p className="muted small">Sin compras en los últimos 30 días.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
