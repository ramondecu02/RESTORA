import { Check } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { NewsletterSignup } from "./newsletter";

/** Lead-magnet section: what the checklist covers + the sign-up card. */
export function NewsletterSection({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const nl = copy.newsletter;
  return (
    <section style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)", padding: "clamp(52px, 6.5vw, 92px) 28px" }}>
      <div className="mx-auto grid max-w-[1180px] items-center lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" style={{ gap: "clamp(28px, 4.5vw, 64px)" }}>
        <div className="reveal" style={{ minWidth: 0 }}>
          <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{nl.eyebrow}</div>
          <h2 className="display-serif" style={{ fontSize: "clamp(27px, 3.4vw, 42px)", margin: "16px 0 0", maxWidth: "20ch" }}>{nl.title}</h2>
          <p style={{ fontSize: 16.5, color: "var(--muted)", margin: "16px 0 0", lineHeight: 1.65, maxWidth: "52ch" }}>{nl.sub}</p>
          <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "10px 22px" }}>
            {nl.bullets.map((b) => (
              <li key={b} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14.5, fontWeight: 600 }}>
                <Check size={16} strokeWidth={2.6} color="var(--brand)" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal" style={{ minWidth: 0 }}>
          <NewsletterSignup nl={nl} locale={locale} />
        </div>
      </div>
    </section>
  );
}
