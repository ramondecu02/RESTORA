import Link from "next/link";
import { ArrowRight, BarChart3, Database, Lightbulb, MousePointerClick } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { ProductShot } from "./product-shot";

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
                  {i < c.steps.length - 1 && <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 17, marginBottom: 22 }}>→</span>}
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

        {/* The product, framed like a screen in the room: real screenshots of the app */}
        <div className="reveal" style={{ position: "relative", paddingBottom: 22, minWidth: 0 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 24,
              padding: 12,
              boxShadow: "0 64px 120px -54px rgba(0,0,0,0.85)",
            }}
          >
            <ProductShot src="/images/captura-avisos-escritorio.webp" alt={copy.images.productoAvisos} width={1600} height={1000} sizes="(max-width: 1023px) 100vw, 640px" />
          </div>

          <div
            style={{
              position: "absolute",
              right: "clamp(10px, 3%, 26px)",
              bottom: 0,
              width: "min(27%, 150px)",
              background: "#0b120e",
              border: "4px solid #0b120e",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 40px 80px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.18)",
            }}
          >
            <ProductShot src="/images/captura-hoy-movil.webp" alt={copy.images.productoMovil} width={780} height={1688} sizes="150px" radius={0} />
          </div>

          <p style={{ margin: "16px 0 0", maxWidth: "62%", fontSize: 13, lineHeight: 1.45, color: "rgba(255,255,255,0.56)" }}>{copy.demo.shot}</p>
        </div>
      </div>
    </section>
  );
}
