import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { EscNav } from "@/components/subnav";
import { Tour } from "@/components/shell/tour";
import { withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { dishStats } from "@/server/domain/carta";
import { estadoFC, foodCost, neto } from "@/lib/costing";
import { resumenCarta } from "@/lib/menu";
import { famRank } from "@/lib/briefing";
import { fotoUrl } from "@/lib/fotos";
import { eur, pct, qty, plural } from "@/lib/format";

export const metadata = { title: "Escandallos" };

export default async function Escandallos({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const { stats } = await withTenant(ctx.tenantId, (c) => dishStats(c, ctx.local));
  const q = (sp.q ?? "").toLowerCase().trim();
  const rows = stats.map((s) => {
    const fc = foodCost(s.coste, s.pvp, ctx.local.iva_venta);
    return { ...s, fc, est: estadoFC(fc, s.fcObjetivo), margen: s.pvp ? neto(s.pvp, ctx.local.iva_venta) - s.coste : null };
  }).filter((r) => (!q || r.name.toLowerCase().includes(q)) && (sp.f !== "fuera" || r.est.estado === "warn" || r.est.estado === "crit") && (sp.f !== "borrador" || !r.en_carta))
    .sort((a, b) => famRank(a.familia) - famRank(b.familia) || a.familia.localeCompare(b.familia) || a.name.localeCompare(b.name));
  const res = resumenCarta(stats.filter((s) => s.en_carta));
  const fuera = stats.filter((s) => { const e = estadoFC(foodCost(s.coste, s.pvp, ctx.local.iva_venta), s.fcObjetivo).estado; return s.en_carta && (e === "warn" || e === "crit"); }).length;
  const sinPvp = stats.filter((s) => s.en_carta && !s.pvp).length;
  const tagCls = (e: string) => (e === "ok" ? "tag-ok" : e === "warn" ? "tag-warn" : e === "crit" ? "tag-bad" : "tag-none");
  const f = (k?: string) => `/escandallos${k ? `?f=${k}` : ""}`;
  return (
    <Screen title="Escandallos" sub="El coste real de cada plato, ingrediente a ingrediente" fab
      actions={<Link className="btn btn-2 btn-sm only-wide" href="/escandallos/nuevo"><Icon name="plus" size={18} /> Nuevo plato</Link>}>
      <EscNav cur="platos" />
      <div className="stats">
        <div className="stat"><span className="stat-k">Food cost carta</span><span className="stat-v">{pct(res.fc)}</span><span className="stat-s">media ponderada por ventas · objetivo {ctx.local.fc_objetivo} %</span></div>
        <div className={`stat ${fuera ? "bad" : "ok"}`}><span className="stat-k">Fuera de objetivo</span><span className="stat-v">{fuera}</span><span className="stat-s">{plural(stats.filter((s) => s.en_carta).length, "plato en carta", "platos en carta")}</span></div>
        <div className="stat"><span className="stat-k">Margen al mes</span><span className="stat-v">{eur(res.margen, 0)}</span><span className="stat-s">con las unidades de cada plato</span></div>
        <div className="stat"><span className="stat-k">Sin precio de carta</span><span className="stat-v">{sinPvp}</span><span className="stat-s">ponlo para calcular su food cost</span></div>
      </div>
      <div className="toolbar">
        <form className="searchbox" action="/escandallos" style={{ flex: "1 1 220px" }}><Icon name="search" size={18} /><input className="inp" type="search" name="q" defaultValue={sp.q} placeholder="Buscar plato" aria-label="Buscar plato" /></form>
        <div className="chips" style={{ margin: 0, padding: 0 }}>
          <Link className={`chip ${!sp.f ? "is-on" : ""}`} href={f()}>Todos</Link>
          <Link className={`chip ${sp.f === "fuera" ? "is-on" : ""}`} href={f("fuera")}>Fuera de objetivo <span className="cnt">{fuera}</span></Link>
          <Link className={`chip ${sp.f === "borrador" ? "is-on" : ""}`} href={f("borrador")}>Fuera de carta</Link>
        </div>
      </div>
      <section className="card" data-tour="esc-list">
        <div className="card-h"><h2 className="h3">Carta completa</h2><span className="muted small">Objetivo {ctx.local.fc_objetivo} % · media ponderada {pct(res.fc)}</span></div>
        {rows.length ? <>
          <div className="tbl-wrap only-wide"><table className="tbl">
            <thead><tr><th>Plato</th><th className="r">Coste</th><th className="r">PVP</th><th className="r">Food cost</th><th className="r">Margen</th><th className="r">Uds/mes</th><th>Estado</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/escandallos/${r.id}`} className="tbl-dish" style={{ color: "inherit", textDecoration: "none" }}>
                  <span className="li-ic">{fotoUrl(r.foto_key) ? <img src={fotoUrl(r.foto_key)!} alt="" /> : <Icon name={r.reventa ? "tag" : r.tipo === "menu" ? "layers" : "book"} size={18} />}</span>
                  <span><b className="link">{r.name}</b><small>{r.familia}{r.reventa ? " · reventa" : r.tipo === "menu" ? " · menú" : ""}{!r.en_carta ? " · fuera de carta" : ""}{r.missing ? " · faltan precios" : ""}</small></span>
                </Link></td>
                <td className="r">{eur(r.coste)}</td><td className="r">{eur(r.pvp)}</td>
                <td className="r"><b className={r.est.estado === "crit" ? "bad-t" : r.est.estado === "warn" ? "warn-t" : r.est.estado === "ok" ? "ok-t" : ""}>{pct(r.fc)}</b></td>
                <td className="r">{eur(r.margen)}</td><td className="r">{qty(r.ventas, 0)}</td>
                <td><span className={`tag ${tagCls(r.est.estado)}`}>{r.est.label}</span></td>
              </tr>))}</tbody>
          </table></div>
          <div className="list only-narrow">{rows.map((r) => (
            <Link key={r.id} className="li" href={`/escandallos/${r.id}`}>
              <span className="li-ic">{fotoUrl(r.foto_key) ? <img src={fotoUrl(r.foto_key)!} alt="" /> : <Icon name={r.reventa ? "tag" : "book"} />}</span>
              <span className="li-main"><b>{r.name}</b><small>{r.familia} · coste {eur(r.coste)} · PVP {eur(r.pvp)}</small></span>
              <span className="li-end"><span className={`tag ${tagCls(r.est.estado)}`}>{r.fc != null ? pct(r.fc) : "Sin PVP"}</span><small>{r.est.label}</small></span>
            </Link>))}</div>
        </> : (
          <div className="empty"><span className="li-ic"><Icon name="book" /></span><b>{stats.length ? "Nada con ese filtro" : "Aún no tienes escandallos"}</b>
            <p>{stats.length ? "Prueba con otro filtro." : "Crea tu primer plato: eliges ingredientes de tus albaranes y el coste sale solo."}</p>
            <div className="empty-actions"><Link className="btn" href="/escandallos/nuevo"><Icon name="plus" size={18} /> Nuevo plato</Link><Link className="btn btn-2" href="/carta/subir">Subir mi carta</Link></div></div>
        )}
      </section>
      <div className="note"><Icon name="layers" /><p>Las elaboraciones (salsas, fondos, masas) se calculan una vez y se usan en varios platos. Si sube un ingrediente, todo se recalcula en cascada.</p></div>
      <Tour k="escandallos" show={!ctx.prefs.seen?.escandallos && rows.length > 0} steps={[{ sel: '[data-tour="esc-list"]', h: "Tus platos, con su coste al día", p: "La etiqueta dice si cada plato cumple tu food cost objetivo. Si sube un ingrediente, se recalcula solo." }]} />
    </Screen>
  );
}
