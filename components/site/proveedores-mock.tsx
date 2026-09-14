const ROWS: [string, string, string, boolean][] = [
  ["Distribuidora Mediterránea", "12 may 2025", "+2%", false],
  ["Frutas y Verduras del Sur", "8 abr 2025", "−5%", true],
  ["Mariscos del Atlántico", "5 abr 2025", "+8%", false],
  ["Cárnicas García", "2 abr 2025", "−3%", true],
];

const SPARK = [42, 46, 44, 50, 48, 55, 60, 58, 66, 72];

function Spark() {
  const w = 150;
  const h = 34;
  const max = Math.max(...SPARK);
  const min = Math.min(...SPARK);
  const d = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProveedoresMock() {
  return (
    <div style={{ width: 460, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className="mono"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hair)",
          borderRadius: 16,
          boxShadow: "0 30px 70px -45px rgba(20,32,26,0.4)",
          padding: 18,
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Proveedores <span style={{ color: "var(--muted)", fontWeight: 500 }}>12</span>
          </span>
          <span style={{ color: "var(--muted)", fontSize: 16 }}>×</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 14px", fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 8, borderBottom: "1px solid var(--hair)" }}>
          <span>Proveedor</span>
          <span>Última compra</span>
          <span style={{ textAlign: "right" }}>Variación</span>
        </div>
        {ROWS.map(([name, date, delta, good]) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 14px", alignItems: "center", fontSize: 12.5, padding: "10px 0", borderBottom: "1px solid var(--hair)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: "var(--brand-soft)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            </span>
            <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{date}</span>
            <span
              style={{
                justifySelf: "end",
                fontSize: 11,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: good ? "var(--up)" : "var(--down)",
                background: good ? "color-mix(in srgb, var(--up) 14%, transparent)" : "color-mix(in srgb, var(--down) 14%, transparent)",
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {delta}
            </span>
          </div>
        ))}
      </div>

      {/* Product card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hair)",
          borderRadius: 16,
          boxShadow: "0 30px 70px -50px rgba(20,32,26,0.4)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
          alignSelf: "flex-end",
          width: "78%",
          transform: "translateY(-6px)",
        }}
      >
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #E4736A, #C94a41)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Tomate</div>
          <div className="mono" style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            1,85 €/kg <span style={{ color: "var(--down)", fontWeight: 600 }}>↑12%</span>
          </div>
        </div>
        <Spark />
      </div>
    </div>
  );
}
