import Link from "next/link";
import { ArrowRight, Boxes, HelpCircle, Tag, Workflow } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Eyebrow } from "./ui";
import { Photo } from "./photo";

const CARD_ICONS: Record<string, typeof Boxes> = {
  funcionalidades: Boxes,
  "como-funciona": Workflow,
  precios: Tag,
  preguntas: HelpCircle,
};

const CARD_PHOTOS: Record<string, { src: string; focal?: string }> = {
  funcionalidades: { src: "/images/producto.webp" },
  "como-funciona": { src: "/images/plating-line.webp" },
  precios: { src: "/images/mesa.webp" },
  preguntas: { src: "/images/sala.webp" },
};

// Home hub: a card per section, each linking to its own page.
export function SiteExplore({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const h = copy.home;
  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "16px 28px 84px" }}>
      <div className="reveal" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Eyebrow>{h.exploreEyebrow}</Eyebrow>
        <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "16px 0 0", textWrap: "balance" }}>
          {h.exploreTitle}
        </h2>
        <p style={{ fontSize: 17, color: "var(--muted)", margin: "14px 0 0", maxWidth: "48ch" }}>{h.exploreSub}</p>
      </div>

      <div
        className="reveal-group"
        style={{
          marginTop: 44,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {h.cards.map((card) => {
          const Icon = CARD_ICONS[card.key] ?? Boxes;
          const photo = CARD_PHOTOS[card.key];
          return (
            <Link
              key={card.key}
              href={`/${locale}/${card.key}`}
              className="card hover-lift"
              style={{ overflow: "hidden", display: "flex", flexDirection: "column", color: "var(--ink)" }}
            >
              {photo && (
                <Photo
                  src={photo.src}
                  alt={card.title}
                  radius={0}
                  focal={photo.focal ?? "center"}
                  sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 300px"
                  zoom
                  style={{ aspectRatio: "16 / 10", width: "100%", border: "none", borderBottom: "1px solid var(--hair)" }}
                >
                  <span
                    className="icon-badge"
                    style={{ position: "absolute", left: 14, bottom: 14, width: 40, height: 40, borderRadius: 11, background: "color-mix(in srgb, var(--surface) 92%, transparent)", backdropFilter: "blur(6px)" }}
                  >
                    <Icon size={19} strokeWidth={1.7} />
                  </span>
                </Photo>
              )}
              <div style={{ padding: 22, display: "flex", flexDirection: "column", flex: 1 }}>
                <div className="display" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontWeight: 700, fontSize: 19 }}>
                  {card.title}
                  <ArrowRight size={18} strokeWidth={2} color="var(--brand)" style={{ flexShrink: 0 }} />
                </div>
                <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.55, flex: 1 }}>{card.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
