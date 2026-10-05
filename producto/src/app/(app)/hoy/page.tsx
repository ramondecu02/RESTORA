import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { Tour } from "@/components/shell/tour";
import { BarsH, Donut, PALETTE } from "@/components/charts";
import { CountUp } from "@/components/ui/count-up";
import { Atencion, porGravedad, type Foco } from "@/components/ui/atencion";
import { PanelMes } from "./panel";
import { HoyEsqueleto } from "./esqueleto";
import { requireApp, hasPerm } from "@/server/ctx";
import { one, sys } from "@/server/db";
import { hoyData } from "@/server/queries/hoy";
import { capitalize, eur, eur0, fechaLarga, kEur, pct, plural, qty, lista, ultimosMeses, fecha } from "@/lib/format";
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
  // Primero la sesión y el plan (si toca, redirige antes de enviar nada); después el contenido, que llega con su esqueleto
  const ctx = await requireApp();
  const sp = await searchParams;
  return (
    <Screen title="Hoy" sub={ctx.local.name} fab>
      <Suspense fallback={<HoyEsqueleto />}><HoyContenido ctx={ctx} tour={sp.tour === "1"} /></Suspense>
    </Screen>
  );
}

async function HoyContenido({ ctx, tour }: { ctx: Awaited<ReturnType<typeof requireApp>>; tour: boolean }) {
  const d = await hoyData(ctx);
  const team = await sys((c) => one<{ m: number; i: number }>(c, "select (select count(*)::int from memberships where org_id = $1) as m, (select count(*)::int from invitations where org_id = $1 and accepted_at is null and expires_at > now()) as i", [ctx.tenantId]));
  const first = ctx.name.split(/\s+/)[0];
  const obj = (ctx.org.briefing.objetivo as string) || "margen";
  const iva = ctx.local.iva_venta, fcObj = ctx.local.fc_objetivo;
  const stage = d.n.albs === 0 ? 0 : d.n.recs === 0 ? 1 : d.n.provs < 2 && d.n.pvps === 0 ? 2 : 3;
  const dashboard = d.n.pvps > 0 && d.stats.some((s) => s.pvp);
  // Ventas, márgenes y su evolución: solo para quien ve Ventas (cocina no)
  const verVentas = hasPerm(ctx, "ventas");

  // Serie de 6 meses: histórico real (ventas importadas) + mes actual calculado con la carta
  const months: string[] = [];
  months.push(...ultimosMeses(6));
  const mLabel = (m: string) => capitalize(new Date(m + "-15T12:00:00").toLocaleDateString("es-ES", { month: "short" }).replace(".", ""));
  const H = new Map(d.hist.map((h) => [h.mes, h]));
  const C = new Map(d.com.map((h) => [h.mes, h.comensales / Math.max(1, h.dias)]));
  const serie = (f: (h: { neto: number; coste: number; uds: number }) => number | null, cur: number | null) => months.map((m, i) => (i === 5 ? cur : H.has(m) ? f(H.get(m)!) : null));
  const fcSerie = serie((h) => (h.neto ? (h.coste / h.neto) * 100 : null), d.res.fc != null ? d.res.fc * 100 : null);
  const margenS = serie((h) => h.neto - h.coste, d.res.margen);
  const ventasS = serie((h) => h.neto, d.res.ingresos);
  const comHoy = ctx.local.comensales_dia;
  // Con comensales: ticket por comensal (histórico con los comensales importados); sin ellos, ticket por plato vendido
  const CT = new Map(d.com.map((h) => [h.mes, h.comensales]));
  const ticketS = comHoy
    ? months.map((m, i) => (i === 5 ? (d.res.ingresos ? d.res.ingresos / (comHoy * 30) : null) : H.has(m) && CT.get(m) ? H.get(m)!.neto / CT.get(m)! : null))
    : serie((h) => (h.uds ? h.neto / h.uds : null), d.res.ticketUnidad);
  const comS = months.map((m, i) => (i === 5 ? comHoy : C.get(m) ?? null));
  const largas = months.map((m) => fecha(m + "-15", { month: "long", year: "numeric" }));
  // Familias: las 5 que más margen dejan con color propio; el resto, juntas en «Otras»
  const famTop = d.familias.slice(0, d.familias.length > 6 ? 5 : 6);
  const famColor = (f: string) => { const i = famTop.findIndex((x) => x.familia === f); return i >= 0 ? PALETTE[i] : "var(--chart-otros)"; };
  const resto = d.familias.slice(famTop.length);
  const fams = [...famTop.map((f) => ({ label: f.familia, value: f.margen, color: famColor(f.familia), href: `/escandallos?fam=${encodeURIComponent(f.familia)}` })),
    ...(resto.length ? [{ label: `Otras familias (${resto.length})`, value: resto.reduce((s, f) => s + f.margen, 0), color: "var(--chart-otros)", href: "/escandallos" }] : [])];
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

  // Lo que pide una decisión hoy, de más a menos grave. El resto de la pantalla es información de fondo.
  const focos: Foco[] = [];
  if (top) focos.push({ tono: top.salen.length ? "bad" : "warn", ic: "trendUp", k: "Subida de precio", t: `${top.name} sube un ${pct(top.variacion)}`,
    p: `De ${eur(top.antes)} a ${eur(top.ahora)}/${top.unit}${top.proveedor ? ` en ${top.proveedor}` : ""}. Afecta a ${plural(top.platos.length, "plato", "platos")}. ${top.salen.length ? `${lista(top.salen.map((x) => x.name))} ${top.salen.length === 1 ? "pasa" : "pasan"} de tu objetivo.` : "Ninguno se sale del objetivo."}`,
    fig: [<CountUp key="f" value={top.impactoMes} fmt="eur" />, "más al mes"], a: [`Valorar ${top.platos[0].name}`, `/escandallos/${top.platos[0].id}`], b: ["Ver todos los avisos", "/hoy/avisos"] });
  if (d.fuera.length) focos.push({ tono: "bad", ic: "alert", k: "Food cost", t: `${plural(d.fuera.length, "plato está", "platos están")} por encima de su objetivo`, p: lista(d.fuera.map((f) => f.name)) + ". Revisa su precio o sus cantidades.",
    fig: [<CountUp key="f" value={d.fuera.length} fmt="int" />, d.fuera.length === 1 ? "plato" : "platos"], a: ["Ver escandallos", "/escandallos?f=fuera"] });
  if (d.alerts.length > 1) focos.push({ tono: "warn", ic: "trendUp", k: "Precios", t: `${plural(d.alerts.length, "subida de precio afecta", "subidas de precio afectan")} a tus platos`, p: "Es lo que sumarían al mes si no haces nada.",
    fig: [<CountUp key="f" value={d.alerts.reduce((x, a) => x + a.impactoMes, 0)} fmt="eur0" />, "más al mes"], a: ["Ver avisos", "/hoy/avisos"] });
  if (d.bajos.length) focos.push({ tono: "warn", ic: "cart", k: "Stock", t: `${plural(d.bajos.length, "producto bajo mínimo", "productos bajo mínimo")}`, p: lista(d.bajos.map((b) => b.name)) + ". Prepara el pedido desde el inventario.",
    fig: [<CountUp key="f" value={d.bajos.length} fmt="int" />, d.bajos.length === 1 ? "producto" : "productos"], a: ["Preparar pedido", "/inventario"] });
  const sinPvp = d.stats.filter((s) => !s.pvp).length;
  if (sinPvp) focos.push({ tono: "info", ic: "tag", k: "Carta", t: `${plural(sinPvp, "plato sin precio", "platos sin precio")} de carta`, p: "Sin PVP no podemos calcular su food cost ni su margen.", a: ["Poner precios", "/escandallos"] });
  const ordenados = porGravedad(focos);
  const estadoTxt = salCls === "ok" ? "Todo bajo control" : salCls === "warn" ? "Requiere seguimiento" : "Requiere acción";

  return (
    <>
      <div className="hoy-head">
        <div className="greet"><p>{capitalize(fechaLarga(new Date()))}</p><h2>Hola, {first}</h2></div>
      </div>
      {d.docs.map((doc) => (
        <div key={doc.id} className="banner" role="status">
          {doc.status === "leyendo" || doc.status === "subido" ? <span className="spin" aria-hidden="true" /> : <span className={`li-ic ${doc.status === "error" ? "bad" : "warn"}`}><Icon name={doc.status === "error" ? "alert" : "receipt"} /></span>}
          <div className="banner-b">
            <b>{doc.status === "revisar" ? "Albarán listo para revisar" : doc.status === "error" ? "No hemos podido leer un documento" : "Leyendo tu albarán…"}</b>
            <small>{doc.status === "revisar" ? `${doc.proveedor ?? "Proveedor por confirmar"} · ${plural(doc.lineas, "línea", "líneas")}` : doc.status === "error" ? "Vuelve a intentarlo o mételo a mano." : "Te avisamos cuando esté listo para revisar."}</small>
          </div>
          <Link className="btn btn-sm" href={`/compras/${doc.id}`}>{doc.status === "revisar" ? "Revisar" : "Ver"}</Link>
        </div>
      ))}

      <div className="hoy-grid">
        <div className="hoy-col">
          {dashboard ? (
            ordenados.length ? (
              <Atencion focos={ordenados} id="h-foco" titulo="Requiere tu atención" verTodo={["Ver todos los avisos", "/hoy/avisos"]}
                chip={<span className={`salud ${salCls}`}><Icon name={salCls === "ok" ? "check" : "alert"} size={14} /> {estadoTxt}</span>} />
            ) : (
              <section className="focus" aria-labelledby="h-foco">
                <div className="focus-h">
                  <h2 className="h2" id="h-foco">Hoy no hay nada urgente</h2>
                  <span className={`salud ${salCls}`}><Icon name={salCls === "ok" ? "check" : "alert"} size={14} /> {estadoTxt}</span>
                </div>
                <div className="fc fc-ok"><div className="fc-k"><Icon name="check" size={16} /> Todo en orden</div><p className="fc-p">Tu carta está dentro del objetivo y no hay productos bajo mínimo. Cuando algo se mueva, te lo decimos aquí.</p></div>
              </section>
            )
          ) : null}

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
            <div data-tour="hero">
              <PanelMes cortas={months.map(mLabel)} largas={largas.map(capitalize)} fc={fcSerie} margen={margenS} ventas={ventasS} ticket={ticketS} comensales={comS}
                fcObjetivo={fcObj} porComensal={!!comHoy} verVentas={verVentas} hayHistorico={d.hist.length > 0} />
            </div>
          )}

          {!dashboard && stage === 0 ? (
            <section className="ghosts" aria-label="Lo que verás aquí">
              {([["receipt", "Tus precios al día", "Cada albarán actualiza lo que te cuesta cada ingrediente."], ["book", "El coste de cada plato", "Tus escandallos se recalculan solos."], ["truck", "Quién te vende más barato", "Comparamos proveedores en euros al año."]] as const).map(([ic, t, p]) => (
                <div className="ghost" key={t}><span className="ghost-ic"><Icon name={ic} /></span><div><b>{t}</b><small>{p}</small></div></div>))}
            </section>
          ) : null}
          {!dashboard && stage > 0 ? <Atencion focos={ordenados.map((f) => ({ ...f, b: undefined }))} id="h-foco" titulo="Para hoy" compacta /> : null}

          {dashboard && verVentas ? (
            <section className="card" aria-labelledby="h-fam">
              <div className="card-h"><h2 className="h3" id="h-fam">Margen por familia</h2><span className="muted small">al mes · pulsa una familia para ver sus platos</span></div>
              <Donut items={fams} fmt={eur0} centerTop={kEur(d.res.margen)} centerSub="margen al mes" label="Margen por familia de la carta" />
            </section>
          ) : null}

          {dashboard && verVentas && d.aporta.length ? (
            <section className="card" aria-labelledby="h-ap">
              <div className="card-h"><h2 className="h3" id="h-ap">Aportación por plato</h2><span className="muted small">Margen al mes · toca un plato para abrirlo</span></div>
              <BarsH fmt={eur0} rows={d.aporta.map((a) => ({ label: a.name, value: a.value, href: `/escandallos/${a.id}`, color: famColor(a.familia) }))} />
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
                <span className="li-main"><b>{b.name}</b><small>Quedan {qty(b.stock, 1)} {b.unit} · mínimo {qty(b.min, 1)}</small></span>
                <span className="li-end"><b>{b.dias >= 99 ? "—" : `${qty(b.dias, 0)} d`}</b><small>cobertura</small></span></Link>))}</div>
              : <p className="muted small">Todo por encima del mínimo.</p>}
            <div className="stats" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div className="stat"><span className="stat-k">Compras del mes</span><span className="stat-v"><CountUp value={d.comprasMes} fmt="eur0" /></span><span className="stat-s">sin IVA</span></div>
              <div className="stat"><span className="stat-k">Valor del almacén</span><span className="stat-v"><CountUp value={d.valorAlmacen} fmt="eur0" /></span><span className="stat-s">a precio de compra</span></div>
            </div>
          </section>
          <section className="card" aria-labelledby="h-cfg">
            <div className="card-h"><h2 className="h3" id="h-cfg">Tu configuración</h2>{ctx.role === "propietario" ? <Link className="linkbtn" href="/alta/briefing?editar=1">Cambiar</Link> : null}</div>
            <dl className="cfg">
              <div><dt>Food cost objetivo</dt><dd>{fcObj} %</dd></div>
              <div><dt>IVA de venta</dt><dd>{iva} %</dd></div>
              <div><dt>Artículos con precio</dt><dd>{d.n.artsprecio} de {d.n.arts}</dd></div>
              <div><dt>Platos escandallados</dt><dd>{d.n.recs}</dd></div>
            </dl>
          </section>
        </div>
      </div>
      <Tour k="hoy" show={tour || !ctx.prefs.seen?.hoy} steps={[
        { sel: '[data-tour="hero"]', h: "Esto es Hoy", p: "Cada día te decimos qué mirar y qué hacer primero. Nunca verás esta pantalla vacía." },
        { sel: ['[data-tour="add-top"]', '[data-tour="add-fab"]'], h: "Todo entra por Añadir", p: "Albaranes y facturas, artículos nuevos, platos y tu carta. Un solo sitio." },
        { sel: ['[data-tour="side"]', '[data-tour="tabs"]'], h: "Tu menú", p: "Compras, Escandallos y el resto. Ves lo que corresponde a tu rol." },
      ]} />
    </>
  );
}
