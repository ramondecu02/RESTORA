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

export function LineChart({ values, labels, unit = "", target, color = "var(--accent)", w = 560, h = 220, fmt }: {
  values: (number | null)[]; labels: string[]; unit?: string; target?: number; color?: string; w?: number; h?: number; fmt?: (n: number) => string;
}) {
  const f = fmt ?? ((n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + (unit ? " " + unit : ""));
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const vals = values.filter((x): x is number => x != null && Number.isFinite(x));
  if (!vals.length) return <p className="muted small">Aún no hay datos suficientes.</p>;
  const lo = Math.min(...vals, target ?? Infinity), hi = Math.max(...vals, target ?? -Infinity);
  const top = niceTop(hi), bottom = lo > 0 && lo > top * 0.5 ? Math.floor(lo * 0.9) : 0;
  const X = (i: number) => pad.l + (values.length === 1 ? (w - pad.l - pad.r) / 2 : (i / (values.length - 1)) * (w - pad.l - pad.r));
  const Y = (v: number) => pad.t + (1 - (v - bottom) / (top - bottom || 1)) * (h - pad.t - pad.b);
  const pts = values.map((v, i) => (v == null ? null : [X(i), Y(v)] as const));
  const segs: string[] = [];
  let cur = "";
  pts.forEach((p) => { if (!p) { if (cur) segs.push(cur); cur = ""; } else cur += (cur ? " L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); });
  if (cur) segs.push(cur);
  const grid = [0, 0.5, 1].map((k) => bottom + (top - bottom) * k);
  const valid = pts.filter(Boolean) as (readonly [number, number])[];
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Evolución: ${values.map((v, i) => `${labels[i]} ${v == null ? "sin dato" : f(v)}`).join(", ")}`}>
      {grid.map((g) => <g key={g}><line className="grid" x1={pad.l} x2={w - pad.r} y1={Y(g)} y2={Y(g)} /><text x={pad.l - 6} y={Y(g) + 4} textAnchor="end">{g.toLocaleString("es-ES", { maximumFractionDigits: 1 })}</text></g>)}
      {target != null ? <g><line className="obj" x1={pad.l} x2={w - pad.r} y1={Y(target)} y2={Y(target)} /><text x={w - pad.r} y={Y(target) - 6} textAnchor="end">objetivo {target}{unit ? " " + unit : ""}</text></g> : null}
      {valid.length > 1 ? <path d={`${segs.join(" ")} L${valid[valid.length - 1][0]} ${h - pad.b} L${valid[0][0]} ${h - pad.b} Z`} fill={color} opacity=".08" /> : null}
      {segs.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />)}
      {pts.map((p, i) => p ? <circle key={i} className="pt" cx={p[0]} cy={p[1]} r="4.5" fill="var(--surface)" stroke={color} strokeWidth="2.5" data-tip={`${labels[i]}|${f(values[i]!)}`} /> : null)}
      {labels.map((l, i) => <text key={i} x={X(i)} y={h - 6} textAnchor="middle">{l}</text>)}
    </svg>
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
export function Scatter({ items, mV, mM, fmt }: { items: { id: string; name: string; ventas: number; margen: number; aporta: number; quad: string; quadLabel: string }[]; mV: number; mM: number; fmt: (n: number) => string }) {
  const w = 520, h = 340, pad = { l: 46, r: 14, t: 14, b: 34 };
  if (!items.length) return <p className="muted small">Añade precios de venta y unidades para ver la ingeniería de menú.</p>;
  const xmax = niceTop(Math.max(...items.map((i) => i.ventas), mV, 1));
  const ylo = Math.min(0, ...items.map((i) => i.margen));
  const ymax = niceTop(Math.max(...items.map((i) => i.margen), mM, 1));
  const X = (v: number) => pad.l + (v / xmax) * (w - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (v - ylo) / (ymax - ylo || 1)) * (h - pad.t - pad.b);
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Mapa de rentabilidad de la carta: unidades vendidas frente a margen por unidad">
      <rect x={X(mV)} y={pad.t} width={w - pad.r - X(mV)} height={Y(mM) - pad.t} fill="var(--q-estrella)" opacity=".06" />
      <rect x={pad.l} y={pad.t} width={X(mV) - pad.l} height={Y(mM) - pad.t} fill="var(--q-enigma)" opacity=".06" />
      <rect x={X(mV)} y={Y(mM)} width={w - pad.r - X(mV)} height={h - pad.b - Y(mM)} fill="var(--q-caballo)" opacity=".06" />
      <rect x={pad.l} y={Y(mM)} width={X(mV) - pad.l} height={h - pad.b - Y(mM)} fill="var(--q-perro)" opacity=".06" />
      <line className="axis" x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} />
      <line className="axis" x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} />
      <line className="obj" x1={X(mV)} x2={X(mV)} y1={pad.t} y2={h - pad.b} />
      <line className="obj" x1={pad.l} x2={w - pad.r} y1={Y(mM)} y2={Y(mM)} />
      {[0, 0.5, 1].map((k) => <text key={"x" + k} x={X(xmax * k)} y={h - pad.b + 16} textAnchor="middle">{Math.round(xmax * k)}</text>)}
      {[0, 0.5, 1].map((k) => <text key={"y" + k} x={pad.l - 6} y={Y(ylo + (ymax - ylo) * k) + 4} textAnchor="end">{(ylo + (ymax - ylo) * k).toFixed(0)} €</text>)}
      <text x={w - pad.r} y={h - 4} textAnchor="end">unidades al mes →</text>
      <text x={pad.l + 4} y={pad.t + 10}>↑ margen por unidad</text>
      {items.map((it) => (
        <a key={it.id} href={`/escandallos/${it.id}`} aria-label={`${it.name}: ${it.quadLabel}`}>
          <circle className="pt" cx={X(it.ventas)} cy={Y(it.margen)} r="8" fill={QUAD_COLOR[it.quad]} stroke="var(--surface)" strokeWidth="2"
            data-tip={`${it.name}|${it.quadLabel}|${Math.round(it.ventas)} uds · ${fmt(it.margen)} de margen|Aporta ${fmt(it.aporta)} al mes`} />
        </a>
      ))}
    </svg>
  );
}

export function Delta({ value, goodWhenUp = true, suffix = " %" }: { value: number | null; goodWhenUp?: boolean; suffix?: string }) {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) < 0.05) return <span className="delta delta-flat">=</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return <span className={`delta ${good ? "delta-good" : "delta-bad"}`}>{up ? "▲" : "▼"} {Math.abs(value).toLocaleString("es-ES", { maximumFractionDigits: 1 })}{suffix}</span>;
}
