import { FileText } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import { ICONS } from "./icons";
import { Eyebrow } from "./ui";

const floatCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hair)",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 20px 45px -30px rgba(20,32,26,0.35)",
};

function ScatterCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {/* Factura */}
      <div style={{ ...floatCard, transform: "rotate(-1.5deg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Factura #4587</span>
          <FileText size={15} color="var(--muted)" />
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>Mariscos del Sur</div>
        <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>2.340,50 €</div>
      </div>

      {/* Precios chart */}
      <div style={{ ...floatCard, transform: "rotate(1.5deg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Precios proveedores</span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--down)" }}>↑12%</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 44, marginTop: 12 }}>
          {[40, 55, 48, 62, 58, 74, 70, 88].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: i > 5 ? "var(--down)" : "color-mix(in srgb, var(--accent) 55%, transparent)" }} />
          ))}
        </div>
      </div>

      {/* Escandallos */}
      <div style={{ ...floatCard, transform: "rotate(1deg)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Escandallos</div>
        {["Marisco", "Verduras", "Carnes", "Vinos"].map((n, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", width: 52 }}>{n}</span>
            <span style={{ flex: 1, height: 5, borderRadius: 999, background: "var(--hair)", overflow: "hidden" }}>
              <span style={{ display: "block", width: `${[70, 55, 82, 40][i]}%`, height: "100%", background: "var(--accent)" }} />
            </span>
          </div>
        ))}
      </div>

      {/* Proveedores */}
      <div style={{ ...floatCard, transform: "rotate(-1deg)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Proveedores</div>
        {["Pescados del Norte", "Carnes Premium", "Frutas y Verduras SL", "Bodegas Soler"].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, background: "var(--brand-soft)", flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiteProblem({ copy }: { copy: SiteCopy }) {
  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "80px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "start" }}>
        {/* Left: heading + pains */}
        <div>
          <Eyebrow>{copy.problem.eyebrow}</Eyebrow>
          <h2 className="display" style={{ fontSize: "clamp(30px, 4.6vw, 50px)", margin: "16px 0 0", maxWidth: "16ch", textWrap: "balance" }}>
            {copy.problem.title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", margin: "18px 0 0", maxWidth: "42ch", lineHeight: 1.6 }}>
            {copy.problem.sub}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "26px 32px", marginTop: 38 }}>
            {copy.problem.items.map((item) => {
              const Icon = ICONS[item.icon] ?? FileText;
              return (
                <div key={item.title} style={{ display: "flex", gap: 14 }}>
                  <span className="icon-badge" style={{ width: 40, height: 40, borderRadius: 11 }}>
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15.5 }}>{item.title}</div>
                    <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "5px 0 0", lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: scattered data composition */}
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            padding: 28,
            background: "linear-gradient(160deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--panel))",
            border: "1px solid var(--hair)",
          }}
        >
          <ScatterCards />
          <div
            style={{
              marginTop: 22,
              textAlign: "center",
              fontStyle: "italic",
              fontSize: 16,
              color: "var(--brand)",
              fontWeight: 500,
            }}
          >
            {copy.problem.note}
          </div>
        </div>
      </div>
    </section>
  );
}
