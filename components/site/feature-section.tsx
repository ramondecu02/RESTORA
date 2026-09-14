import type { ReactNode } from "react";
import { Eyebrow } from "./ui";

export function FeatureSection({
  id,
  eyebrow,
  title,
  sub,
  ctaLabel,
  ctaHref = "#lead",
  soon,
  visual,
  reverse = false,
  panel = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  sub: string;
  ctaLabel?: string;
  ctaHref?: string;
  soon?: string;
  visual: ReactNode;
  reverse?: boolean;
  panel?: boolean;
}) {
  return (
    <section
      id={id}
      style={
        panel
          ? { background: "var(--panel)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }
          : undefined
      }
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 md:grid-cols-2" style={{ padding: "80px 28px" }}>
        <div className={reverse ? "md:order-2" : undefined}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)", margin: "16px 0 0", maxWidth: "15ch", textWrap: "balance" }}>
            {title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", margin: "18px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>{sub}</p>
          {soon ? (
            <span
              className="btn btn-outline"
              style={{ padding: "12px 20px", fontSize: 14.5, marginTop: 26, cursor: "default", opacity: 0.85 }}
            >
              {soon}
            </span>
          ) : ctaLabel ? (
            <a href={ctaHref} className="btn btn-brand" style={{ padding: "13px 22px", fontSize: 15, marginTop: 26 }}>
              {ctaLabel} →
            </a>
          ) : null}
        </div>
        <div className={`reveal ${reverse ? "md:order-1" : ""}`} style={{ display: "flex", justifyContent: "center" }}>
          {visual}
        </div>
      </div>
    </section>
  );
}
