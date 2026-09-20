import Image from "next/image";
import Link from "next/link";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";

export function CtaBand({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  return (
    <section className="reveal" style={{ padding: "0 28px 84px" }}>
      <div
        className="mx-auto max-w-[1120px]"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--brand)",
          color: "var(--on-brand)",
          borderRadius: 28,
          padding: "clamp(44px, 6vw, 72px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Photo backdrop */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
          <Image src="/images/restaurante-cta.webp" alt="" fill sizes="(max-width: 1176px) 100vw, 1120px" className="cta-kenburns" style={{ objectFit: "cover" }} />
        </div>
        {/* Deep-green legibility overlay */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,38,28,0.72) 0%, rgba(16,32,24,0.9) 100%)" }}
        />
        {/* Subtle diagonal texture */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 22px)", pointerEvents: "none" }}
        />
        <h2 className="display" style={{ position: "relative", fontSize: "clamp(26px, 3.6vw, 40px)", maxWidth: "20ch", color: "#fff" }}>
          {copy.ctaBand.title}
        </h2>
        <p style={{ position: "relative", fontSize: 17, color: "rgba(255,255,255,0.9)", margin: "14px 0 0", maxWidth: "44ch" }}>{copy.ctaBand.sub}</p>
        <Link
          href={`/${locale}/contacto`}
          className="btn"
          style={{ position: "relative", marginTop: 26, padding: "14px 26px", fontSize: 15.5, background: "#fff", color: "var(--brand)", border: "1px solid #fff" }}
        >
          {copy.nav.cta} →
        </Link>
      </div>
    </section>
  );
}
