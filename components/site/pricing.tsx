import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Eyebrow } from "./ui";

export function SitePricing({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const p = copy.pricing;
  return (
    <section id="pricing" className="mx-auto max-w-[1080px]" style={{ padding: "80px 28px" }}>
      <div className="reveal" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
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

      <div
        className="reveal-group"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 18,
          marginTop: 44,
          alignItems: "stretch",
        }}
      >
        {/* From-price card */}
        <div className="card hover-lift" style={{ padding: 34, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
            {p.fromLabel}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <span className="display" style={{ fontWeight: 700, fontSize: 56, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{p.price}</span>
            <span style={{ fontSize: 17, color: "var(--muted)" }}>{p.period}</span>
          </div>
          <div style={{ height: 1, background: "var(--hair)", margin: "22px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {p.includes.map((f) => (
              <div key={f} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15 }}>
                <Check size={18} strokeWidth={2.4} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <Link href={`/${locale}/contacto`} className="btn btn-outline" style={{ marginTop: 28, padding: 14, fontSize: 15.5, justifyContent: "center" }}>
            {p.cta}
          </Link>
        </div>

        {/* Founder offer — featured */}
        <div
          className="hover-lift"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--brand)",
            color: "var(--on-brand)",
            border: "1px solid var(--brand)",
            borderRadius: 20,
            padding: 34,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 40px 84px -46px rgba(30,61,47,0.5)",
          }}
        >
          <div
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 22px)", pointerEvents: "none" }}
          />
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "6px 13px", fontSize: 12, fontWeight: 600 }}>
            <Sparkles size={14} strokeWidth={2} />
            {p.founderBadge}
          </div>
          <h3 className="display" style={{ position: "relative", fontWeight: 700, fontSize: 26, marginTop: 16, color: "#fff" }}>{p.founderTitle}</h3>
          <p style={{ position: "relative", fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "10px 0 0", lineHeight: 1.55 }}>{p.founderBody}</p>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, marginTop: 20, flex: 1 }}>
            {p.founderPerks.map((perk) => (
              <div key={perk} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15 }}>
                <Check size={18} strokeWidth={2.6} color="#fff" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{perk}</span>
              </div>
            ))}
          </div>
          <Link
            href={`/${locale}/contacto`}
            className="btn"
            style={{ position: "relative", marginTop: 28, padding: 14, fontSize: 15.5, justifyContent: "center", background: "#fff", color: "var(--brand)", border: "1px solid #fff" }}
          >
            {p.cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
