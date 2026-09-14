import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Frame } from "./frame";

/**
 * Editorial row: one photograph, one argument, one piece of the product.
 * `reverse` flips the sides so consecutive rows alternate.
 */
export function FeatureRow({
  eyebrow,
  title,
  sub,
  ctaLabel,
  ctaHref,
  src,
  alt,
  focal,
  ratio = "5 / 4",
  reverse = false,
  tone = "bg",
  overlay,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  ctaLabel?: string;
  ctaHref?: string;
  src: string;
  alt: string;
  focal?: string;
  ratio?: string;
  reverse?: boolean;
  tone?: "bg" | "surface" | "panel";
  overlay?: ReactNode;
}) {
  const background = tone === "panel" ? "var(--panel)" : tone === "surface" ? "var(--surface)" : "var(--bg)";

  return (
    <section
      style={{
        background,
        padding: "clamp(60px, 7.5vw, 108px) 28px",
        ...(tone !== "bg" ? { borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" } : null),
      }}
    >
      <div
        className="mx-auto grid max-w-[1280px] items-center md:grid-cols-2"
        style={{ gap: "clamp(34px, 5vw, 76px)" }}
      >
        <div className={`reveal ${reverse ? "md:order-2" : ""}`}>
          <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>
            {eyebrow}
          </div>
          <h2 className="display-serif" style={{ fontSize: "clamp(30px, 3.9vw, 48px)", margin: "18px 0 0", maxWidth: "16ch" }}>
            {title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", margin: "18px 0 0", lineHeight: 1.65, maxWidth: "44ch" }}>{sub}</p>
          {ctaLabel && ctaHref && (
            <Link href={ctaHref} className="btn btn-outline" style={{ marginTop: 28, padding: "13px 22px", fontSize: 15 }}>
              {ctaLabel}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          )}
        </div>

        <div className={`reveal ${reverse ? "md:order-1" : ""}`} style={{ position: "relative" }}>
          <Frame
            src={src}
            alt={alt}
            sizes="(max-width: 860px) 100vw, 48vw"
            focal={focal}
            ratio={ratio}
            radius={24}
            zoom
            grain
            style={{ border: "1px solid var(--hair)" }}
          />
          {overlay}
        </div>
      </div>
    </section>
  );
}

/** Frosted product card that sits on a photograph. */
export function OverlayCard({
  children,
  position = "bottom-left",
}: {
  children: ReactNode;
  position?: "bottom-left" | "bottom-right" | "top-right";
}) {
  const pos: Record<string, React.CSSProperties> = {
    "bottom-left": { left: "clamp(12px, 3%, 22px)", bottom: "clamp(12px, 3%, 22px)" },
    "bottom-right": { right: "clamp(12px, 3%, 22px)", bottom: "clamp(12px, 3%, 22px)" },
    "top-right": { right: "clamp(12px, 3%, 22px)", top: "clamp(12px, 3%, 22px)" },
  };
  return (
    <div
      className="mono"
      style={{
        position: "absolute",
        zIndex: 4,
        maxWidth: "min(78%, 320px)",
        background: "color-mix(in srgb, var(--surface) 93%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        boxShadow: "0 30px 60px -34px rgba(20,32,26,0.55)",
        padding: "14px 16px",
        fontFamily: "var(--font-body)",
        ...pos[position],
      }}
    >
      {children}
    </div>
  );
}
