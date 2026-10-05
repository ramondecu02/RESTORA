"use client";
// Panel «Cómo va el mes»: el mes que se mira se elige aquí y todo se mueve con él (arco del food cost, cifras con su variación
// frente al mes anterior y la gráfica de la carta). Las cifras cuentan hasta su valor y el arco se desliza: el cambio de mes se ve.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { LineChart } from "@/components/charts";
import { Gauge } from "@/components/gauge";
import type { CountFmt } from "@/components/ui/count-up";
import { Kpi } from "@/components/ui/kpi";

type Serie = (number | null)[];
export type PanelProps = {
  /** Etiqueta corta (Oct) y larga (octubre de 2026) de cada uno de los seis meses; el último es el mes en curso. */
  cortas: string[]; largas: string[];
  fc: Serie; margen: Serie; ventas: Serie; ticket: Serie; comensales: Serie;
  fcObjetivo: number; porComensal: boolean; verVentas: boolean; hayHistorico: boolean;
};

const pp = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const pasa = (a: number | null, b: number | null) => (a != null && b != null && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null);

/** Una ficha del panel: la cifra del mes elegido, su variación frente al mes anterior y la evolución de los seis meses. */
function Ficha({ label, serie, sel, fmt, prevLabel, href, hint }: { label: string; serie: Serie; sel: number; fmt: CountFmt; prevLabel: string | null; href: string | null; hint: string }) {
  const cur = serie[sel] ?? null;
  const d = pasa(cur, sel > 0 ? serie[sel - 1] ?? null : null);
  return <Kpi label={label} value={cur} fmt={fmt} delta={d} spark={serie} marca={sel} vs={prevLabel ? `vs ${prevLabel}` : null} hint={hint} href={href} />;
}

export function PanelMes({ cortas, largas, fc, margen, ventas, ticket, comensales, fcObjetivo, porComensal, verVentas, hayHistorico }: PanelProps) {
  const [sel, setSel] = useState(cortas.length - 1);
  const actual = sel === cortas.length - 1;
  const v = fc[sel] ?? null;
  const dif = v == null ? null : v - fcObjetivo;
  const antes = sel > 0 ? fc[sel - 1] ?? null : null;
  const prevLabel = sel > 0 ? largas[sel - 1].split(" de ")[0].toLowerCase() : null;
  return (
    <section className="panel" aria-labelledby="h-panel">
      <header className="panel-h">
        <div>
          <h2 id="h-panel">Cómo va el mes</h2>
          <p className="panel-sub" aria-live="polite">{largas[sel]}{actual ? " · en curso" : ""}</p>
        </div>
        <div className="seg seg-meses" role="radiogroup" aria-label="Mes que ver">
          {cortas.map((c, i) => (
            <button key={c + i} type="button" role="radio" aria-checked={i === sel} className={i === sel ? "is-on" : ""} onClick={() => setSel(i)}>{c}</button>
          ))}
        </div>
      </header>

      <div className="panel-body">
        <div className="panel-gauge">
          <Gauge value={v} target={fcObjetivo} />
          <div className="vs-chips">
            {dif != null ? <span className={`vs-chip ${dif <= 0 ? "good" : dif <= 3 ? "warn" : "bad"}`}><Icon name={dif <= 0 ? "trendDown" : "trendUp"} size={14} />{pp(Math.abs(dif))} pp {dif <= 0 ? "por debajo" : "por encima"} del objetivo</span> : <span className="vs-chip">Sin datos de este mes</span>}
            {v != null && antes != null ? <span className={`vs-chip ${v - antes <= 0 ? "good" : "bad"}`}>{v - antes <= 0 ? "▼" : "▲"} {pp(Math.abs(v - antes))} pp vs {prevLabel}</span> : null}
          </div>
        </div>
        {verVentas ? (
          <div className="tiles">
            <Ficha label="Margen" serie={margen} sel={sel} fmt="eur0" prevLabel={prevLabel} href="/ventas" hint="Importa las ventas de ese mes" />
            <Ficha label="Ventas netas" serie={ventas} sel={sel} fmt="eur0" prevLabel={prevLabel} href="/ventas" hint="Importa las ventas de ese mes" />
            <Ficha label={porComensal ? "Ticket por comensal" : "Ticket medio"} serie={ticket} sel={sel} fmt="eur" prevLabel={prevLabel} href="/ventas" hint="Importa las ventas de ese mes" />
            <Ficha label="Comensales al día" serie={comensales} sel={sel} fmt="int" prevLabel={prevLabel} href="/ventas/importar" hint="Indica los comensales al importar" />
          </div>
        ) : null}
      </div>
      {verVentas && !hayHistorico ? <p className="hint">El mes en curso se calcula con tus unidades al mes y tus costes de hoy. Importa ventas para ver la evolución real.</p> : null}

      {verVentas ? (
        <div className="panel-chart">
          <div className="panel-chart-h"><h3 className="h3">Food cost de la carta</h3><span className="muted small">pulsa un mes para verlo arriba</span></div>
          <LineChart fill values={fc} labels={cortas} unit="%" target={fcObjetivo} fmt={pct1} selected={sel} onSelect={setSel} />
        </div>
      ) : null}
    </section>
  );
}
