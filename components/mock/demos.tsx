import { AlertTriangle, ArrowRight, Check, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import type { FuncionalidadesCopy } from "@/lib/copy/funcionalidades";

type Module = FuncionalidadesCopy["modules"][number];
export type Demo = Module["demo"];
// Panel chrome (the labels the product UI itself would show) is localised too.
export type Chrome = FuncionalidadesCopy["chrome"];

/* ------------------------------- primitives ------------------------------ */

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hair)",
  borderRadius: 18,
  boxShadow: "0 34px 80px -50px rgba(20,32,26,0.4)",
  overflow: "hidden",
};

const head: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 18px",
  borderBottom: "1px solid var(--hair)",
  background: "color-mix(in srgb, var(--panel) 55%, var(--surface))",
};

const headLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

function Delta({ value, up }: { value: string; up?: boolean }) {
  const color = up ? "var(--down)" : "var(--up)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11.5,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
        borderRadius: 999,
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {up ? <TrendingUp size={11} strokeWidth={2.4} /> : <TrendingDown size={11} strokeWidth={2.4} />}
      {value}
    </span>
  );
}

function AlertStrip({ text, action }: { text: string; action?: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 11,
        alignItems: "flex-start",
        padding: "14px 18px",
        background: "color-mix(in srgb, var(--earth) 12%, var(--surface))",
        borderTop: "1px solid color-mix(in srgb, var(--earth) 30%, var(--hair))",
      }}
    >
      <AlertTriangle size={16} strokeWidth={2} color="var(--earth)" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>{text}</p>
        {action && (
          <span style={{ display: "inline-block", marginTop: 6, fontSize: 12.5, fontWeight: 700, color: "var(--brand)" }}>
            {action} →
          </span>
        )}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 220;
  const h = 52;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="color-mix(in srgb, var(--accent) 14%, transparent)" />
      <path className="line-draw" pathLength={1} d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.2" fill="var(--accent)" />
    </svg>
  );
}

/* --------------------------------- demos --------------------------------- */

function Escandallo({ d, t }: { d: Extract<Demo, { kind: "escandallo" }>; t: Chrome }) {
  return (
    <div style={card}>
      <div style={head}>
        <span style={headLabel}>{t.escandallo}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{d.dish}</span>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {d.rows.map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "7px 0", fontSize: 13.5 }}>
            <span style={{ whiteSpace: "nowrap" }}>{r.name}</span>
            <span aria-hidden="true" style={{ flex: 1, borderBottom: "1px dotted var(--border)", transform: "translateY(-3px)", minWidth: 12 }} />
            <span className="mono" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.qty}</span>
            <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", width: 62, textAlign: "right", whiteSpace: "nowrap" }}>{r.cost}</span>
            {"delta" in r && r.delta ? <Delta value={r.delta} up={"up" in r ? r.up : undefined} /> : <span style={{ width: 0 }} />}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", borderTop: "1px solid var(--hair)" }}>
        {d.totals.map((t, i) => (
          <div
            key={t.label}
            style={{
              padding: "14px 16px",
              borderLeft: i === 0 ? "none" : "1px solid var(--hair)",
              background: "strong" in t && t.strong ? "var(--brand-soft)" : undefined,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{t.label}</div>
            <div
              className="mono"
              style={{
                fontSize: 19,
                fontWeight: 700,
                marginTop: 5,
                fontVariantNumeric: "tabular-nums",
                color: "good" in t && t.good ? "var(--up)" : "var(--ink)",
              }}
            >
              {t.value}
            </div>
          </div>
        ))}
      </div>
      <AlertStrip text={d.alert} action={d.action} />
    </div>
  );
}

function Compra({ d, t }: { d: Extract<Demo, { kind: "compra" }>; t: Chrome }) {
  return (
    <div style={card}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{d.supplier}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{d.date}</span>
      </div>
      <div style={{ padding: "6px 18px 14px" }}>
        {d.lines.map((l) => (
          <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--hair)", fontSize: 13.5, flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 130px", minWidth: 0 }}>{l.name}</span>
            <span className="mono" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{l.qty}</span>
            <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{l.price}</span>
            <Delta value={l.delta} up={"up" in l ? l.up : undefined} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, fontSize: 13.5 }}>
          <span style={{ color: "var(--muted)" }}>{t.total}</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{d.total}</span>
        </div>
      </div>
      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--hair)", background: "color-mix(in srgb, var(--panel) 45%, var(--surface))" }}>
        <div style={{ ...headLabel, marginBottom: 8 }}>{d.trendLabel}</div>
        <Sparkline values={d.trend} />
      </div>
      <AlertStrip text={d.note} />
    </div>
  );
}

function Proveedores({ d, t }: { d: Extract<Demo, { kind: "proveedores" }>; t: Chrome }) {
  return (
    <div style={card}>
      <div style={head}>
        <span style={headLabel}>{t.comparativa}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{d.product}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {d.options.map((o, i) => {
          const best = "best" in o && o.best;
          return (
            <div
              key={o.name}
              style={{
                padding: "18px",
                borderLeft: i === 0 ? "none" : "1px solid var(--hair)",
                background: best ? "var(--brand-soft)" : undefined,
                position: "relative",
              }}
            >
              {best && (
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} strokeWidth={3} /> {t.mejor}
                </span>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, maxWidth: "18ch", lineHeight: 1.35 }}>{o.name}</div>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{o.price}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{o.last}</span>
                <Delta value={o.delta} up={"up" in o ? o.up : undefined} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderTop: "1px solid var(--hair)" }}>
        <span style={{ ...headLabel }}>{d.verdictLabel}</span>
        <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--brand)", fontVariantNumeric: "tabular-nums" }}>{d.verdict}</span>
      </div>
      <AlertStrip text={d.note} />
    </div>
  );
}

function Inventario({ d, t }: { d: Extract<Demo, { kind: "inventario" }>; t: Chrome }) {
  return (
    <div style={card}>
      <div style={head}>
        <span style={headLabel}>{t.inventario}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Stock · consumo · cobertura</span>
      </div>
      <div style={{ padding: "6px 18px 14px" }}>
        {d.items.map((it) => {
          const low = it.status === "bajo";
          return (
            <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--hair)", fontSize: 13.5, flexWrap: "wrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: low ? "var(--down)" : "var(--up)", flexShrink: 0 }} />
              <span style={{ flex: "1 1 120px", fontWeight: low ? 700 : 400, minWidth: 0 }}>{it.name}</span>
              <span className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>{it.stock}</span>
              <span className="mono" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{it.use}</span>
              <span
                className="mono"
                style={{
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: low ? "var(--down)" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {it.days}
              </span>
            </div>
          );
        })}
      </div>
      <AlertStrip text={d.alert} action={d.action} />
    </div>
  );
}

function Rentabilidad({ d, t }: { d: Extract<Demo, { kind: "rentabilidad" }>; t: Chrome }) {
  return (
    <div style={card}>
      <div style={head}>
        <span style={headLabel}>{t.rentabilidad}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(198px, 1fr))" }}>
        {d.cards.map((c, i) => (
          <div key={c.dish} style={{ padding: 18, borderLeft: i === 0 ? "none" : "1px solid var(--hair)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{c.dish}</div>
            <span
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
                color: c.good ? "var(--up)" : "var(--down)",
                background: c.good ? "color-mix(in srgb, var(--up) 12%, transparent)" : "color-mix(in srgb, var(--down) 12%, transparent)",
                border: `1px solid ${c.good ? "color-mix(in srgb, var(--up) 28%, transparent)" : "color-mix(in srgb, var(--down) 28%, transparent)"}`,
              }}
            >
              {c.verdict}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{t.foodCost}</span>
                <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: c.good ? "var(--up)" : "var(--down)" }}>{c.foodCost}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{t.margen}</span>
                <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.margin}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{t.ventas}</span>
                <span className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>{c.sales}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AlertStrip text={d.note} />
    </div>
  );
}

function Insight({ d }: { d: Extract<Demo, { kind: "insight" }> }) {
  return (
    <div style={{ ...card, background: "var(--brand)", border: "1px solid var(--brand)", color: "var(--on-brand)" }}>
      <div style={{ padding: "20px 20px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Lightbulb size={16} strokeWidth={2} color="#8fd3b0" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>{d.tag}</span>
        </div>
        <p className="display-serif" style={{ fontSize: "clamp(20px, 2.4vw, 26px)", margin: "14px 0 0", color: "#fff", maxWidth: "22ch" }}>{d.headline}</p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", margin: "12px 0 0", lineHeight: 1.6, maxWidth: "46ch" }}>{d.detail}</p>
        <div style={{ display: "flex", gap: 28, marginTop: 20, flexWrap: "wrap" }}>
          {d.stats.map((s) => (
            <div key={s.label}>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.16)" }}>
        {d.actions.map((a) => (
          <span
            key={a}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "7px 13px" }}
          >
            {a}
            <ArrowRight size={13} strokeWidth={2.2} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- dispatcher ------------------------------ */

export function ModuleDemo({ demo, chrome }: { demo: Demo; chrome: Chrome }) {
  switch (demo.kind) {
    case "escandallo":
      return <Escandallo d={demo} t={chrome} />;
    case "compra":
      return <Compra d={demo} t={chrome} />;
    case "proveedores":
      return <Proveedores d={demo} t={chrome} />;
    case "inventario":
      return <Inventario d={demo} t={chrome} />;
    case "rentabilidad":
      return <Rentabilidad d={demo} t={chrome} />;
    case "insight":
      return <Insight d={demo} />;
  }
}
