import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/types";
import { LeadForm } from "../lead-form";

export function Lead({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <section id="lead" style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)" }}>
      <div className="mx-auto max-w-[640px]" style={{ padding: "76px 28px" }}>
        <div style={{ textAlign: "center" }}>
          <div
            className="mono"
            style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 600 }}
          >
            08 / {dict.lead.kicker}
          </div>
          <h2
            className="display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(32px, 5.4vw, 56px)",
              lineHeight: 0.96,
              margin: "14px 0 0",
              textWrap: "balance",
            }}
          >
            {dict.lead.title}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 16, margin: "14px 0 0" }}>{dict.lead.sub}</p>
        </div>
        <LeadForm dict={dict} locale={locale} />
      </div>
    </section>
  );
}
