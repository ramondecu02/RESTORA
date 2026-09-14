import { Check } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import { Eyebrow } from "./ui";

export function SitePricing({ copy }: { copy: SiteCopy }) {
  const p = copy.pricing;
  return (
    <section id="pricing" className="mx-auto max-w-[1200px]" style={{ padding: "80px 28px" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Eyebrow>{p.eyebrow}</Eyebrow>
        <h2 className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)", margin: "16px 0 0" }}>{p.title}</h2>
        <p style={{ fontSize: 17, color: "var(--muted)", margin: "14px 0 0", maxWidth: "48ch" }}>{p.sub}</p>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
            border: "1px solid color-mix(in srgb, var(--brand) 30%, var(--hair))",
            background: "var(--brand-soft)",
            color: "var(--ink)",
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 13.5,
            maxWidth: "64ch",
          }}
        >
          <span style={{ color: "var(--brand)", fontWeight: 700 }}>◆</span>
          <span>{p.previewNote}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 44, alignItems: "start", maxWidth: 980, marginInline: "auto" }}>
        {p.plans.map((plan) => {
          const f = plan.featured;
          return (
            <div
              key={plan.name}
              className="hover-lift reveal"
              style={{
                background: "var(--surface)",
                border: f ? "2px solid var(--brand)" : "1px solid var(--hair)",
                borderRadius: 20,
                padding: 30,
                position: "relative",
                boxShadow: f ? "0 34px 74px -40px rgba(30,61,47,0.4)" : "0 1px 2px rgba(20,32,26,0.04)",
              }}
            >
              {f && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--brand)", color: "var(--on-brand)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>
                  {p.recommended}
                </div>
              )}
              <div className="display" style={{ fontWeight: 700, fontSize: 22 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: 38, fontVariantNumeric: "tabular-nums" }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "var(--muted)" }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: "8px 0 0", minHeight: 40 }}>{plan.tagline}</p>
              <div style={{ height: 1, background: "var(--hair)", margin: "20px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {plan.features.map((feat) => (
                  <div key={feat} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <Check size={17} strokeWidth={2.4} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <a
                href="#lead"
                className={f ? "btn btn-brand" : "btn btn-outline"}
                style={{ display: "block", textAlign: "center", marginTop: 26, padding: 13, fontSize: 15 }}
              >
                {p.cta}
              </a>
            </div>
          );
        })}
      </div>

      {/* Founder banner */}
      <div
        style={{
          marginTop: 26,
          maxWidth: 980,
          marginInline: "auto",
          border: "1.5px dashed var(--brand)",
          borderRadius: 20,
          padding: 30,
          background: "var(--brand-soft)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--brand)", fontWeight: 700 }}>◆ {p.founderProgram}</div>
          <div className="display" style={{ fontWeight: 700, fontSize: 26, color: "var(--ink)", marginTop: 6 }}>{p.founderTitle}</div>
          <p style={{ fontSize: 15, color: "color-mix(in srgb, var(--ink) 78%, transparent)", margin: "10px 0 0", maxWidth: "52ch" }}>{p.founderBody}</p>
        </div>
        <div style={{ justifySelf: "end" }}>
          <a href="#lead" className="btn btn-brand" style={{ padding: "14px 24px", fontSize: 15.5, whiteSpace: "nowrap" }}>{copy.nav.cta} →</a>
        </div>
      </div>
    </section>
  );
}
