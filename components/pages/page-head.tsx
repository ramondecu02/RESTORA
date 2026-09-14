import type { ReactNode } from "react";

/**
 * Editorial masthead shared by every sub-page: a rule, an eyebrow, a serif
 * headline on the left and the standfirst on the right. Same grammar as the
 * home page, different rhythm — so pages feel like chapters, not clones.
 */
export function PageHead({
  eyebrow,
  title,
  sub,
  note,
  aside,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  note?: string;
  aside?: ReactNode;
}) {
  return (
    <section style={{ borderBottom: "1px solid var(--hair)" }}>
      <div
        className="mx-auto max-w-[1280px]"
        style={{ padding: "clamp(48px, 6.5vw, 92px) 28px clamp(34px, 4.5vw, 58px)" }}
      >
        <div className="rise-in editorial-eyebrow" style={{ color: "var(--brand)" }}>
          {eyebrow}
        </div>
        <div
          className="grid items-end lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
          style={{ gap: "clamp(20px, 3vw, 56px)", marginTop: 18 }}
        >
          <h1
            className="display-serif rise-in"
            style={{ animationDelay: "0.06s", fontSize: "clamp(36px, 5.4vw, 66px)", margin: 0, maxWidth: "15ch" }}
          >
            {title}
          </h1>
          <div className="rise-in" style={{ animationDelay: "0.14s" }}>
            <p style={{ fontSize: 17.5, color: "var(--muted)", margin: 0, lineHeight: 1.65, maxWidth: "46ch" }}>{sub}</p>
            {note && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 18,
                  fontSize: 12.5,
                  color: "var(--ink)",
                  background: "var(--brand-soft)",
                  border: "1px solid color-mix(in srgb, var(--brand) 26%, var(--hair))",
                  borderRadius: 999,
                  padding: "7px 14px",
                }}
              >
                <span style={{ color: "var(--brand)", fontWeight: 700 }}>◆</span>
                {note}
              </div>
            )}
            {aside}
          </div>
        </div>
      </div>
    </section>
  );
}
