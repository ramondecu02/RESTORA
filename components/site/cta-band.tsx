import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";

export function CtaBand({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  return (
    <section style={{ padding: "0 28px 84px" }}>
      <div
        className="mx-auto max-w-[1120px]"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--brand)",
          color: "var(--on-brand)",
          borderRadius: 28,
          padding: "clamp(40px, 6vw, 64px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 22px)", pointerEvents: "none" }}
        />
        <h2 className="display" style={{ position: "relative", fontSize: "clamp(26px, 3.6vw, 40px)", maxWidth: "20ch" }}>
          {copy.ctaBand.title}
        </h2>
        <p style={{ position: "relative", fontSize: 17, opacity: 0.9, margin: "14px 0 0", maxWidth: "44ch" }}>{copy.ctaBand.sub}</p>
        <a
          href={`/${locale}/contacto`}
          className="btn"
          style={{ position: "relative", marginTop: 26, padding: "14px 26px", fontSize: 15.5, background: "var(--on-brand)", color: "var(--brand)", border: "1px solid var(--on-brand)" }}
        >
          {copy.nav.cta} →
        </a>
      </div>
    </section>
  );
}
