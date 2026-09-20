import type { SiteCopy } from "@/lib/site-copy";
import { ShareButtons } from "./share-buttons";

/** Slim "pass it on" band used on the most shareable pages (home, features). */
export function ShareBand({ copy }: { copy: SiteCopy }) {
  return (
    <section className="reveal" style={{ padding: "0 28px clamp(48px, 6vw, 80px)" }}>
      <div
        className="mx-auto max-w-[1280px]"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px 28px",
          padding: "clamp(18px, 2.4vw, 26px) clamp(18px, 2.6vw, 30px)",
          border: "1px solid var(--hair)",
          borderRadius: 20,
          background: "var(--surface)",
        }}
      >
        <div style={{ minWidth: 0, maxWidth: "52ch" }}>
          <div className="display-serif" style={{ fontSize: "clamp(20px, 2.2vw, 26px)" }}>{copy.share.bandTitle}</div>
          <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.55 }}>{copy.share.bandSub}</p>
        </div>
        <ShareButtons share={copy.share} />
      </div>
    </section>
  );
}
