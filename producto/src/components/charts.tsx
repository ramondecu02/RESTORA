// Gráficos en SVG, sin dependencias. Los tooltips usan data-tip="Título|detalle" (ver TipLayer).
import Link from "next/link";
import type { ReactNode } from "react";

const niceTop = (max: number) => {
  const steps = [0.1, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000, 100000];
  for (const s of steps) { const t = Math.ceil((max * 1.1) / s) * s; if (t / s <= 5) return t; }
  return Math.ceil(max * 1.1);
};

export function Sparkline({ values, color = "var(--accent)", w = 120, h = 30, label }: { values: number[]; color?: string; w?: number; h?: number; label?: string }) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" />;
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * (w - 4) + 2, h - 3 - ((x - min) / span) * (h - 8)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={`${d} L${last[0]} ${h} L${pts[0][0]} ${h} Z`} fill={color} opacity=".12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

/** Semicírculo de food cost con marca del objetivo. */
export function Gauge({ value, max = 48, target, caption }: { value: number | null; max?: number; target: number; caption?: string }) {
  const r = 95, cx = 115, cy = 118;
  const ang = (x: number) => Math.PI * (1 - Math.min(1, Math.max(0, x / max)));
  const pt = (a: number, rr = r) => [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  const v = value ?? 0;
  const [x1, y1] = pt(Math.PI), [x2, y2] = pt(ang(v));
  const ok = value != null && v <= target;
  const warn = value != null && v > target && v <= target + 3;
  const color = value == null ? "var(--line-2)" : ok ? "var(--ok)" : warn ? "var(--warn-dot)" : "var(--bad)";
  const [tx1, ty1] = pt(ang(target), r - 14), [tx2, ty2] = pt(ang(target), r + 14);
  const large = 0;
  return (
    <div className="gauge">
      <svg viewBox="0 0 230 140" role="img" aria-label={value == null ? "Food cost sin datos" : `Food cost ${v.toFixed(1)} %, objetivo ${target} %`}>
        <path d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--sunk)" strokeWidth="16" strokeLinecap="round" />
        {value != null && v > 0 ? <path d={`M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" /> : null}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--ink)" strokeWidth="3" data-tip={`Objetivo|${target} %`} />
        <text x={cx} y={cy - 18} textAnchor="middle" style={{ fontSize: 34, fontWeight: 700, fill: "var(--ink)" }}>{value == null ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %"}</text>
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 12, fill: "var(--muted)" }}>food cost · objetivo {target} %</text>
      </svg>
      {caption ? <p className="gauge-cap">{caption}</p> : null}
    </div>
  );
}

/** Línea con etiquetas en HTML: el trazo se estira al ancho disponible y el texto no se encoge nunca. */
export function LineChart({ values, labels, unit = "", target, color = "var(--accent)", h = 220, fill = false, fmt, maxLabels = 6 }: {
  values: (number | null)[]; labels: string[]; unit?: string; target?: number; color?: string; w?: number; h?: number; fill?: boolean; fmt?: (n: number) => string; maxLabels?: number;
}) {
  const f = fmt ?? ((n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + (unit ? " " + unit : ""));
  const vals = values.filter((x): x is number => x != null && Number.isFinite(x));
  if (!vals.length) return <p className="muted small">Aún no hay datos suficientes.</p>;
  const lo = Math.min(...vals, target ?? Infinity), hi = Math.max(...vals, target ?? -Infinity);
  const top = niceTop(hi), bottom = lo > 0 && lo > top * 0.5 ? Math.floor(lo * 0.9) : 0;
  const n = values.length;
  const X = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const Y = (v: number) => (1 - (v - bottom) / (top - bottom || 1)) * 100;
  const pts = values.map((v, i) => (v == null || !Number.isFinite(v) ? null : ([X(i), Y(v)] as const)));
  const segs: string[] = [];
  let cur = "";
  pts.forEach((p) => { if (!p) { if (cur) segs.push(cur); cur = ""; } else cur += (cur ? " L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2); });
  if (cur) segs.push(cur);
  const grid = [0, 0.5, 1].map((k) => bottom + (top - bottom) * k);
  const valid = pts.filter(Boolean) as (readonly [number, number])[];
  const step = Math.max(1, Math.ceil(n / Math.max(2, maxLabels)));
  const showLabel = (i: number) => i === n - 1 || (i % step === 0 && n - 1 - i >= step / 2);
  const num = (g: number) => g.toLocaleString("es-ES", { maximumFractionDigits: 1 });
  return (
    <div className={fill ? "lc lc-fill" : "lc"} style={{ height: fill ? undefined : h, minHeight: fill ? h : undefined, ["--c" as string]: color }} role="img" aria-label={`Evolución: ${values.map((v, i) => `${labels[i]} ${v == null ? "sin dato" : f(v)}`).join(", ")}`}>
      <div className="lc-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {grid.map((g) => <line key={g} className="grid" x1="0" x2="100" y1={Y(g)} y2={Y(g)} vectorEffect="non-scaling-stroke" />)}
          {target != null ? <line className="obj" x1="0" x2="100" y1={Y(target)} y2={Y(target)} vectorEffect="non-scaling-stroke" /> : null}
          {valid.length > 1 ? <path d={`${segs.join(" ")} L${valid[valid.length - 1][0]} 100 L${valid[0][0]} 100 Z`} fill={color} opacity=".08" /> : null}
          {segs.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
        </svg>
        {grid.map((g) => <span key={g} className="lc-y" style={{ top: `${Y(g)}%` }} aria-hidden="true">{num(g)}</span>)}
        {target != null ? <span className="lc-obj" style={{ top: `${Y(target)}%` }} aria-hidden="true">objetivo {num(target)}{unit ? " " + unit : ""}</span> : null}
        {pts.map((p, i) => (p ? <span key={i} className="lc-pt" style={{ left: `${p[0]}%`, top: `${p[1]}%` }} data-tip={`${labels[i]}|${f(values[i]!)}`} aria-hidden="true" /> : null))}
      </div>
      <div className="lc-x" aria-hidden="true">{labels.map((l, i) => (showLabel(i) ? <span key={i} style={{ left: `${X(i)}%` }}>{l}</span> : null))}</div>
    </div>
  );
}

export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-6)", "var(--chart-8)", "var(--chart-5)", "var(--chart-7)"];

export function Donut({ items, fmt, centerTop, centerSub, label }: { items: { label: string; value: number; color?: string }[]; fmt: (n: number) => string; centerTop: string; centerSub: string; label: string }) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  const R = 62, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 170 170" role="img" aria-label={label}>
        <circle cx="85" cy="85" r={R} fill="none" stroke="var(--sunk)" strokeWidth="22" />
        {total > 0 ? items.map((it, i) => {
          const v = Math.max(0, it.value), len = (v / total) * C, off = acc;
          acc += len;
          return <circle key={it.label} className="seg" cx="85" cy="85" r={R} fill="none" stroke={it.color ?? PALETTE[i % PALETTE.length]} strokeWidth="22"
            strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 85 85)" data-tip={`${it.label}|${fmt(v)} · ${((v / total) * 100).toFixed(0)} %`} />;
        }) : null}
        <text x="85" y="84" textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: "var(--ink)" }}>{centerTop}</text>
        <text x="85" y="103" textAnchor="middle" style={{ fontSize: 11.5, fill: "var(--muted)" }}>{centerSub}</text>
      </svg>
      <div className="donut-legend">
        {items.map((it, i) => (
          <div className="dl-i" key={it.label} data-tip={`${it.label}|${fmt(it.value)} · ${total ? ((it.value / total) * 100).toFixed(0) : 0} %`}>
            <i style={{ background: it.color ?? PALETTE[i % PALETTE.length] }} /><span>{it.label}</span><b>{fmt(it.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarsH({ rows, fmt }: { rows: { label: string; value: number; href?: string; color?: string; tip?: string }[]; fmt: (n: number) => string }) {
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="barh">
      {rows.map((r, i) => {
        const inner: ReactNode = <>
          <span className="barh-l">{r.label}</span>
          <span className="barh-t"><span className="barh-f" style={{ display: "block", width: `${Math.max(3, (Math.abs(r.value) / max) * 100)}%`, background: r.value < 0 ? "var(--bad)" : r.color ?? PALETTE[i % PALETTE.length] }} /></span>
          <span className="barh-v">{fmt(r.value)}</span>
        </>;
        return r.href
          ? <Link key={r.label + i} href={r.href} className="barh-row" data-tip={r.tip ?? `${r.label}|${fmt(r.value)}`}>{inner}</Link>
          : <div key={r.label + i} className="barh-row" data-tip={r.tip ?? `${r.label}|${fmt(r.value)}`}>{inner}</div>;
      })}
    </div>
  );
}

export const QUAD_COLOR: Record<string, string> = { estrella: "var(--q-estrella)", caballo: "var(--q-caballo)", enigma: "var(--q-enigma)", perro: "var(--q-perro)" };

/** Ingeniería de menú: unidades (x) frente a margen por unidad (y), con las medias como cruz. */
export function Scatter({ items, mV, mM, fmt, h = 320 }: { items: { id: string; name: string; ventas: number; margen: number; aporta: number; quad: string; quadLabel: string }[]; mV: number; mM: number; fmt: (n: number) => string; h?: number }) {
  if (!items.length) return <p className="muted small">Añade precios de venta y unidades para ver la ingeniería de menú.</p>;
  const xmax = niceTop(Math.max(...items.map((i) => i.ventas), mV, 1));
  const ylo = Math.min(0, ...items.map((i) => i.margen));
  const ymax = niceTop(Math.max(...items.map((i) => i.margen), mM, 1));
  const X = (v: number) => (v / xmax) * 100;
  const Y = (v: number) => (1 - (v - ylo) / (ymax - ylo || 1)) * 100;
  const mx = X(mV), my = Y(mM);
  const q = (l: number, t: number, w: number, hh: number, c: string) => <span className="sc-q" style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${hh}%`, background: c }} />;
  return (
    <div className="sc" style={{ height: h }} role="img" aria-label="Mapa de rentabilidad de la carta: unidades vendidas frente a margen por unidad">
      <div className="sc-plot">
        {q(mx, 0, 100 - mx, my, "var(--q-estrella)")}{q(0, 0, mx, my, "var(--q-enigma)")}{q(mx, my, 100 - mx, 100 - my, "var(--q-caballo)")}{q(0, my, mx, 100 - my, "var(--q-perro)")}
        <span className="sc-mx" style={{ left: `${mx}%` }} /><span className="sc-my" style={{ top: `${my}%` }} />
        {[0, 0.5, 1].map((k) => <span key={"y" + k} className="lc-y" style={{ top: `${Y(ylo + (ymax - ylo) * k)}%` }} aria-hidden="true">{(ylo + (ymax - ylo) * k).toFixed(0)} €</span>)}
        {[0, 0.5, 1].map((k) => <span key={"x" + k} className="sc-xl" style={{ left: `${X(xmax * k)}%` }} aria-hidden="true">{Math.round(xmax * k)}</span>)}
        <span className="sc-ax sc-ax-y" aria-hidden="true">↑ margen por unidad</span>
        <span className="sc-ax sc-ax-x" aria-hidden="true">unidades al mes →</span>
        {items.map((it) => (
          <Link key={it.id} href={`/escandallos/${it.id}`} className="sc-pt" aria-label={`${it.name}: ${it.quadLabel}`} style={{ left: `${X(it.ventas)}%`, top: `${Y(it.margen)}%`, background: QUAD_COLOR[it.quad] }}
            data-tip={`${it.name}|${it.quadLabel}|${Math.round(it.ventas)} uds · ${fmt(it.margen)} de margen|Aporta ${fmt(it.aporta)} al mes`} />
        ))}
      </div>
    </div>
  );
}

export function Delta({ value, goodWhenUp = true, suffix = " %" }: { value: number | null; goodWhenUp?: boolean; suffix?: string }) {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) < 0.05) return <span className="delta delta-flat">=</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return <span className={`delta ${good ? "delta-good" : "delta-bad"}`}>{up ? "▲" : "▼"} {Math.abs(value).toLocaleString("es-ES", { maximumFractionDigits: 1 })}{suffix}</span>;
}
