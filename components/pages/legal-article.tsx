import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { LegalCopy } from "@/lib/copy/legal";
import type { Locale } from "@/lib/types";
import { PageHead } from "./page-head";

type Doc = LegalCopy["privacidad"];

/** Clean, readable legal document with the outstanding company data flagged. */
export function LegalArticle({
  doc,
  legal,
  locale,
  otherHref,
  otherLabel,
}: {
  doc: Doc;
  legal: LegalCopy;
  locale: Locale;
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <>
      <PageHead eyebrow={doc.eyebrow} title={doc.title} sub={doc.sub} />

      <section style={{ padding: "clamp(40px, 5vw, 70px) 28px clamp(56px, 7vw, 96px)" }}>
        <div className="mx-auto max-w-[760px]">
          {/* What still has to be filled in — never invented */}
          <div
            className="reveal"
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              padding: "20px 22px",
              borderRadius: 16,
              background: "color-mix(in srgb, var(--earth) 12%, var(--surface))",
              border: "1px solid color-mix(in srgb, var(--earth) 34%, var(--hair))",
            }}
          >
            <AlertCircle size={19} strokeWidth={2} color="var(--earth)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{legal.pendingTitle}</div>
              <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "7px 0 0", lineHeight: 1.6 }}>{legal.pendingNote}</p>
              <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px 18px" }}>
                {legal.pendingFields.map((f) => (
                  <li key={f} className="mono" style={{ fontSize: 13, color: "var(--ink)", display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: "var(--earth)", fontWeight: 700 }}>·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: "clamp(34px, 4.5vw, 54px)" }}>
            {doc.sections.map((s, i) => (
              <article key={s.title} className="reveal" style={{ paddingBottom: 30, marginBottom: 30, borderBottom: i === doc.sections.length - 1 ? "none" : "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.08em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="display-serif" style={{ fontSize: "clamp(21px, 2.4vw, 27px)", margin: 0 }}>{s.title}</h2>
                </div>
                <p style={{ fontSize: 16, color: "var(--muted)", margin: "12px 0 0 34px", lineHeight: 1.75 }}>{s.body}</p>
              </article>
            ))}
          </div>

          <div className="reveal" style={{ marginTop: 34, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            <p style={{ fontSize: 15, color: "var(--ink)", margin: 0 }}>{legal.contactLine}</p>
            <p className="mono" style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>{legal.updated}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
              <Link href={otherHref} className="btn btn-outline" style={{ padding: "12px 20px", fontSize: 14.5 }}>
                {otherLabel}
              </Link>
              <Link href={`/${locale}/contacto`} className="btn btn-brand" style={{ padding: "12px 20px", fontSize: 14.5 }}>
                {legal.contactCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
