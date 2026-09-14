import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Frame } from "./frame";

// Asymmetric editorial split: the kitchen bleeds off the left edge, the
// argument sits in white space on the right, the pains read as an index.
export function HomeProblem({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const p = copy.problem;
  return (
    <section style={{ background: "var(--bg)", paddingBottom: "clamp(56px, 7vw, 92px)" }}>
      <div className="grid items-stretch md:grid-cols-[1.02fr_1fr]">
        <Frame
          src="/images/operativa.webp"
          alt="Cocina de restaurante durante el servicio"
          sizes="(max-width: 860px) 100vw, 52vw"
          focal="focal-operativa"
          zoom
          grain
          className="reveal"
          style={{ minHeight: "clamp(320px, 46vw, 600px)", borderRadius: "0 26px 26px 0" }}
        />

        <div
          className="reveal"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(44px, 6vw, 96px) 28px clamp(36px, 4vw, 64px) clamp(28px, 5vw, 76px)",
            maxWidth: 660,
          }}
        >
          <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>
            {p.eyebrow}
          </div>
          <h2 className="display-serif" style={{ fontSize: "clamp(32px, 4.4vw, 54px)", margin: "20px 0 0", maxWidth: "17ch" }}>
            {p.title}
          </h2>
          <p style={{ fontSize: 17.5, color: "var(--muted)", margin: "20px 0 0", lineHeight: 1.65, maxWidth: "44ch" }}>{p.sub}</p>
          <div style={{ marginTop: 26, fontSize: 16.5, color: "var(--brand)", fontWeight: 600, fontStyle: "italic" }}>{p.note}</div>
          <Link
            href={`/${locale}/como-funciona`}
            className="btn btn-outline"
            style={{ marginTop: 30, padding: "13px 22px", fontSize: 15, alignSelf: "flex-start" }}
          >
            {copy.hero.ctaSecondary}
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* The pains, as a quiet editorial index */}
      <div className="mx-auto max-w-[1280px]" style={{ padding: "clamp(40px, 5vw, 72px) 28px 0" }}>
        <div
          className="reveal-group"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(236px, 1fr))", columnGap: "clamp(20px, 3vw, 44px)" }}
        >
          {p.items.map((item, i) => (
            <div key={item.title} style={{ borderTop: "1px solid var(--line)", padding: "16px 0 24px" }}>
              <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.08em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ fontWeight: 600, fontSize: 15.5, marginTop: 10, letterSpacing: "-0.01em" }}>{item.title}</div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
