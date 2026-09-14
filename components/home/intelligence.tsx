import Link from "next/link";
import { ArrowRight, BarChart3, Database, Lightbulb, MousePointerClick } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { DashboardMock } from "@/components/site/dashboard-mock";

const STEP_ICONS = [Database, BarChart3, Lightbulb, MousePointerClick];

// The dark chapter: where data becomes a decision.
export function HomeIntelligence({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const c = copy.inteligencia;
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#101c16", color: "#fff", padding: "clamp(70px, 9vw, 124px) 28px" }}>
      <div
        aria-hidden="true"
        className="glow-pulse"
        style={{ position: "absolute", top: -180, left: -140, width: 640, height: 640, background: "radial-gradient(circle, rgba(111,184,148,0.16), transparent 68%)", pointerEvents: "none" }}
      />

      <div
        className="mx-auto grid max-w-[1280px] items-center lg:grid-cols-[0.95fr_1.05fr]"
        style={{ position: "relative", gap: "clamp(44px, 5vw, 84px)" }}
      >
        <div className="reveal" style={{ minWidth: 0 }}>
          <div className="editorial-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>
            {c.eyebrow}
          </div>
          <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(30px, 4vw, 50px)", margin: "18px 0 0", maxWidth: "15ch" }}>
            {c.title}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.74)", fontSize: 17, margin: "18px 0 0", maxWidth: "44ch", lineHeight: 1.65 }}>{c.sub}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 34, flexWrap: "wrap" }}>
            {c.steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
                    <span
                      style={{ width: 46, height: 46, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)", color: "#8fd3b0" }}
                    >
                      <Icon size={19} strokeWidth={1.7} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.58)" }}>
                      {step}
                    </span>
                  </div>
                  {i < c.steps.length - 1 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 17, marginBottom: 22 }}>→</span>}
                </div>
              );
            })}
          </div>

          <Link
            href={`/${locale}/como-funciona`}
            className="btn"
            style={{ marginTop: 36, padding: "13px 24px", fontSize: 15, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            {copy.hero.ctaSecondary}
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>

        {/* The product, framed like a screen in the room */}
        <div className="reveal" style={{ position: "relative", paddingBottom: 26, minWidth: 0 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 24,
              padding: 12,
              boxShadow: "0 64px 120px -54px rgba(0,0,0,0.85)",
            }}
          >
            <DashboardMock />
          </div>

          <div
            style={{
              position: "absolute",
              left: 18,
              bottom: 0,
              maxWidth: "min(84%, 330px)",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              background: "linear-gradient(180deg, rgba(20,32,25,0.92), rgba(12,20,15,0.95))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16,
              padding: "14px 16px",
              boxShadow: "0 34px 70px -34px rgba(0,0,0,0.9)",
            }}
          >
            <Lightbulb size={18} strokeWidth={1.8} color="#8fd3b0" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,0.9)" }}>{c.insight}</p>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#8fd3b0", marginTop: 5, display: "inline-block" }}>{c.insightAction} →</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
