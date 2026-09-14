import type { Dictionary } from "@/lib/dictionaries";
import { Masthead } from "./masthead";

export function Why({ dict }: { dict: Dictionary }) {
  return (
    <section id="why" className="mx-auto max-w-[1200px]" style={{ padding: "64px 28px" }}>
      <Masthead index="03" label={dict.sec.why} />
      <h2
        className="display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(32px, 5.4vw, 58px)",
          lineHeight: 0.96,
          maxWidth: "20ch",
          textWrap: "balance",
          margin: "20px 0 0",
        }}
      >
        {dict.why.title}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
          marginTop: 32,
        }}
      >
        {dict.why.items.map((item) => (
          <div key={item.title} className="card hover-lift reveal" style={{ padding: 28 }}>
            <div className="display" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.02 }}>
              {item.title}
            </div>
            <p style={{ fontSize: 15, color: "var(--muted)", margin: "12px 0 0" }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Benchmark banner */}
      <div
        style={{
          marginTop: 14,
          background: "var(--amber)",
          color: "var(--on-amber)",
          borderRadius: 20,
          padding: 44,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 28,
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 22px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>
            ◆ {dict.why.benchKicker}
          </div>
          <div
            className="display"
            style={{ fontWeight: 800, fontSize: "clamp(30px, 4.2vw, 46px)", lineHeight: 0.98, marginTop: 10 }}
          >
            {dict.why.benchTitle}
          </div>
          <p style={{ fontSize: 16, opacity: 0.92, margin: "14px 0 0", maxWidth: "42ch" }}>{dict.why.benchBody}</p>
        </div>

        <div style={{ position: "relative", background: "rgba(0,0,0,0.16)", borderRadius: 14, padding: 24 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.06em", opacity: 0.85, textTransform: "uppercase" }}>
            {dict.why.benchMetric}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <span className="mono" style={{ fontWeight: 600, fontSize: 42 }}>31,4%</span>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, opacity: 0.85, marginBottom: 4 }}>TÚ · 31,4%</div>
              <div style={{ height: 11, borderRadius: 999, background: "rgba(0,0,0,0.18)", overflow: "hidden" }}>
                <div style={{ width: "62%", height: "100%", background: "#fff" }} />
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, opacity: 0.85, marginBottom: 4 }}>{dict.why.benchZone} · 34,8%</div>
              <div style={{ height: 11, borderRadius: 999, background: "rgba(0,0,0,0.18)", overflow: "hidden" }}>
                <div style={{ width: "80%", height: "100%", background: "rgba(255,255,255,0.5)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
