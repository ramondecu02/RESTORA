import type { SiteCopy } from "@/lib/site-copy";
import { CountUp } from "@/components/site/count-up";
import { Frame } from "./frame";

// Rentabilidad: an elegant room, with the numbers that decide whether it works.
export function HomeProfit({ copy }: { copy: SiteCopy }) {
  const r = copy.home.rentabilidad;
  return (
    <section style={{ padding: "clamp(58px, 7vw, 104px) 28px" }}>
      <Frame
        src="/images/mesa.webp"
        alt="Mesa de restaurante preparada para el servicio"
        sizes="(max-width: 1336px) 100vw, 1280px"
        focal="focal-sala"
        kenburns
        radius={28}
        className="reveal mx-auto max-w-[1280px]"
        style={{ minHeight: "clamp(430px, 50vw, 600px)", display: "flex", alignItems: "flex-end" }}
      >
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,13,10,0.18) 0%, rgba(8,13,10,0.45) 44%, rgba(8,13,10,0.82) 100%)" }}
        />
        <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />

        <div style={{ position: "relative", zIndex: 3, width: "100%", padding: "clamp(28px, 4.4vw, 58px)" }}>
          <div className="editorial-eyebrow" style={{ color: "rgba(255,255,255,0.62)" }}>
            {r.eyebrow}
          </div>
          <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(30px, 4.1vw, 52px)", margin: "16px 0 0", maxWidth: "18ch" }}>
            {r.title}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 16.5, margin: "16px 0 0", maxWidth: "54ch", lineHeight: 1.65 }}>{r.sub}</p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
              gap: "clamp(16px, 3vw, 40px)",
              marginTop: "clamp(26px, 4vw, 44px)",
              paddingTop: "clamp(18px, 3vw, 28px)",
              borderTop: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            {r.metrics.map((m) => (
              <div key={m.label}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ color: "#fff", fontSize: "clamp(28px, 3.3vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em" }}>
                    <CountUp end={m.end} decimals={m.decimals} suffix={m.suffix} />
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#8fd3b0" }}>{m.delta}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 7, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    </section>
  );
}
