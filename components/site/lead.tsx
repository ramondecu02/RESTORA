import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Eyebrow } from "./ui";
import { SiteLeadForm } from "./lead-form";

export function SiteLead({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  return (
    <section id="lead" style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)" }}>
      <div className="mx-auto max-w-[640px]" style={{ padding: "80px 28px" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Eyebrow>{copy.lead.eyebrow}</Eyebrow>
          <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "14px 0 0", textWrap: "balance" }}>
            {copy.lead.title}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 16, margin: "14px 0 0", maxWidth: "42ch" }}>{copy.lead.sub}</p>
        </div>
        <SiteLeadForm lead={copy.lead} locale={locale} />
      </div>
    </section>
  );
}
