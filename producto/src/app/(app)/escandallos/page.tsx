import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { EscNav } from "@/components/subnav";
import { Tour } from "@/components/shell/tour";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Kpi, Kpis } from "@/components/ui/kpi";
import { SelectNav } from "@/components/ui/select-nav";
import { withTenant } from "@/server/db";
import { requireApp, hasPerm, type AppCtx } from "@/server/ctx";
import { dishStats } from "@/server/domain/carta";
import { histVentas } from "@/server/queries/historico";
import { estadoFC, foodCost, neto } from "@/lib/costing";
import { resumenCarta } from "@/lib/menu";
import { famRank } from "@/lib/briefing";
import { fotoUrl } from "@/lib/fotos";
import { diferencia, serieMensual, variacionPct } from "@/lib/series";
import { eur, pct, qty, plural, ultimosMeses } from "@/lib/format";

export const metadata = { title: "Escandallos" };

type Sp = { f?: string; q?: string; fam?: string; o?: string; d?: string };
const ORDENES = [["fam", "Por familia"], ["fc", "Food cost"], ["margen", "Margen"], ["uds", "Unidades al mes"], ["coste", "Coste"], ["pvp", "Precio"], ["plato", "Nombre"]] as const;
type Orden = (typeof ORDENES)[number][0];

export default async function Escandallos({ searchParams }: { searchParams: Promise<Sp> }) {
  // Primero la sesión y el plan (si toca, redirige antes de enviar nada); después el contenido, que llega con su esqueleto
  const ctx = await requireApp();
  const sp = await searchParams;
  return (
    <Screen title="Escandallos" sub="El coste real de cada plato, ingrediente a ingrediente" fab
      actions={<Link className="btn btn-2 btn-sm only-wide" href="/escandallos/nuevo"><Icon name="plus" size={18} /> Nuevo plato</Link>}>
      <EscNav cur="platos" />
      <Suspense fallback={<Esqueleto kpis={4} filtros filas={8} texto="Cargando tus platos…" />}><EscandallosContenido ctx={ctx} sp={sp} /></Suspense>
    </Screen>
  );
}

async function EscandallosContenido({ ctx, sp }: { ctx: AppCtx; sp: Sp }) {
  const verVentas = hasPerm(ctx, "ventas");
  const { stats, hist } = await withTenant(ctx.tenantId, async (c) => ({ ...(await dishStats(c, ctx.local)), hist: verVentas ? await histVentas(c, ctx.local.id) : [] }));
  const q = (sp.q ?? "").toLowerCase().trim();
  // Sin escandallo (o sin coste de compra en reventa) no hay food cost: no se muestra un 0 % «En objetivo»
  const filas = stats.map((s) => {
    const fc = s.sinCoste ? null : foodCost(s.coste, s.pvp, ctx.local.iva_venta);
    const est = s.sinCoste && s.pvp ? { estado: "none" as const, label: s.reventa ? "Sin coste" : s.missing ? "Faltan precios" : "Sin escandallo" } : estadoFC(fc, s.fcObjetivo);
    return { ...s, fc, est, margen: s.pvp && !s.sinCoste ? neto(s.pvp, ctx.local.iva_venta) - s.coste : null };
  });
  type Fila = (typeof filas)[number];
  const esFuera = (r: Fila) => r.en_carta && (r.est.estado === "warn" || r.est.estado === "crit");
  const fam = (sp.fam ?? "").slice(0, 60);
  const o: Orden = ORDENES.some(([k]) => k === sp.o) ? (sp.o as Orden) : "fam";
  const asc = sp.d === "asc" || (o === "plato" && sp.d !== "desc");
  const valor: Record<Exclude<Orden, "fam">, (r: Fila) => number | string | null> = {
    fc: (r) => r.fc, margen: (r) => r.margen, uds: (r) => r.ventas, coste: (r) => (r.sinCoste ? null : r.coste), pvp: (r) => r.pvp, plato: (r) => r.name,
  };
  const porFamilia = (a: Fila, b: Fila) => famRank(a.familia) - famRank(b.familia) || a.familia.localeCompare(b.familia) || a.name.localeCompare(b.name);
  const ordena = (a: Fila, b: Fila) => {
    if (o === "fam") return porFamilia(a, b);
    const va = valor[o](a), vb = valor[o](b);
    if (va == null || vb == null) return va == null && vb == null ? porFamilia(a, b) : va == null ? 1 : -1; // sin dato, siempre al final
    const c = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
    return (asc ? c : -c) || porFamilia(a, b);
  };
  const rows = filas.filter((r) => (!q || r.name.toLowerCase().includes(q)) && (!fam || r.familia === fam) && (sp.f !== "fuera" || esFuera(r)) && (sp.f !== "borrador" || !r.en_carta)
    && (sp.f !== "sinpvp" || (r.en_carta && !r.pvp))).sort(ordena);
  const carta = stats.filter((s) => s.en_carta);
  const res = resumenCarta(carta);
  const fuera = filas.filter(esFuera).length;
  const sinPvp = carta.filter((s) => !s.pvp).length;
  const tagCls = (e: string) => (e === "ok" ? "tag-ok" : e === "warn" ? "tag-warn" : e === "crit" ? "tag-bad" : "tag-none");

  // Evolución: lo real de los meses cerrados (ventas importadas) y, en el mes en curso, lo calculado con la carta
  const months = ultimosMeses(6);
  const fcS = serieMensual(months, hist, (h) => (h.neto ? (h.coste / h.neto) * 100 : null), res.fc != null ? res.fc * 100 : null);
  const margenS = serieMensual(months, hist, (h) => h.neto - h.coste, res.margen);
  const mesAnt = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toLocaleDateString("es-ES", { month: "long" });
  const fcTono = res.fc == null ? undefined : ({ ok: "ok", warn: "warn", crit: "bad" } as const)[estadoFC(res.fc, ctx.local.fc_objetivo).estado as "ok" | "warn" | "crit"];

  // Los enlaces conservan lo que se está mirando (filtro, familia, búsqueda y orden)
  const href = (x: Partial<Record<keyof Sp, string>>) => {
    const k = { f: sp.f ?? "", fam, q: sp.q ?? "", o: o === "fam" ? "" : o, d: sp.d ?? "", ...x } as Record<string, string>;
    const s = new URLSearchParams(Object.entries(k).filter(([, v]) => v)).toString();
    return `/escandallos${s ? "?" + s : ""}`;
  };
  const familias = [...new Set(stats.map((s) => s.familia || "Otros"))].sort((a, b) => famRank(a) - famRank(b) || a.localeCompare(b));
  // Cabecera que ordena: un clic ordena por esa columna y otro invierte el sentido
  const th = (k: Exclude<Orden, "fam">, texto: string, r = true) => {
    const on = o === k;
    const sig = on ? (asc ? "desc" : "asc") : k === "plato" ? "asc" : "desc";
    return <th className={r ? "r" : undefined} aria-sort={on ? (asc ? "ascending" : "descending") : "none"}>
      <Link className={`th-s ${on ? "on" : ""}`} href={href({ o: k, d: sig })}>{texto}{on ? <span aria-hidden="true">{asc ? "▲" : "▼"}</span> : null}</Link></th>;
  };
  const barra = (r: Fila) => {
    if (r.fc == null) return null;
    const objetivo = r.fcObjetivo / 100;
    return <span className={`fcbar fcbar-${r.est.estado}`} aria-hidden="true"><i style={{ width: `${Math.min(100, (r.fc / (objetivo * 1.8)) * 100)}%` }} /></span>;
  };

  return (
    <>
      <Kpis label="Resumen de la carta">
        <Kpi i={0} label="Food cost de la carta" value={res.fc != null ? res.fc * 100 : null} fmt="pct1" tone={fcTono} delta={diferencia(fcS)} deltaSuffix=" pp" goodWhenUp={false}
          spark={fcS} vs={`objetivo ${ctx.local.fc_objetivo} % · vs ${mesAnt}`} sub={`objetivo ${ctx.local.fc_objetivo} % · media ponderada`} hint="Pon el precio a tus platos" />
        <Kpi i={1} label="Fuera de objetivo" value={fuera} fmt="int" tone={fuera ? "bad" : "ok"} sub={`de ${plural(carta.length, "plato en carta", "platos en carta")}`} href={href({ f: "fuera", fam: "" })} />
        <Kpi i={2} label="Margen al mes" value={res.margen} fmt="eur0" delta={variacionPct(margenS)} spark={margenS} vs={`vs ${mesAnt}`} sub="con las unidades de cada plato" />
        <Kpi i={3} label="Sin precio de carta" value={sinPvp} fmt="int" tone={sinPvp ? "warn" : undefined} sub="ponlo para calcular su food cost" href={sinPvp ? href({ f: "sinpvp", fam: "" }) : null} />
      </Kpis>
      <div className="toolbar">
        <form className="searchbox" action="/escandallos" style={{ flex: "1 1 220px" }}><Icon name="search" size={18} /><input className="inp" type="search" name="q" defaultValue={sp.q} placeholder="Buscar plato" aria-label="Buscar plato" />
          {sp.f ? <input type="hidden" name="f" value={sp.f} /> : null}{fam ? <input type="hidden" name="fam" value={fam} /> : null}{o !== "fam" ? <input type="hidden" name="o" value={o} /> : null}</form>
        <SelectNav label="Ordenar por" value={o} className="inp inp-ord" options={ORDENES.map(([k, l]) => ({ v: k, l: k === "fam" ? l : `Ordenar: ${l}`, href: href({ o: k === "fam" ? "" : k, d: "" }) }))} />
      </div>
      <nav className="chips" aria-label="Filtrar platos">
        <Link className={`chip ${!sp.f && !fam ? "is-on" : ""}`} href={href({ f: "", fam: "" })}>Todos <span className="cnt">{filas.length}</span></Link>
        <Link className={`chip ${sp.f === "fuera" ? "is-on" : ""}`} href={href({ f: "fuera" })}>Fuera de objetivo <span className="cnt">{fuera}</span></Link>
        <Link className={`chip ${sp.f === "borrador" ? "is-on" : ""}`} href={href({ f: "borrador" })}>Fuera de carta</Link>
        {familias.length > 1 ? familias.map((f) => (fam === f
          ? <Link key={f} className="chip is-on" href={href({ fam: "" })} aria-label={`Quitar el filtro de ${f}`}>{f} <Icon name="close" size={14} /></Link>
          : <Link key={f} className="chip" href={href({ fam: f })}>{f}</Link>)) : null}
      </nav>
      <section className="card" data-tour="esc-list">
        <div className="card-h"><h2 className="h3">{rows.length === filas.length ? "Carta completa" : plural(rows.length, "plato", "platos")}</h2><span className="muted small">Objetivo {ctx.local.fc_objetivo} % · media ponderada {pct(res.fc)}</span></div>
        {rows.length ? <>
          <div className="tbl-wrap pg-wide"><table className="tbl tbl-clk">
            <thead><tr>{th("plato", "Plato", false)}{th("coste", "Coste")}{th("pvp", "PVP")}{th("fc", "Food cost")}{th("margen", "Margen")}{th("uds", "Uds/mes")}<th>Estado</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/escandallos/${r.id}`} className="tbl-dish tbl-go">
                  <span className="li-ic">{fotoUrl(r.foto_key) ? <img src={fotoUrl(r.foto_key)!} alt="" /> : <Icon name={r.reventa ? "tag" : r.tipo === "menu" ? "layers" : "book"} size={18} />}</span>
                  <span><b className="link">{r.name}</b><small>{r.familia}{r.reventa ? " · reventa" : r.tipo === "menu" ? " · menú" : ""}{!r.en_carta ? " · fuera de carta" : ""}{r.missing ? " · faltan precios" : ""}</small></span>
                </Link></td>
                <td className="r">{r.sinCoste ? "—" : eur(r.coste)}</td><td className="r">{eur(r.pvp)}</td>
                <td className="r"><b className={r.est.estado === "crit" ? "bad-t" : r.est.estado === "warn" ? "warn-t" : r.est.estado === "ok" ? "ok-t" : ""}>{pct(r.fc)}</b>{barra(r)}</td>
                <td className="r">{eur(r.margen)}</td><td className="r">{qty(r.ventas, 0)}</td>
                <td><span className={`tag ${tagCls(r.est.estado)}`}>{r.est.label}</span></td>
              </tr>))}</tbody>
          </table></div>
          <div className="list pg-narrow">{rows.map((r) => (
            <Link key={r.id} className="li" href={`/escandallos/${r.id}`}>
              <span className="li-ic">{fotoUrl(r.foto_key) ? <img src={fotoUrl(r.foto_key)!} alt="" /> : <Icon name={r.reventa ? "tag" : "book"} />}</span>
              <span className="li-main"><b>{r.name}</b><small>{r.familia} · coste {r.sinCoste ? "—" : eur(r.coste)} · PVP {eur(r.pvp)}</small></span>
              <span className="li-end"><span className={`tag ${tagCls(r.est.estado)}`}>{r.fc != null ? pct(r.fc) : r.pvp ? "—" : "Sin PVP"}</span><small>{r.est.label}</small></span>
            </Link>))}</div>
        </> : (
          <div className="empty"><span className="li-ic"><Icon name="book" /></span><b>{stats.length ? "Nada con ese filtro" : "Aún no tienes escandallos"}</b>
            <p>{stats.length ? "Prueba con otro filtro o quita los que tienes puestos." : "Crea tu primer plato: eliges ingredientes de tus albaranes y el coste sale solo."}</p>
            <div className="empty-actions">{stats.length ? <Link className="btn btn-2" href="/escandallos">Quitar filtros</Link> : <><Link className="btn" href="/escandallos/nuevo"><Icon name="plus" size={18} /> Nuevo plato</Link><Link className="btn btn-2" href="/carta/subir">Subir mi carta</Link></>}</div></div>
        )}
      </section>
      <div className="note"><Icon name="layers" /><p>Las elaboraciones (salsas, fondos, masas) se calculan una vez y se usan en varios platos. Si sube un ingrediente, todo se recalcula en cascada.</p></div>
      <Tour k="escandallos" show={!ctx.prefs.seen?.escandallos && rows.length > 0} steps={[{ sel: '[data-tour="esc-list"]', h: "Tus platos, con su coste al día", p: "La etiqueta dice si cada plato cumple tu food cost objetivo. Si sube un ingrediente, se recalcula solo." }]} />
    </>
  );
}
