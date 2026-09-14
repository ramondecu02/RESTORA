const ING: [string, string, string][] = [
  ["Lubina", "300 g", "4,60 €"],
  ["Aceite de oliva", "20 ml", "0,38 €"],
  ["Verduras", "150 g", "1,20 €"],
  ["Especias", "50 g", "0,42 €"],
];

const ROWS: [string, string, boolean][] = [
  ["Precio venta", "28,00 €", false],
  ["Coste", "8,20 €", false],
  ["Margen", "19,80 €", false],
  ["Food Cost", "29,3%", true],
];

export function EscandalloMock() {
  const pct = 29.3;
  return (
    <div
      className="mono"
      style={{
        width: 480,
        maxWidth: "100%",
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 18,
        boxShadow: "0 34px 80px -46px rgba(20,32,26,0.42)",
        padding: 20,
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Escandallo de plato</span>
        <span style={{ color: "var(--muted)" }}>×</span>
      </div>

      {/* dish + key figures */}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span
          style={{
            width: 74,
            height: 74,
            borderRadius: 14,
            flexShrink: 0,
            background: "radial-gradient(circle at 35% 30%, #E9DCC4, #B98E5A 70%, #7c5a34)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Lubina a la brasa</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginTop: 8 }}>
            {ROWS.map(([k, v, hot]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: hot ? "var(--up)" : "var(--ink)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--hair)", margin: "18px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "center" }}>
        {/* ingredients */}
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Ingredientes principales
          </div>
          {ING.map(([name, qty, cost]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 0" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{name}</span>
              <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{qty}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", width: 52, textAlign: "right" }}>{cost}</span>
            </div>
          ))}
        </div>

        {/* donut */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
            Rentabilidad por plato
          </div>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              background: `conic-gradient(var(--accent) ${pct}%, var(--hair) 0)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "var(--surface)" }} />
            <span style={{ position: "relative", fontWeight: 700, fontSize: 20, fontVariantNumeric: "tabular-nums" }}>29,3%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
