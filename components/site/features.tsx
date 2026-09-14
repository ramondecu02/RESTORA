import Link from "next/link";
import { FileText } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { ICONS } from "./icons";
import { Eyebrow } from "./ui";

export function SiteFeatures({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  return (
    <section id="funcionalidades" style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }}>
      <div
        className="mx-auto max-w-[1200px]"
        style={{ padding: "80px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 44, alignItems: "start" }}
      >
        {/* Heading */}
        <div className="reveal" style={{ position: "sticky", top: 100 }}>
          <Eyebrow>{copy.features.eyebrow}</Eyebrow>
          <h2 className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)", margin: "16px 0 0", maxWidth: "12ch", textWrap: "balance" }}>
            {copy.features.title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", margin: "18px 0 0", maxWidth: "42ch", lineHeight: 1.6 }}>
            {copy.features.sub}
          </p>
          <Link href={`/${locale}/contacto`} className="btn btn-brand" style={{ padding: "13px 22px", fontSize: 15, marginTop: 26 }}>
            {copy.features.cta} →
          </Link>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {copy.features.cards.map((card) => {
            const Icon = ICONS[card.icon] ?? FileText;
            return (
              <div key={card.title} className="card hover-lift reveal" style={{ padding: 22 }}>
                <span className="icon-badge">
                  <Icon size={20} strokeWidth={1.7} />
                </span>
                <div style={{ fontWeight: 700, fontSize: 17, margin: "16px 0 10px" }}>{card.title}</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {card.items.map((it) => (
                    <li key={it} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "var(--muted)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", marginTop: 7, flexShrink: 0 }} />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
