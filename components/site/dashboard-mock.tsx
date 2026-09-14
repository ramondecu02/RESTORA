import {
  Boxes,
  FileText,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

const SIDEBAR = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: ShoppingCart, label: "Compras" },
  { icon: Truck, label: "Proveedores" },
  { icon: UtensilsCrossed, label: "Escandallos" },
  { icon: Boxes, label: "Inventario" },
  { icon: Wallet, label: "Costes" },
  { icon: FileText, label: "Informes" },
  { icon: Settings, label: "Configuración" },
];

const STATS = [
  { label: "Coste de compras", value: "24.680 €", delta: "4,8%", down: true, good: true },
  { label: "Food Cost", value: "29,4%", delta: "1,7%", down: true, good: true },
  { label: "Proveedores", value: "12", delta: "0%", flat: true },
  { label: "Alertas", value: "7", delta: "2", up: true, good: false },
];

const DONUT = [
  { label: "Carnes", pct: 28, color: "#1E3D2F" },
  { label: "Pescados", pct: 22, color: "#3E8E6A" },
  { label: "Verduras", pct: 18, color: "#7CB79A" },
  { label: "Bebidas", pct: 12, color: "#B7C6BB" },
  { label: "Otros", pct: 20, color: "#DCE3DB" },
];

const RISERS = [
  ["Tomate", "+12%"],
  ["Pescado blanco", "+8%"],
  ["Aceite de oliva", "+6%"],
  ["Ternera", "+5%"],
];

const RECENT = [
  ["Distribuidora Mediterránea", "1.240 €"],
  ["Frutas y Verduras del Sur", "860 €"],
  ["Mariscos del Atlántico", "2.340 €"],
  ["Cárnicas García", "1.560 €"],
];

const CHART = [15, 17, 16, 19, 18, 21, 20, 23, 22, 25, 24, 27];

function conic() {
  let acc = 0;
  const stops = DONUT.map((d) => {
    const from = acc;
    acc += d.pct;
    return `${d.color} ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function LineChart() {
  const w = 260;
  const h = 92;
  const max = Math.max(...CHART);
  const min = Math.min(...CHART);
  const pts = CHART.map((v, i) => {
    const x = (i / (CHART.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 10) - 4;
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="dm-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3E8E6A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3E8E6A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#dm-fill)" />
      <path d={line} fill="none" stroke="#3E8E6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const panel: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hair)",
  borderRadius: 12,
  padding: 14,
};

export function DashboardMock() {
  return (
    <div
      className="mono"
      style={{
        width: 640,
        maxWidth: "100%",
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 18,
        boxShadow: "0 40px 90px -50px rgba(20,32,26,0.45)",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Sidebar */}
      <aside style={{ borderRight: "1px solid var(--hair)", padding: "16px 12px", background: "color-mix(in srgb, var(--panel) 60%, var(--surface))" }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.14em", fontSize: 13, padding: "2px 8px 14px" }}>RESTORA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SIDEBAR.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 8px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: s.active ? 600 : 500,
                  color: s.active ? "var(--on-brand)" : "var(--muted)",
                  background: s.active ? "var(--brand)" : "transparent",
                }}
              >
                <Icon size={14} strokeWidth={1.8} />
                {s.label}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <div style={{ padding: 16, background: "var(--bg)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Resumen</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)", border: "1px solid var(--hair)", borderRadius: 8, padding: "5px 10px", background: "var(--surface)" }}>
            Últimos 30 días
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {STATS.map((s) => (
            <div key={s.label} style={panel}>
              <div style={{ fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div
                style={{
                  fontSize: 10.5,
                  marginTop: 3,
                  fontVariantNumeric: "tabular-nums",
                  color: s.flat ? "var(--muted)" : s.good ? "var(--up)" : "var(--down)",
                }}
              >
                {s.flat ? "—" : s.down ? "↓" : "↑"} {s.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Chart + donut */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
          <div style={panel}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Evolución del coste de compras</div>
            <LineChart />
          </div>
          <div style={panel}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>Distribución de costes</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: conic(), flexShrink: 0, position: "relative" }}>
                <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: "var(--surface)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10 }}>
                {DONUT.map((d) => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} />
                    <span style={{ color: "var(--muted)" }}>{d.label}</span>
                    <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lists */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={panel}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>Mayor aumento de precio</div>
            {RISERS.map(([name, d]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)" }}>{name}</span>
                <span style={{ color: "var(--down)", fontVariantNumeric: "tabular-nums" }}>{d} ↑</span>
              </div>
            ))}
          </div>
          <div style={panel}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>Compras recientes</div>
            {RECENT.map(([name, v]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
