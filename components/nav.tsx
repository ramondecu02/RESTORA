import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/types";
import { Logo } from "./logo";
import { LangSwitcher } from "./lang-switcher";
import { ThemeToggle } from "./theme-toggle";

export function Nav({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const links = [
    { href: "#howto", label: dict.nav.l1 },
    { href: "#showcase", label: dict.nav.l2 },
    { href: "#pricing", label: dict.nav.l3 },
    { href: "#faq", label: dict.nav.l4 },
  ];

  return (
    <>
      {/* Utility bar */}
      <div
        className="mono"
        style={{
          background: "var(--ink)",
          color: "color-mix(in srgb, var(--bg) 74%, transparent)",
          fontSize: 11.5,
          letterSpacing: "0.04em",
        }}
      >
        <div
          className="mx-auto flex max-w-[1200px] flex-wrap items-center"
          style={{ padding: "8px 28px", gap: "8px 22px" }}
        >
          <span style={{ color: "var(--brand)" }}>● V1 · CATALUNYA</span>
          <span style={{ opacity: 0.5 }}>{dict.util.thesis}</span>
          <div style={{ flex: 1 }} />
          <span>{dict.util.slots}</span>
        </div>
      </div>

      {/* Sticky nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "color-mix(in srgb, var(--bg) 90%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <nav
          className="mx-auto flex max-w-[1200px] items-center"
          style={{ padding: "15px 28px", gap: 26 }}
        >
          <Logo href="#top" />
          <div style={{ flex: 1 }} />
          <div className="hidden flex-wrap items-center md:flex" style={{ gap: 22, fontSize: 14.5, fontWeight: 500 }}>
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
            style={{ padding: "10px 18px", fontSize: 14, whiteSpace: "nowrap" }}
          >
            {dict.nav.cta}
          </a>
        </nav>
      </header>
    </>
  );
}
