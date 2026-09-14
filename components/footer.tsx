import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/types";
import { LangSwitcher } from "./lang-switcher";

function FooterMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" style={{ borderRadius: 8 }} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <circle cx="32" cy="35" r="17" fill="none" stroke="#14160E" strokeWidth="2.5" opacity=".38" />
      <polyline
        points="19,41 27,35 35,38 45,23"
        fill="none"
        stroke="#14160E"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="23" r="4.2" fill="#14160E" />
    </svg>
  );
}

export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const colTitle = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    opacity: 0.55,
  };

  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "color-mix(in srgb, var(--bg) 70%, transparent)",
      }}
    >
      <div
        className="mx-auto grid max-w-[1200px] items-start"
        style={{
          padding: "52px 28px",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 28,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <FooterMark />
            <span
              className="display"
              style={{ fontWeight: 800, fontSize: 25, letterSpacing: "0.03em", color: "var(--bg)" }}
            >
              RESTORA
            </span>
          </div>
          <p style={{ fontSize: 14, margin: "14px 0 0", maxWidth: "30ch" }}>{dict.footer.tagline}</p>
          <div className="mono" style={{ fontSize: 12, marginTop: 16, color: "var(--brand)" }}>
            ◆ {dict.footer.made}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={colTitle}>{dict.footer.colProduct}</div>
          <a href="#howto" style={{ color: "inherit" }}>{dict.nav.l1}</a>
          <a href="#showcase" style={{ color: "inherit" }}>{dict.nav.l2}</a>
          <a href="#pricing" style={{ color: "inherit" }}>{dict.nav.l3}</a>
          <a href="#faq" style={{ color: "inherit" }}>{dict.nav.l4}</a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={colTitle}>{dict.footer.colLegal}</div>
          <a href={`/${locale}/legal/privacidad`} style={{ color: "inherit" }}>{dict.footer.privacy}</a>
          <a href={`/${locale}/legal/rgpd`} style={{ color: "inherit" }}>{dict.footer.rgpd}</a>
          <a href="mailto:hola@restoraapp.com" style={{ color: "inherit" }}>{dict.footer.contact}</a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={colTitle}>{dict.footer.colLang}</div>
          <LangSwitcher locale={locale} variant="footer" />
        </div>
      </div>

      <div style={{ borderTop: "1px solid color-mix(in srgb, var(--bg) 14%, transparent)" }}>
        <div
          className="mono mx-auto max-w-[1200px]"
          style={{ padding: "18px 28px", fontSize: 11.5, opacity: 0.55 }}
        >
          © 2026 RESTORA · {dict.footer.rights}
        </div>
      </div>
    </footer>
  );
}
