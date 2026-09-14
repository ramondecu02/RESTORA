import type { SiteCopy } from "@/lib/site-copy";
import { Photo } from "./photo";

// Full-width photo band with a mission statement (Home page).
export function HomeBand({ copy }: { copy: SiteCopy }) {
  const h = copy.home;
  return (
    <section className="reveal" style={{ padding: "0 28px 88px" }}>
      <Photo
        src="/images/kitchen-hero.webp"
        alt="Cocina profesional en marcha"
        radius={28}
        focal="center"
        className="photo-kenburns mx-auto max-w-[1200px]"
        style={{ minHeight: 420, display: "flex", alignItems: "flex-end" }}
      >
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(8,16,12,0.86) 0%, rgba(8,16,12,0.42) 45%, rgba(8,16,12,0.12) 100%)" }}
        />
        <div style={{ position: "relative", padding: "clamp(28px, 5vw, 60px)", maxWidth: 640 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
            {h.bandEyebrow}
          </div>
          <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "14px 0 0", color: "#fff", textWrap: "balance", maxWidth: "18ch" }}>
            {h.bandTitle}
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.88)", margin: "16px 0 0", maxWidth: "48ch", lineHeight: 1.6 }}>
            {h.bandSub}
          </p>
        </div>
      </Photo>
    </section>
  );
}
