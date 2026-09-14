import Link from "next/link";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { LangSwitcher } from "@/components/lang-switcher";

// Fixed deep-green footer (consistent in both themes).
const BG = "#12211a";
const TXT = "rgba(237,241,236,0.72)";
const HEAD = "rgba(237,241,236,0.45)";

export function SiteFooter({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const colTitle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: HEAD,
    fontWeight: 600,
  };
  const link: React.CSSProperties = { color: TXT, fontSize: 14 };

  return (
    <footer style={{ background: BG, color: TXT }}>
      <div className="mx-auto grid max-w-[1200px] items-start" style={{ padding: "56px 28px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 64 64" style={{ borderRadius: 8 }} aria-hidden="true">
              <rect width="64" height="64" rx="16" fill="#3E8E6A" />
              <polyline points="17,42 27,35 35,38 46,22" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="46" cy="22" r="4.4" fill="#fff" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "0.16em", color: "#fff" }}>RESTORA</span>
          </div>
          <p style={{ fontSize: 14, margin: "14px 0 0", maxWidth: "30ch", lineHeight: 1.6 }}>{copy.footer.tagline}</p>
          <div style={{ fontSize: 12.5, marginTop: 16, color: "#7fc4a3", fontWeight: 500 }}>◆ {copy.footer.made}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={colTitle}>{copy.footer.colProduct}</div>
          <Link href={`/${locale}/funcionalidades`} style={link}>{copy.nav.features}</Link>
          <Link href={`/${locale}/como-funciona`} style={link}>{copy.nav.how}</Link>
          <Link href={`/${locale}/precios`} style={link}>{copy.nav.pricing}</Link>
          <Link href={`/${locale}/preguntas`} style={link}>{copy.nav.faq}</Link>
          <Link href={`/${locale}/contacto`} style={link}>{copy.nav.contact}</Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={colTitle}>{copy.footer.colLegal}</div>
          <Link href={`/${locale}/privacidad`} style={link}>{copy.footer.privacy}</Link>
          <Link href={`/${locale}/rgpd`} style={link}>{copy.footer.rgpd}</Link>
          <a href="mailto:hola@restoraapp.com" style={link}>{copy.footer.contact}</a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={colTitle}>{copy.footer.colLang}</div>
          <LangSwitcher locale={locale} variant="footer" />
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(237,241,236,0.12)" }}>
        <div className="mx-auto max-w-[1200px]" style={{ padding: "18px 28px", fontSize: 12.5, color: HEAD }}>
          © 2026 RESTORA · {copy.footer.rights}
        </div>
      </div>
    </footer>
  );
}
