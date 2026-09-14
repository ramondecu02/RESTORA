import { BarChart3, Database, Lightbulb, MousePointerClick } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import { Eyebrow } from "./ui";

const STEP_ICONS = [Database, BarChart3, Lightbulb, MousePointerClick];

export function SiteInteligencia({ copy }: { copy: SiteCopy }) {
  const c = copy.inteligencia;
  return (
    <section id="como-funciona" className="mx-auto max-w-[1200px]" style={{ padding: "80px 28px" }}>
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: heading + flow */}
        <div>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)", margin: "16px 0 0", maxWidth: "14ch", textWrap: "balance" }}>
            {c.title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", margin: "18px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>{c.sub}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 34, flexWrap: "wrap" }}>
            {c.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <span className="icon-badge" style={{ width: 46, height: 46, borderRadius: 14 }}>
                      <Icon size={20} strokeWidth={1.7} />
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>
                      {step}
                    </span>
                  </div>
                  {i < c.steps.length - 1 && (
                    <span style={{ color: "var(--border)", fontSize: 18, marginBottom: 22 }}>→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: insight cards */}
        <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              alignSelf: "flex-start",
              width: "min(320px, 100%)",
              background: "var(--surface)",
              border: "1px solid var(--hair)",
              borderRadius: 14,
              boxShadow: "0 24px 55px -38px rgba(20,32,26,0.4)",
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20, color: "var(--down)" }}>↑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Tomate</div>
              <div className="mono" style={{ fontSize: 12.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                1,85 €/kg · vs 1,65 €/kg
              </div>
            </div>
            <span className="mono" style={{ fontWeight: 700, color: "var(--down)", fontVariantNumeric: "tabular-nums" }}>+12%</span>
          </div>

          <div
            style={{
              alignSelf: "flex-end",
              width: "min(300px, 100%)",
              background: "var(--surface)",
              border: "1px solid var(--hair)",
              borderRadius: 14,
              boxShadow: "0 24px 55px -38px rgba(20,32,26,0.4)",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Margen plato</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 22, color: "var(--down)", fontVariantNumeric: "tabular-nums" }}>−0,18 €</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Impacto en tu coste</div>
          </div>

          <div
            style={{
              marginTop: 6,
              borderRadius: 14,
              padding: "16px 18px",
              background: "var(--brand-soft)",
              border: "1px solid color-mix(in srgb, var(--brand) 25%, var(--hair))",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <Lightbulb size={20} strokeWidth={1.8} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5 }}>{c.insight}</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", marginTop: 6, display: "inline-block" }}>
                {c.insightAction} →
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
