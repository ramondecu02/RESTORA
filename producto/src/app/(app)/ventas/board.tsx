"use client";
// Rentabilidad de la carta: todo se recalcula al momento al cambiar las unidades vendidas.
import Link from "next/link";
import { useRef, useState } from "react";
import { QUAD_COLOR, Scatter } from "@/components/charts";
import { NumInput } from "@/components/ui/num-input";
import { toastError } from "@/components/ui/toast";
import { estadoFC, foodCost, neto, revMargen, revPvp } from "@/lib/costing";
import { aporta, cuadrantes, margenUnit, QUAD_INFO, resumenCarta, type DishStat, type Quad } from "@/lib/menu";
import { eur, eur0, pct, qty } from "@/lib/format";
import { setReventa, setVentasMes } from "../escandallos/actions";

export function VentasBoard({ stats: initial, comensales, canPrecios }: { stats: DishStat[]; comensales: number | null; canPrecios: boolean }) {
  const [stats, setStats] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [prev, setPrev] = useState(initial);
  if (prev !== initial) { setPrev(initial); setStats(initial); }
  const res = resumenCarta(stats);
  const q = cuadrantes(stats);
  const byId = new Map(q.items.map((i) => [i.id, i]));
  const rows = [...stats].filter((s) => s.pvp).sort((a, b) => aporta(b) - aporta(a));
  const best = rows[0], worst = rows[rows.length - 1];
  const reventa = stats.filter((s) => s.reventa);
  const save = (id: string, f: () => Promise<{ ok: boolean; error?: string }>) => {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => { const r = await f(); if (!r.ok) toastError(r.error ?? "Error"); }, 600);
  };
  const setUds = (s: DishStat, n: number | null) => {
    const v = Math.max(0, Math.round(n ?? 0));
    setStats((xs) => xs.map((x) => (x.id === s.id ? { ...x, ventas: v } : x)));
    setFlash(s.id); setTimeout(() => setFlash(null), 900);
    save("u" + s.id, () => setVentasMes(s.id, v));
  };
  const setRev = (s: DishStat, patch: { coste?: number | null; margen?: number | null; pvp?: number | null }) => {
    const coste = patch.coste !== undefined ? patch.coste ?? 0 : s.coste;
    let pvp = s.pvp;
    if (patch.pvp !== undefined) pvp = patch.pvp;
    else if (patch.margen != null) pvp = Math.round(revPvp(coste, patch.margen, s.iva) * 100) / 100;
    else if (patch.coste !== undefined && s.pvp) pvp = Math.round(revPvp(coste, revMargen(s.coste, s.pvp, s.iva), s.iva) * 100) / 100;
    setStats((xs) => xs.map((x) => (x.id === s.id ? { ...x, coste, pvp } : x)));
    save("r" + s.id, () => setReventa(s.id, { coste: patch.coste !== undefined ? coste : null, margen: pvp ? Math.round(revMargen(coste, pvp, s.iva)) : null, pvp }));
  };
  const ticketCom = comensales && res.ingresos ? res.ingresos / (comensales * 30) : null;

  if (!stats.length) return <div className="card"><div className="empty"><b>Sin platos en carta</b><p>Crea tus escandallos y ponles precio para ver su rentabilidad.</p><div className="empty-actions"><Link className="btn" href="/escandallos/nuevo">Nuevo plato</Link></div></div></div>;
  return (
    <>
      <div className="stats">
        <div className="stat"><span className="stat-k">Margen del mes</span><span className="stat-v">{eur0(res.margen)}</span><span className="stat-s">venta sin IVA menos coste</span></div>
        <div className="stat"><span className="stat-k">Unidades servidas</span><span className="stat-v">{qty(res.unidades, 0)}</span><span className="stat-s">al mes</span></div>
        <div className="stat"><span className="stat-k">{ticketCom ? "Ticket por comensal" : "Ticket medio"}</span><span className="stat-v">{eur(ticketCom ?? res.ticketUnidad)}</span><span className="stat-s">{ticketCom ? `${comensales} comensales/día · sin IVA` : "por unidad vendida · sin IVA"}</span></div>
        <div className="stat"><span className="stat-k">Food cost ponderado</span><span className="stat-v">{pct(res.fc)}</span><span className="stat-s">según lo que más vendes</span></div>
      </div>
      <div className="two">
        <section className="card" aria-labelledby="h-map">
          <div className="card-h"><h2 className="h3" id="h-map">Dónde está el dinero de tu carta</h2><span className="muted small">Medias: {qty(q.mV, 0)} uds y {eur(q.mM)} de margen</span></div>
          <Scatter items={q.items.map((i) => ({ ...i, quadLabel: QUAD_INFO[i.quad].label }))} mV={q.mV} mM={q.mM} fmt={(n) => eur(n)} />
          <div className="qlegend">{(Object.keys(QUAD_INFO) as Quad[]).map((k) => (
            <div className="ql-i" key={k}><i style={{ background: QUAD_COLOR[k] }} /><span><b>{QUAD_INFO[k].label}</b><span>{QUAD_INFO[k].consejo}</span></span></div>))}</div>
        </section>
        <section className="card" aria-labelledby="h-lect">
          <div className="card-h"><h2 className="h3" id="h-lect">Lectura rápida</h2></div>
          {best ? <div className="note note-ok"><p><b>{best.name}</b> es lo que más te aporta: {eur0(aporta(best))} al mes, el {res.margen ? pct(aporta(best) / res.margen, 0) : "—"} del margen total.</p></div> : null}
          {worst && worst !== best ? <div className={`note ${aporta(worst) < 0 ? "note-bad" : "note-warn"}`}><p><b>{worst.name}</b> es lo que menos aporta: {eur0(aporta(worst))} al mes. {QUAD_INFO[byId.get(worst.id)?.quad ?? "perro"].consejo}</p></div> : null}
          <dl className="cfg">
            <div><dt>Margen total al mes</dt><dd>{eur0(res.margen)}</dd></div>
            <div><dt>Productos en la carta</dt><dd>{stats.length}</dd></div>
            <div><dt>Estrellas</dt><dd>{q.items.filter((i) => i.quad === "estrella").length}</dd></div>
            <div><dt>Para revisar (perros)</dt><dd>{q.items.filter((i) => i.quad === "perro").length}</dd></div>
          </dl>
        </section>
      </div>
      <section className="card" aria-labelledby="h-ap">
        <div className="card-h"><h2 className="h3" id="h-ap">Aportación al margen</h2><span className="muted small">Cambia las unidades y todo se recalcula</span></div>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Plato</th><th>Tipo</th><th className="r">Uds/mes</th><th className="r">Margen</th><th className="r">Food cost</th><th className="r">Aporta</th></tr></thead>
          <tbody>{rows.map((s) => {
            const it = byId.get(s.id); const fc = foodCost(s.coste, s.pvp, s.iva); const est = estadoFC(fc, s.fcObjetivo);
            return (
              <tr key={s.id} className={flash === s.id ? "flash" : ""}>
                <td><Link className="link" href={`/escandallos/${s.id}`}>{s.name}</Link><div className="xs muted">{s.familia}</div></td>
                <td>{it ? <span className="tag" style={{ background: "transparent", boxShadow: `inset 0 0 0 1.5px ${QUAD_COLOR[it.quad]}`, color: "var(--ink)" }}>{QUAD_INFO[it.quad].label}</span> : null}</td>
                <td className="r"><NumInput className="inp inp-xs inp-num" decimals={0} value={s.ventas} onValue={(n) => setUds(s, n)} aria-label={`Unidades al mes de ${s.name}`} /></td>
                <td className="r">{eur(margenUnit(s))}</td>
                <td className="r"><span className={est.estado === "crit" ? "bad-t" : est.estado === "warn" ? "warn-t" : "ok-t"}>{pct(fc)}</span></td>
                <td className="r"><b className={aporta(s) < 0 ? "bad-t" : ""}>{eur0(aporta(s))}</b></td>
              </tr>);
          })}</tbody>
        </table></div>
      </section>
      {reventa.length ? (
        <section className="card" aria-labelledby="h-rev">
          <div className="card-h"><h2 className="h3" id="h-rev">Bebidas y reventa · PVP por margen</h2><span className="muted small">Se guarda al momento</span></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Producto</th><th className="r">Compra</th><th className="r">Margen %</th><th className="r">PVP</th><th className="r">Beneficio</th><th className="r">Aporta/mes</th></tr></thead>
            <tbody>{reventa.map((s) => (
              <tr key={s.id}>
                <td><Link className="link" href={`/escandallos/${s.id}`}>{s.name}</Link><div className="xs muted">{s.familia}</div></td>
                <td className="r"><NumInput className="inp inp-xs inp-num" decimals={2} value={s.coste} disabled={!canPrecios} onValue={(n) => setRev(s, { coste: n })} aria-label={`Precio de compra de ${s.name}`} /></td>
                <td className="r"><NumInput className="inp inp-xs inp-num" decimals={0} value={s.pvp ? revMargen(s.coste, s.pvp, s.iva) : null} disabled={!canPrecios} onValue={(n) => n != null && setRev(s, { margen: Math.min(99, Math.max(0, n)) })} aria-label={`Margen de ${s.name}`} /></td>
                <td className="r"><NumInput className="inp inp-xs inp-num" decimals={2} value={s.pvp} disabled={!canPrecios} onValue={(n) => setRev(s, { pvp: n })} aria-label={`PVP de ${s.name}`} /></td>
                <td className="r">{s.pvp ? eur(neto(s.pvp, s.iva) - s.coste) : "—"}</td>
                <td className="r"><b>{eur0(aporta(s))}</b></td>
              </tr>))}</tbody>
          </table></div>
        </section>
      ) : null}
    </>
  );
}
