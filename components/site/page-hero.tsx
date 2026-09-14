import { Eyebrow } from "./ui";
import { Photo } from "./photo";

// Sub-page header. Optional background photo (with overlay for legibility).
export function PageHero({
  eyebrow,
  title,
  sub,
  photo,
  photoAlt,
  focal,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  photo?: string;
  photoAlt?: string;
  focal?: string;
}) {
  if (photo) {
    return (
      <section className="reveal" style={{ padding: "28px 28px 0" }}>
        <Photo
          src={photo}
          alt={photoAlt ?? title}
          radius={24}
          focal={focal ?? "center"}
          zoom
          className="mx-auto max-w-[1200px]"
          style={{ minHeight: 340, display: "flex", alignItems: "flex-end" }}
        >
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,18,14,0.78) 0%, rgba(10,18,14,0.35) 55%, rgba(10,18,14,0.15) 100%)" }} />
          <div style={{ position: "relative", padding: "clamp(28px, 5vw, 56px)", maxWidth: 640 }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
              {eyebrow}
            </div>
            <h1 className="display" style={{ fontSize: "clamp(34px, 5vw, 54px)", margin: "14px 0 0", color: "#fff", textWrap: "balance" }}>
              {title}
            </h1>
            {sub && <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", margin: "16px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>{sub}</p>}
          </div>
        </Photo>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "72px 28px 8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="display" style={{ fontSize: "clamp(34px, 5vw, 54px)", margin: "16px 0 0", maxWidth: "18ch", textWrap: "balance" }}>
        {title}
      </h1>
      {sub && <p style={{ fontSize: 18, color: "var(--muted)", margin: "18px 0 0", maxWidth: "52ch", lineHeight: 1.6 }}>{sub}</p>}
    </section>
  );
}
