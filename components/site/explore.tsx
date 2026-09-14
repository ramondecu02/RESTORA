import Link from "next/link";
import { ArrowRight, Boxes, HelpCircle, Tag, Workflow } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Eyebrow } from "./ui";

const CARD_ICONS: Record<string, typeof Boxes> = {
  funcionalidades: Boxes,
  "como-funciona": Workflow,
  precios: Tag,
  preguntas: HelpCircle,
};

// Home hub: a card per section, each linking to its own page.
export function SiteExplore({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const h = copy.home;
  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "16px 28px 84px" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Eyebrow>{h.exploreEyebrow}</Eyebrow>
        <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "16px 0 0", textWrap: "balance" }}>
          {h.exploreTitle}
        </h2>
        <p style={{ fontSize: 17, color: "var(--muted)", margin: "14px 0 0", maxWidth: "48ch" }}>{h.exploreSub}</p>
      </div>

      <div
        style={{
          marginTop: 44,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {h.cards.map((card) => {
          const Icon = CARD_ICONS[card.key] ?? Boxes;
          return (
            <Link
              key={card.key}
              href={`/${locale}/${card.key}`}
              className="card hover-lift reveal"
              style={{ padding: 26, display: "flex", flexDirection: "column", color: "var(--ink)", minHeight: 210 }}
            >
              <span className="icon-badge">
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <div className="display" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontWeight: 700, fontSize: 20, margin: "18px 0 8px" }}>
                {card.title}
                <ArrowRight size={18} strokeWidth={2} color="var(--brand)" style={{ flexShrink: 0 }} />
              </div>
              <p style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.55, flex: 1 }}>{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
