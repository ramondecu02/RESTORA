import type { Dictionary } from "@/lib/dictionaries";
import { Masthead } from "./masthead";

export function Pricing({ dict }: { dict: Dictionary }) {
  return (
    <section
      id="pricing"
      style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }}
    >
      <div className="mx-auto max-w-[1200px]" style={{ padding: "64px 28px" }}>
        <Masthead index="06" label={dict.sec.pricing} />
        <h2
          className="display"
          style={{ fontWeight: 800, fontSize: "clamp(32px, 5.4vw, 58px)", lineHeight: 0.96, margin: "20px 0 0" }}
        >
          {dict.pricing.title}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 17, margin: "14px 0 0", maxWidth: "48ch" }}>{dict.pricing.sub}</p>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            border: "1px dashed var(--amber)",
            background: "var(--amber-soft)",
            color: "var(--ink)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
            maxWidth: "62ch",
          }}
        >
          <span style={{ color: "var(--amber)", fontWeight: 700 }}>◆</span>
          <span>{dict.pricing.previewNote}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 34,
            alignItems: "start",
          }}
        >
          {dict.pricing.plans.map((plan) => {
            const featured = plan.featured;
            return (
              <div
                key={plan.name}
                className="hover-lift reveal"
                style={{
                  background: "var(--surface)",
                  border: featured ? "2px solid var(--amber)" : "1px solid var(--hair)",
                  borderRadius: 18,
                  padding: 30,
                  position: "relative",
                  boxShadow: featured ? "0 34px 74px -38px rgba(185,116,10,0.5)" : "none",
                }}
              >
                {featured && (
                  <div
                    className="mono"
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--amber)",
                      color: "var(--on-amber)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "5px 14px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dict.pricing.recommended}
                  </div>
                )}
                <div className="display" style={{ fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
                  {plan.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12, whiteSpace: "nowrap" }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 42 }}>{plan.price}</span>
                  <span className="mono" style={{ fontSize: 15, color: "var(--muted)" }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "8px 0 0", minHeight: 42 }}>{plan.tagline}</p>
                <div style={{ height: 1, background: "var(--hair)", margin: "20px 0" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5 }}>
                      <span style={{ color: "var(--amber)", fontWeight: 700, lineHeight: 1.4 }}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="#lead"
                  className="btn"
                  style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: 26,
                    padding: 14,
                    fontSize: 15,
                    background: featured ? "var(--amber)" : "transparent",
                    color: featured ? "var(--on-amber)" : "var(--ink)",
                    border: featured ? "1px solid var(--amber)" : "1px solid var(--line)",
                  }}
                >
                  {dict.pricing.cta}
                </a>
              </div>
            );
          })}
        </div>

        <p className="mono" style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 24 }}>
          {dict.pricing.implantation}
        </p>

        {/* Founder banner */}
        <div
          style={{
            marginTop: 26,
            border: "1.5px dashed var(--amber)",
            borderRadius: 18,
            padding: 30,
            background: "var(--amber-soft)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div>
            <div
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 600 }}
            >
              ◆ {dict.pricing.founderProgram}
            </div>
            <div className="display" style={{ fontWeight: 800, fontSize: 30, color: "var(--ink)", marginTop: 4, lineHeight: 1 }}>
              {dict.pricing.founderTitle}
            </div>
            <p style={{ fontSize: 15, color: "color-mix(in srgb, var(--ink) 78%, transparent)", margin: "10px 0 0" }}>
              {dict.pricing.founderBody}
            </p>
          </div>
          <div style={{ justifySelf: "end" }}>
            <a href="#lead" className="btn btn-amber" style={{ padding: "15px 26px", fontSize: 16, whiteSpace: "nowrap" }}>
              {dict.nav.cta} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
