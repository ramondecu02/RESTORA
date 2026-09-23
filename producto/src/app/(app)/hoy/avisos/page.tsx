import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { all, withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { priceAlerts } from "@/server/domain/avisos";
import { estadoFC, foodCost } from "@/lib/costing";
import { eur, eur0, fecha, pct, plural, lista, fcPar } from "@/lib/format";

export const metadata = { title: "Avisos" };

export default async function Avisos() {
  const ctx = await requireApp();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const pa = await priceAlerts(c, ctx.local);
    const sinPrecio = await all<{ id: string; name: string }>(c, `select distinct a.id, a.name from articulos a join receta_lineas rl on rl.articulo_id = a.id join recetas r on r.id = rl.receta_id
      where a.local_id = $1 and not a.archived and not r.archived and a.pmp is null and a.last_price is null and a.precio_manual is null order by a.name limit 12`, [ctx.local.id]);
    return { ...pa, sinPrecio };
  });
  const total = data.alerts.reduce((s, a) => s + a.impactoMes, 0);
  const fuera = data.stats.filter((s) => s.en_carta).map((s) => ({ s, fc: foodCost(s.coste, s.pvp, ctx.local.iva_venta) }))
    .filter(({ s, fc }) => { const e = estadoFC(fc, s.fcObjetivo).estado; return e === "warn" || e === "crit"; });
  return (
    <Screen title="Avisos" sub="Calculados a partir de tus compras y tu carta" back="/hoy">
      <section className="card" aria-labelledby="h-sum">
        <div className="card-h"><h2 className="h3" id="h-sum">Lo que suman estos avisos</h2><span className="muted small">Si no haces nada</span></div>
        <div className="stats">
          <div className="stat bad"><span className="stat-k">Coste extra al mes</span><span className="stat-v">{eur0(total)}</span></div>
          <div className="stat"><span className="stat-k">Al año</span><span className="stat-v">{eur0(total * 12)}</span></div>
          <div className="stat"><span className="stat-k">Avisos abiertos</span><span className="stat-v">{data.alerts.length}</span></div>
          <div className="stat"><span className="stat-k">Platos fuera de objetivo</span><span className="stat-v">{fuera.length}</span></div>
        </div>
      </section>
      {data.alerts.length ? (
        <div className="ins-list">{data.alerts.map((a) => (
          <article key={a.articuloId} className={`ins ${a.salen.length ? "bad" : ""}`}>
            <span className={`ins-ic ${a.salen.length ? "bad" : "warn"}`}><Icon name="trendUp" /></span>
            <div className="ins-b">
              <span className={`tag ${a.salen.length ? "tag-bad" : "tag-warn"}`} style={{ alignSelf: "flex-start" }}>{a.salen.length ? "Acción recomendada" : "Para vigilar"}</span>
              <p className="ins-t">{a.name} ha subido un {pct(a.variacion)}{a.proveedor ? ` (${a.proveedor})` : ""}.</p>
              <p className="ins-p">De {eur(a.antes)} a {eur(a.ahora)}/{a.unit} el {fecha(a.fecha)}. Afecta a {plural(a.platos.length, "plato", "platos")}: {lista(a.platos.map((p) => p.name), 4)}. {a.salen.length ? `${lista(a.salen.map((p) => p.name), 4)} ${a.salen.length === 1 ? "pasa" : "pasan"} del objetivo.` : "Ninguno se sale del objetivo, pero el margen se estrecha."}</p>
              <div className="ins-figs">
                <div className="ins-fig"><small>Coste extra al mes</small><b>{eur(a.impactoMes)}</b></div>
                <div className="ins-fig"><small>Food cost de la carta</small><b>{fcPar(a.fcAntes, a.fcDespues)}</b></div>
                <div className="ins-fig"><small>Platos afectados</small><b>{a.platos.length}</b></div>
              </div>
              {a.alternativa ? <p className="ins-p ins-alt"><Icon name="swap" size={16} /><span>{a.alternativa.proveedor} lo tiene a {eur(a.alternativa.precio)}/{a.unit}.</span></p> : null}
              <div className="ins-acts">
                <Link className="btn btn-2 btn-xs" href={`/escandallos/${(a.salen[0] ?? a.platos[0]).id}`}>Valorar {(a.salen[0] ?? a.platos[0]).name}</Link>
                <Link className="btn btn-3 btn-xs" href={`/articulos/${a.articuloId}`}>{a.alternativa ? "Ver alternativas" : "Ver el artículo"}</Link>
              </div>
            </div>
          </article>))}</div>
      ) : (
        <div className="card"><div className="empty"><span className="li-ic ok"><Icon name="check" /></span><b>No hay subidas de precio abiertas</b><p>Cuando un albarán suba el precio de algo que usas en tus platos, lo verás aquí con su impacto en euros.</p></div></div>
      )}
      {fuera.length ? (
        <section className="card" aria-labelledby="h-fuera">
          <div className="card-h"><h2 className="h3" id="h-fuera">Platos fuera de su objetivo</h2></div>
          <div className="list">{fuera.map(({ s, fc }) => (
            <Link key={s.id} className="li" href={`/escandallos/${s.id}`}><span className="li-main"><b>{s.name}</b><small>Objetivo {s.fcObjetivo} % · coste {eur(s.coste)} · PVP {eur(s.pvp)}</small></span><span className="li-end"><span className="tag tag-bad">{pct(fc)}</span></span></Link>))}</div>
        </section>
      ) : null}
      {data.sinPrecio.length ? (
        <section className="card card-warn" aria-labelledby="h-sp">
          <div className="card-h"><h2 className="h3" id="h-sp">Ingredientes sin precio en tus recetas</h2></div>
          <p className="muted small">El coste de esos platos está incompleto.</p>
          <div className="tags">{data.sinPrecio.map((a) => <Link key={a.id} className="chip" href={`/articulos/${a.id}`}>{a.name}</Link>)}</div>
        </section>
      ) : null}
    </Screen>
  );
}
