import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Logo } from "@/components/logo";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const links = [
    { href: "#funcionalidades", label: copy.nav.features },
    { href: "#como-funciona", label: copy.nav.how },
    { href: "#pricing", label: copy.nav.pricing },
    { href: "#faq", label: copy.nav.faq },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in srgb, var(--bg) 82%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--hair)",
      }}
    >
      <nav className="mx-auto flex max-w-[1200px] items-center" style={{ padding: "16px 28px", gap: 26 }}>
        <Logo href="#top" markSize={28} wordmarkSize={19} />
        <div style={{ flex: 1 }} />
        <div className="hidden flex-wrap items-center md:flex" style={{ gap: 26, fontSize: 15, fontWeight: 500 }}>
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-muted transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
        </div>
        <LangSwitcher locale={locale} />
        <ThemeToggle />
        <a
          href="#lead"
          className="btn btn-brand"
          style={{ padding: "11px 20px", fontSize: 14.5, whiteSpace: "nowrap" }}
        >
          {copy.nav.cta} →
        </a>
      </nav>
    </header>
  );
}
