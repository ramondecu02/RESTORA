import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { LangSwitcher } from "@/components/lang-switcher";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164, activeSocialLinks, whatsappUrl } from "@/lib/site";
import { QuickContact } from "./quick-contact";
import { SOCIAL_ICONS, WhatsAppIcon } from "./social-icons";
import { TrustBadges } from "./trust-badges";

// Fixed deep-green footer (consistent in both themes).
const BG = "#12211a";
const TXT = "rgba(237,241,236,0.72)";
const HEAD = "rgba(237,241,236,0.64)"; // ≥ 4.5:1 on the footer green (a11y)
const RULE = "1px solid rgba(237,241,236,0.12)";

export function SiteFooter({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const colTitle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: HEAD,
    fontWeight: 600,
  };
  const link: React.CSSProperties = { color: TXT, fontSize: 14, display: "inline-block", padding: "3px 0" };
  const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 };
  const social = activeSocialLinks();
  const wa = whatsappUrl(locale);

  return (
    <footer style={{ background: BG, color: TXT }}>
      {/* Light-touch contact: a question, not a demo request */}
      <div style={{ borderBottom: RULE }}>
        <div
          className="mx-auto grid max-w-[1200px] items-start lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          style={{ padding: "clamp(44px, 5.5vw, 68px) 28px", gap: "clamp(26px, 4vw, 60px)" }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="editorial-eyebrow" style={{ color: "#7fc4a3" }}>{copy.quick.eyebrow}</div>
            <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(25px, 3vw, 36px)", margin: "14px 0 0", maxWidth: "18ch" }}>
              {copy.quick.title}
            </h2>
            <p style={{ fontSize: 15.5, margin: "14px 0 0", lineHeight: 1.6, maxWidth: "44ch" }}>{copy.quick.sub}</p>
            <ul className="footer-channels">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>
                  <Mail size={17} strokeWidth={1.9} />
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT_PHONE_E164}`}>
                  <Phone size={17} strokeWidth={1.9} />
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon size={18} />
                  {copy.footer.whatsappCta}
                </a>
              </li>
            </ul>
          </div>
          <QuickContact quick={copy.quick} locale={locale} tone="dark" />
        </div>
      </div>

      <div
        className="mx-auto grid max-w-[1200px] items-start"
        style={{ padding: "52px 28px 36px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 28 }}
      >
        <div style={{ minWidth: 0 }}>
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

          {/* Social profiles. URLs live in lib/site.ts (SOCIAL_LINKS): with no
              URL configured nothing is rendered — we never link to profiles
              that don't exist yet. TODO(Ramon): añadir las URLs reales. */}
          {social.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={colTitle}>{copy.footer.social}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {social.map((s) => {
                  const Icon = SOCIAL_ICONS[s.key];
                  return (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="share-btn share-btn--dark">
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={col}>
          <div style={{ ...colTitle, marginBottom: 5 }}>{copy.footer.colProduct}</div>
          <Link href={`/${locale}/funcionalidades`} style={link}>{copy.nav.features}</Link>
          <Link href={`/${locale}/como-funciona`} style={link}>{copy.nav.how}</Link>
          <Link href={`/${locale}/precios`} style={link}>{copy.nav.pricing}</Link>
          <Link href={`/${locale}/preguntas`} style={link}>{copy.nav.faq}</Link>
          <Link href={`/${locale}/sobre-nosotros`} style={link}>{copy.footer.about}</Link>
          <Link href={`/${locale}/contacto`} style={link}>{copy.nav.contact}</Link>
        </div>

        <div style={col}>
          <div style={{ ...colTitle, marginBottom: 5 }}>{copy.footer.colLegal}</div>
          <Link href={`/${locale}/aviso-legal`} style={link}>{copy.footer.legal}</Link>
          <Link href={`/${locale}/privacidad`} style={link}>{copy.footer.privacy}</Link>
          <Link href={`/${locale}/cookies`} style={link}>{copy.footer.cookies}</Link>
          <Link href={`/${locale}/rgpd`} style={link}>{copy.footer.rgpd}</Link>
        </div>

        <div style={col}>
          <div style={{ ...colTitle, marginBottom: 5 }}>{copy.footer.colContact}</div>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ ...link, color: "#fff", wordBreak: "break-word" }}>{CONTACT_EMAIL}</a>
          <a href={`tel:${CONTACT_PHONE_E164}`} style={{ ...link, color: "#fff" }}>{CONTACT_PHONE_DISPLAY}</a>
          <a href={wa} target="_blank" rel="noopener noreferrer" style={link}>{copy.footer.whatsapp} →</a>
          <div style={{ ...colTitle, margin: "14px 0 5px" }}>{copy.footer.colLang}</div>
          <LangSwitcher locale={locale} variant="footer" />
        </div>
      </div>

      <div className="mx-auto max-w-[1200px]" style={{ padding: "0 28px 30px" }}>
        <TrustBadges trust={copy.trust} tone="dark" compact />
      </div>

      <div style={{ borderTop: RULE }}>
        <div className="mx-auto max-w-[1200px]" style={{ padding: "18px 28px", fontSize: 12.5, color: HEAD, display: "flex", flexWrap: "wrap", gap: "6px 18px", justifyContent: "space-between" }}>
          <span>© 2026 RESTORA · {copy.footer.rights}</span>
          <span>{copy.footer.made}</span>
        </div>
      </div>
    </footer>
  );
}
