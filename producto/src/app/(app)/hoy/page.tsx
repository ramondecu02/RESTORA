import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { Tour } from "@/components/shell/tour";
import { BarsH, Delta, Donut, Gauge, LineChart, PALETTE, Sparkline } from "@/components/charts";
import { requireApp, hasPerm } from "@/server/ctx";
import { one, sys } from "@/server/db";
import { hoyData } from "@/server/queries/hoy";
import { capitalize, eur, eur0, fechaLarga, kEur, pct, plural, qty } from "@/lib/format";
import { pvpParaFc } from "@/lib/costing";

export const metadata = { title: "Hoy" };

const HERO0: Record<string, string> = {
  margen: "Sube un albarán y en 30 segundos sabrás lo que te cuesta cada ingrediente.",
  prov: "Sube un albarán y verás, precio a precio, lo que te cobra cada proveedor.",
  carta: "Sube un albarán: los precios de compra al día son la base de tu carta.",
  teclear: "Haz una foto al albarán. Lo leemos nosotros; tú solo confirmas.",
};
const HERO0P: Record<string, string> = {
  excel: "Se acabó pasar albaranes a Excel.", papel: "Esa carpeta de albaranes, por fin trabajando para ti.",
  programa: "Sin teclear nada: una foto desde el móvil, en la cocina.", nada: "Empieza por el de esta semana. No hace falta más.",
};

export default async function Hoy({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const d = await hoyData(ctx);
  const team = await sys((c) => one<{ m: number; i: number }>(c, "select (select count(*)::int from memberships where org_id = $1) as m, (select count(*)::int from invitations where org_id = $1 and accepted_at is null and expires_at > now()) as i", [ctx.tenantId]));
  const first = ctx.name.split(/\s+/)[0];
  const obj = (ctx.org.briefing.objetivo as string) || "margen";
  const iva = ctx.local.iva_venta, fcObj = ctx.local.fc_objetivo;
  const stage = d.n.albs === 0 ? 0 : d.n.recs === 0 ? 1 : d.n.provs < 2 && d.n.pvps === 0 ? 2 : 3;
  const dashboard = d.n.pvps > 0 && d.stats.some((s) => s.pvp);

  // Serie de 6 meses: histórico real (ventas importadas) + mes actual calculado con la carta
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - i); months.push(x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0")); }
  const mLabel = (m: string) => capitalize(new Date(m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "short" }).replace(".", ""));
  const H = new Map(d.hist.map((h) => [h.mes, h]));
  const C = new Map(d.com.map((h) => [h.mes, h.comensales / Math.max(1, h.dias)]));
  const serie = (f: (h: { neto: number; coste: number; uds: number }) => number | null, cur: number | null) => months.map((m, i) => (i === 5 ? cur : H.has(m) ? f(H.get(m)!) : null));
  const fcSerie = serie((h) => (h.neto ? (h.coste / h.neto) * 100 : null), d.res.fc != null ? d.res.fc * 100 : null);
  const margenS = serie((h) => h.neto - h.coste, d.res.margen);
  const ventasS = serie((h) => h.neto, d.res.ingresos);
  const comHoy = ctx.local.comensales_dia;
  const ticketS = serie((h) => (h.uds ? h.neto / h.uds : null), comHoy && d.res.ingresos ? d.res.ingresos / (comHoy * 30) : d.res.ticketUnidad);
  const comS = months.map((m, i) => (i === 5 ? comHoy : C.get(m) ?? null));
  const delta = (s: (number | null)[]) => { const v = s.filter((x): x is number => x != null); return v.length > 1 && v[v.length - 2] ? ((v[v.length - 1] - v[v.length - 2]) / Math.abs(v[v.length - 2])) * 100 : null; };
  const top = d.alerts[0];
  const salCls = d.salud.estado === "ok" ? "ok" : d.salud.estado === "warn" ? "warn" : "crit";

  const checklist: { t: string; done: boolean; href: string; show: boolean }[] = [
    { t: "Sube tu primer albarán", done: d.n.albs > 0, href: "/compras/subir", show: true },
    { t: "Revisa los precios de tus artículos", done: d.n.artsprecio >= 5, href: "/articulos", show: true },
    { t: "Crea tu primer escandallo", done: d.n.recs > 0, href: "/escandallos/nuevo", show: true },
    { t: "Pon el precio de carta a tus platos", done: d.n.pvps > 0, href: "/escandallos", show: true },
    { t: "Sube albaranes de un segundo proveedor", done: d.n.provs >= 2, href: "/compras/subir", show: true },
    { t: "Invita a tu equipo", done: (team?.m ?? 1) > 1 || (team?.i ?? 0) > 0, href: "/cuenta/usuarios", show: ctx.role === "propietario" },
    { t: "Importa tus ventas del TPV", done: d.n.imps > 0, href: "/ventas/importar", show: hasPerm(ctx, "ventas") },
  ].filter((x) => x.show);
  const pendientes = checklist.filter((x) => !x.done).length;

  const insights: { ic: IconName; cls?: string; t: string; p: string; a?: [string, string]; w: number }[] = [];
  if (d.fuera.length) insights.push({ ic: "alert", cls: "bad", t: `${plural(d.fuera.length, "plato está", "platos están")} por encima de su food cost objetivo`, p: d.fuera.slice(0, 3).map((f) => f.name).join(", ") + (d.fuera.length > 3 ? "…" : "") + ". Revisa su precio o sus cantidades.", a: ["Ver escandallos", "/escandallos?f=fuera"], w: obj === "margen" || obj === "carta" ? 3 : 2 });
  if (d.alerts.length > 1) insights.push({ ic: "trendUp", cls: "warn", t: `${plural(d.alerts.length, "subida de precio afecta", "subidas de precio afectan")} a tus platos`, p: `Suman ${eur0(d.alerts.reduce((s, a) => s + a.impactoMes, 0))} más al mes si no haces nada.`, a: ["Ver avisos", "/hoy/avisos"], w: obj === "prov" ? 3 : 2 });
  if (d.bajos.length) insights.push({ ic: "cart", cls: "warn", t: `${plural(d.bajos.length, "producto bajo mínimo", "productos bajo mínimo")}`, p: d.bajos.slice(0, 3).map((b) => b.name).join(", ") + ". Prepara el pedido desde el inventario.", a: ["Preparar pedido", "/inventario"], w: 1 });
  const sinPvp = d.stats.filter((s) => !s.pvp).length;
  if (sinPvp) insights.push({ ic: "tag", t: `${plural(sinPvp, "plato sin precio", "platos sin precio")} de carta`, p: "Sin PVP no podemos calcular su food cost ni su margen.", a: ["Poner precios", "/escandallos"], w: obj === "carta" ? 3 : 1 });
  insights.sort((a, b) => b.w - a.w);

  return (
    <Screen title="Hoy" sub={ctx.local.name} fab>
      <div className="greet"><p>{capitalize(fechaLarga(new Date()))}</p><h2>Hola, {first}</h2></div>
      {d.docs.map((doc) => (
        <div key={doc.id} className="banner" role="status">
          {doc.status === "leyendo" || doc.status === "subido" ? <span className="spin" aria-hidden="true" /> : <span className={`li-ic ${doc.status === "error" ? "bad" : "warn"}`}><Icon name={doc.status === "error" ? "alert" : "receipt"} /></span>}
          <div className="banner-b">
            <b>{doc.status === "revisar" ? "Albarán listo para revisar" : doc.status === "error" ? "No hemos podido leer un documento" : "Leyendo tu albarán…"}</b>
            <small>{doc.status === "revisar" ? `${doc.proveedor ?? "Proveedor por confirmar"} · ${plural(doc.lineas, "línea", "líneas")}` : doc.status === "error" ? "Vuelve a intentarlo o mételo a mano." : "Te avisamos cuando esté listo para revisar."}</small>
          </div>
          {doc.status !== "leyendo" && doc.status !== "subido" ? <Link className="btn btn-sm" href={`/compras/${doc.id}`}>{doc.status === "revisar" ? "Revisar" : "Ver"}</Link> : null}
        </div>
      ))}

      <div className="hoy-grid">
        <div className="hoy-col">
          {!dashboard ? (
            <section className="hero" data-tour="hero">
              {stage === 0 ? <>
                <p className="eyebrow">Tu primer paso</p>
                <h2 className="hero-t">{HERO0[obj] ?? HERO0.margen}</h2>
                <p className="hero-p">{HERO0P[(ctx.org.briefing.compras as string) ?? ""] ?? ""}</p>
                <div className="hero-actions"><Link className="btn btn-light" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link><Link className="btn btn-ghost-light" href="/compras/subir">Probar con uno de ejemplo</Link></div>
              </> : stage === 1 ? <>
                <p className="eyebrow">Tu siguiente paso</p>
                <h2 className="hero-t">Calcula lo que te cuesta tu primer plato.</h2>
                <p className="hero-p">Ya tienes el precio de {plural(d.n.artsprecio, "artículo", "artículos")}.{d.tpl[0] ? ` Con ellos, ${d.tpl[0].name.toLowerCase()} te sale a ${eur(d.tpl[0].coste)} la ración (PVP para un ${fcObj} %: ${eur(pvpParaFc(d.tpl[0].coste!, fcObj, iva).gross)}).` : ""}</p>
                <div className="hero-actions"><Link className="btn btn-light" href={d.tpl[0] ? `/escandallos/nuevo?plantilla=${d.tpl[0].key}` : "/escandallos/nuevo"}><Icon name="book" size={18} /> Crear escandallo</Link></div>
              </> : <>
                <p className="eyebrow">Tu siguiente paso</p>
                <h2 className="hero-t">{d.n.pvps === 0 ? "Pon el precio de carta a tus platos." : "Sube un albarán de otro proveedor y compara."}</h2>
                <p className="hero-p">{d.n.pvps === 0 ? "Con el PVP te decimos el food cost real y el margen de cada plato." : "Con dos proveedores te decimos quién te vende más barato cada producto y cuánto ahorrarías al año."}</p>
                <div className="hero-actions"><Link className="btn btn-light" href={d.n.pvps === 0 ? "/escandallos" : "/compras/subir"}>{d.n.pvps === 0 ? "Ir a escandallos" : "Subir albarán"}</Link></div>
              </>}
            </section>
          ) : (
            <section className="dash" data-tour="hero" aria-labelledby="h-sit">
              <div className="dash-top">
                <Gauge value={d.res.fc != null ? d.res.fc * 100 : null} target={fcObj} caption={`La marca negra es tu objetivo del ${fcObj} %`} />
                <div className="dash-copy">
                  <span className={`salud ${salCls}`}><Icon name={salCls === "ok" ? "check" : "alert"} size={14} /> {salCls === "ok" ? "Todo bajo control" : salCls === "warn" ? "Requiere seguimiento" : "Requiere acción"}</span>
                  <p className="eyebrow">Situación general · {capitalize(new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" }))}</p>
                  <h2 id="h-sit">{d.salud.title}</h2>
                  <p>{plural(d.fuera.length, "plato fuera de objetivo", "platos fuera de objetivo")} y {plural(d.bajos.length, "producto bajo mínimo", "productos bajo mínimo")}. El resto, en orden.</p>
                </div>
              </div>
              <div className="tiles">
                {([["Margen del mes", margenS, eur0], ["Ventas del mes", ventasS, eur0], [comHoy ? "Ticket por comensal" : "Ticket medio", ticketS, (n: number) => eur(n)], ["Comensales/día", comS, (n: number) => qty(n, 0)]] as const).map(([l, s, f]) => {
                  const cur = s[5];
                  return (
                    <div className="tile" key={l}>
                      <div className="tile-top"><span className="tile-lab">{l}</span><Delta value={delta([...s])} /></div>
                      <span className="tile-val">{cur != null ? f(cur) : "—"}</span>
                      <Sparkline values={s.filter((x): x is number => x != null)} label={`${l}: evolución`} />
                    </div>
                  );
                })}
              </div>
              {!d.hist.length ? <p className="hint">El mes en curso se calcula con tus unidades al mes y tus costes de hoy. Importa ventas para ver la evolución real.</p> : null}
            </section>
          )}

          {top ? (
            <section className={`ins ${top.salen.length ? "bad" : ""}`} aria-labelledby="h-top">
              <span className={`ins-ic ${top.salen.length ? "bad" : "warn"}`}><Icon name="trendUp" /></span>
              <div className="ins-b">
                <p className="ins-t" id="h-top">{top.name} ha subido un {pct(top.variacion)} en la última compra</p>
                <p className="ins-p">Pasa de {eur(top.antes)} a {eur(top.ahora)}/{top.unit}{top.proveedor ? ` en ${top.proveedor}` : ""}. Afecta a {plural(top.platos.length, "plato", "platos")}. {top.salen.length ? `${top.salen.map((x) => x.name).join(", ")} ${top.salen.length === 1 ? "pasa" : "pasan"} de tu objetivo.` : "Ningún plato se sale del objetivo con esta subida."}</p>
                <div className="ins-figs">
                  <div className="ins-fig"><small>Coste extra al mes</small><b>{eur(top.impactoMes)}</b></div>
                  <div className="ins-fig"><small>Food cost de la carta</small><b>{pct(top.fcAntes)} → {pct(top.fcDespues)}</b></div>
                </div>
                <div className="ins-acts"><Link className="btn btn-2 btn-xs" href={`/escandallos/${top.platos[0].id}`}>Valorar {top.platos[0].name}</Link><Link className="btn btn-3 btn-xs" href="/hoy/avisos">Ver todos los avisos</Link></div>
              </div>
            </section>
          ) : null}

          {dashboard ? (
            <div className="two">
              <section className="card" aria-labelledby="h-fc">
                <div className="card-h"><h2 className="h3" id="h-fc">Food cost de la carta</h2><span className="muted small">6 meses</span></div>
                <LineChart values={fcSerie} labels={months.map(mLabel)} unit="%" target={fcObj} fmt={(n) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %"} />
              </section>
              <section className="card" aria-labelledby="h-fam">
                <div className="card-h"><h2 className="h3" id="h-fam">Margen por familia</h2><span className="muted small">al mes</span></div>
                <Donut items={d.familias.map((f, i) => ({ label: f.familia, value: f.margen, color: PALETTE[i % PALETTE.length] }))} fmt={eur0} centerTop={kEur(d.res.margen)} centerSub="margen al mes" label="Margen por familia de la carta" />
              </section>
            </div>
          ) : null}

          {dashboard && d.aporta.length ? (
            <section className="card" aria-labelledby="h-ap">
              <div className="card-h"><h2 className="h3" id="h-ap">Aportación por plato</h2><span className="muted small">Margen al mes · toca para abrirlo</span></div>
              <BarsH fmt={eur0} rows={d.aporta.map((a) => ({ label: a.name, value: a.value, href: `/escandallos/${a.id}`, color: PALETTE[d.familias.findIndex((f) => f.familia === a.familia) % PALETTE.length] }))} />
            </section>
          ) : null}

          {insights.length ? (
            <section className="stack-sm" aria-labelledby="h-ins">
              <h2 className="h3" id="h-ins">Para hoy</h2>
              <div className="ins-list">{insights.map((x, i) => (
                <article className="ins" key={i}>
                  <span className={`ins-ic ${x.cls ?? ""}`}><Icon name={x.ic} /></span>
                  <div className="ins-b"><p className="ins-t">{x.t}</p><p className="ins-p">{x.p}</p>{x.a ? <Link className="btn btn-2 btn-xs" href={x.a[1]}>{x.a[0]}</Link> : null}</div>
                </article>))}</div>
            </section>
          ) : !dashboard && stage === 0 ? (
            <section className="ghosts" aria-label="Lo que verás aquí">
              {([["receipt", "Tus precios al día", "Cada albarán actualiza lo que te cuesta cada ingrediente."], ["book", "El coste de cada plato", "Tus escandallos se recalculan solos."], ["truck", "Quién te vende más barato", "Comparamos proveedores en euros al año."]] as const).map(([ic, t, p]) => (
                <div className="ghost" key={t}><span className="ghost-ic"><Icon name={ic} /></span><div><b>{t}</b><small>{p}</small></div></div>))}
            </section>
          ) : null}
        </div>

        <div className="hoy-col">
          {pendientes && !ctx.prefs.hideChecklist ? (
            <section className="card" aria-labelledby="h-ck">
              <div className="card-h"><h2 className="h3" id="h-ck">Primeros pasos</h2><span className="tag">{checklist.length - pendientes} de {checklist.length}</span></div>
              <div className="bar"><i style={{ width: `${((checklist.length - pendientes) / checklist.length) * 100}%` }} /></div>
              <div className="ck">{checklist.map((x) => (
                <Link key={x.t} className={`ck-i ${x.done ? "done" : ""}`} href={x.href}>
                  <span className="ck-dot">{x.done ? <Icon name="check" size={14} sw={3} /> : null}</span><span className="ck-l">{x.t}</span><Icon name="chevR" size={18} />
                </Link>))}</div>
            </section>
          ) : null}
          <section className="card" aria-labelledby="h-stock">
            <div className="card-h"><h2 className="h3" id="h-stock">Stock que pide atención</h2><Link className="linkbtn" href="/inventario">Inventario <Icon name="arrowR" size={16} /></Link></div>
            {d.bajos.length ? <div className="list">{d.bajos.slice(0, 5).map((b) => (
              <Link key={b.id} className="li" href="/inventario"><span className="li-ic bad"><Icon name="alert" /></span>
                <span className="li-main"><b>{b.name}</b><small>Quedan {qty(b.stock)} {b.unit} · mínimo {qty(b.min)}</small></span>
                <span className="li-end"><b>{b.dias >= 99 ? "—" : `${qty(b.dias, 0)} d`}</b><small>cobertura</small></span></Link>))}</div>
              : <p className="muted small">Todo por encima del mínimo.</p>}
            <div className="stats" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div className="stat"><span className="stat-k">Compras del mes</span><span className="stat-v">{eur0(d.comprasMes)}</span><span className="stat-s">sin IVA</span></div>
              <div className="stat"><span className="stat-k">Valor del almacén</span><span className="stat-v">{eur0(d.valorAlmacen)}</span><span className="stat-s">a precio de compra</span></div>
            </div>
          </section>
          <section className="card" aria-labelledby="h-cfg">
            <div className="card-h"><h2 className="h3" id="h-cfg">Tu configuración</h2><Link className="linkbtn" href="/alta/briefing?editar=1">Cambiar</Link></div>
            <dl className="cfg">
              <div><dt>Food cost objetivo</dt><dd>{fcObj} %</dd></div>
              <div><dt>IVA de venta</dt><dd>{iva} %</dd></div>
              <div><dt>Artículos con precio</dt><dd>{d.n.artsprecio} de {d.n.arts}</dd></div>
              <div><dt>Platos escandallados</dt><dd>{d.n.recs}</dd></div>
            </dl>
          </section>
        </div>
      </div>
      <Tour k="hoy" show={sp.tour === "1" || !ctx.prefs.seen?.hoy} steps={[
        { sel: '[data-tour="hero"]', h: "Esto es Hoy", p: "Cada día te decimos qué mirar y qué hacer primero. Nunca verás esta pantalla vacía." },
        { sel: ['[data-tour="add-top"]', '[data-tour="add-fab"]'], h: "Todo entra por Añadir", p: "Albaranes y facturas, artículos nuevos, platos y tu carta. Un solo sitio." },
        { sel: ['[data-tour="side"]', '[data-tour="tabs"]'], h: "Tu menú", p: "Compras, Escandallos y el resto. Ves lo que corresponde a tu rol." },
      ]} />
    </Screen>
  );
}
