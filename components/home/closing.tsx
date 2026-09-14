import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Frame } from "./frame";

// Closing chapter: the room you are doing all of this for.
export function HomeClosing({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  return (
    <section
      style={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        background: "#0a0f0c",
        minHeight: "clamp(420px, 62vh, 660px)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Frame
        src="/images/restaurante-cta.webp"
        alt="Sala de restaurante al caer la tarde"
        sizes="100vw"
        focal="focal-closing"
        kenburns
        style={{ position: "absolute", inset: 0, borderRadius: 0, zIndex: 0, background: "#0a0f0c" }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(7,12,9,0.78) 0%, rgba(7,12,9,0.6) 45%, rgba(7,12,9,0.86) 100%)" }}
      />
      <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />

      <div
        className="reveal mx-auto w-full max-w-[860px]"
        style={{ position: "relative", zIndex: 3, padding: "clamp(56px, 8vw, 96px) 28px", textAlign: "center" }}
      >
        <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(32px, 4.8vw, 58px)", margin: 0, maxWidth: "20ch", marginInline: "auto" }}>
          {copy.ctaBand.title}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 17.5, margin: "20px auto 0", maxWidth: "46ch", lineHeight: 1.65 }}>{copy.ctaBand.sub}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 34 }}>
          <Link href={`/${locale}/contacto`} className="btn" style={{ background: "#fff", color: "#12211a", border: "1px solid #fff", padding: "15px 28px", fontSize: 15.5 }}>
            {copy.nav.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
          <Link
            href={`/${locale}/precios`}
            className="btn"
            style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.34)", padding: "15px 28px", fontSize: 15.5, backdropFilter: "blur(6px)" }}
          >
            {copy.pricing.fromLabel} {copy.pricing.price}{copy.pricing.period}
          </Link>
        </div>
      </div>
    </section>
  );
}
