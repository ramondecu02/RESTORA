import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Kpi, Kpis } from "@/components/ui/kpi";
import { all, withTenant } from "@/server/db";
import { requireApp, type AppCtx } from "@/server/ctx";
import { priceAlerts } from "@/server/domain/avisos";
import { estadoFC, foodCost } from "@/lib/costing";
import { eur, fecha, nb, pct, plural } from "@/lib/format";
import { ListaAvisos } from "./lista";

export const metadata = { title: "Avisos" };

export default async function Avisos() {
  // Primero la sesión y el plan (si toca, redirige antes de enviar nada); después el contenido, que llega con su esqueleto
  const ctx = await requireApp();
  return (
    <Screen title="Avisos" sub="Calculados a partir de tus compras y tu carta" back="/hoy">
      <Suspense fallback={<Esqueleto kpis={4} filas={6} texto="Calculando tus avisos…" />}><AvisosContenido ctx={ctx} /></Suspense>
    </Screen>
  );
}

async function AvisosContenido({ ctx }: { ctx: AppCtx }) {
  const data = await withTenant(ctx.tenantId, async (c) => {
    const pa = await priceAlerts(c, ctx.local);
    const sinPrecio = await all<{ id: string; name: string }>(c, `select distinct a.id, a.name from articulos a join receta_lineas rl on rl.articulo_id = a.id join recetas r on r.id = rl.receta_id
      where a.local_id = $1 and not a.archived and not r.archived and a.pmp is null and a.last_price is null and a.precio_manual is null order by a.name limit 12`, [ctx.local.id]);
    return { ...pa, sinPrecio };
  });
  const total = data.alerts.reduce((s, a) => s + a.impactoMes, 0);
  const fuera = data.stats.filter((s) => s.en_carta).map((s) => ({ s, fc: foodCost(s.coste, s.pvp, ctx.local.iva_venta) }))
    .filter(({ s, fc }) => { const e = estadoFC(fc, s.fcObjetivo).estado; return e === "warn" || e === "crit"; });
  const accion = data.alerts.filter((a) => a.salen.length).length;
  return (
    <>
      <Kpis label="Lo que suman estos avisos">
        <Kpi i={0} label="Coste extra al mes" value={total} fmt="eur0" tone={total > 0 ? "bad" : "ok"} sub="si no haces nada" />
        <Kpi i={1} label="Al año" value={total * 12} fmt="eur0" sub="a este ritmo" />
        <Kpi i={2} label="Avisos abiertos" value={data.alerts.length} fmt="int" tone={accion ? "bad" : data.alerts.length ? "warn" : "ok"}
          sub={`${accion ? `${accion} piden acción` : data.alerts.length ? "para vigilar" : "todo en orden"}${data.cerrados.length ? ` · ${plural(data.cerrados.length, "cerrado", "cerrados")}` : ""}`} />
        <Kpi i={3} label="Platos fuera de objetivo" value={fuera.length} fmt="int" tone={fuera.length ? "bad" : "ok"} sub="food cost por encima de su objetivo" href={fuera.length ? "/escandallos?f=fuera" : null} />
      </Kpis>
      {data.alerts.length || data.cerrados.length ? (
        <ListaAvisos cerrados={data.cerrados.map((c) => ({
          eventoId: c.eventoId, id: c.articuloId, nombre: c.name, unit: c.unit, proveedor: c.proveedor, fecha: fecha(c.fecha), antes: c.antes, ahora: c.ahora, variacion: c.variacion,
          estado: c.estado, cuando: fecha(c.cuando),
        }))} avisos={data.alerts.map((a) => ({
          eventoId: a.eventoId, id: a.articuloId, nombre: a.name, unit: a.unit, proveedor: a.proveedor, fecha: fecha(a.fecha), antes: a.antes, ahora: a.ahora, variacion: a.variacion,
          platos: a.platos, salen: a.salen, impactoMes: a.impactoMes, fcAntes: a.fcAntes, fcDespues: a.fcDespues, alternativa: a.alternativa,
        }))} />
      ) : (
        <div className="card"><div className="empty"><span className="li-ic ok"><Icon name="check" /></span><b>No hay subidas de precio abiertas</b><p>Cuando un albarán suba el precio de algo que usas en tus platos, lo verás aquí con su impacto en euros.</p></div></div>
      )}
      {fuera.length ? (
        <section className="card" aria-labelledby="h-fuera">
          <div className="card-h"><h2 className="h3" id="h-fuera">Platos fuera de su objetivo</h2></div>
          <div className="list">{fuera.map(({ s, fc }) => (
            <Link key={s.id} className="li" href={`/escandallos/${s.id}`}><span className="li-main"><b>{s.name}</b><small>{nb(`Objetivo ${s.fcObjetivo} % · coste ${eur(s.coste)} · PVP ${eur(s.pvp)}`)}</small></span><span className="li-end"><span className="tag tag-bad">{pct(fc)}</span></span></Link>))}</div>
        </section>
      ) : null}
      {data.sinPrecio.length ? (
        <section className="card card-warn" aria-labelledby="h-sp">
          <div className="card-h"><h2 className="h3" id="h-sp">Ingredientes sin precio en tus recetas</h2></div>
          <p className="muted small">El coste de esos platos está incompleto.</p>
          <div className="tags">{data.sinPrecio.map((a) => <Link key={a.id} className="chip" href={`/articulos/${a.id}`}>{a.name}</Link>)}</div>
        </section>
      ) : null}
    </>
  );
}
