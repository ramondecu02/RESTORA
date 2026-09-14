"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Logo } from "@/components/logo";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);

  const links = [
    { href: `/${locale}/funcionalidades`, label: copy.nav.features },
    { href: `/${locale}/como-funciona`, label: copy.nav.how },
    { href: `/${locale}/precios`, label: copy.nav.pricing },
    { href: `/${locale}/preguntas`, label: copy.nav.faq },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
        <Link href={`/${locale}`} aria-label="RESTORA" style={{ display: "flex", alignItems: "center", color: "inherit" }}>
          <Logo markSize={28} wordmarkSize={19} />
        </Link>
        <div style={{ flex: 1 }} />
        <div className="hidden flex-wrap items-center md:flex" style={{ gap: 26, fontSize: 15, fontWeight: 500 }}>
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="transition-colors"
                style={{ color: active ? "var(--brand)" : "var(--muted)", fontWeight: active ? 600 : 500 }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <LangSwitcher locale={locale} />
        <ThemeToggle />
        <Link
          href={`/${locale}/contacto`}
          className="btn btn-brand hidden md:inline-flex"
          style={{ padding: "11px 20px", fontSize: 14.5, whiteSpace: "nowrap" }}
        >
          {copy.nav.cta} →
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
          aria-expanded={open}
          className="inline-flex md:hidden"
          style={{ alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, border: "1px solid var(--hair)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer" }}
        >
          {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden" style={{ borderTop: "1px solid var(--hair)", background: "var(--bg)" }}>
          <div className="mx-auto max-w-[1200px]" style={{ padding: "10px 20px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Link href={`/${locale}`} onClick={() => setOpen(false)} style={{ padding: "12px 8px", fontSize: 16, fontWeight: isActive(`/${locale}`) && pathname === `/${locale}` ? 700 : 500, color: "var(--ink)" }}>
              {copy.nav.home}
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ padding: "12px 8px", fontSize: 16, fontWeight: isActive(link.href) ? 700 : 500, color: isActive(link.href) ? "var(--brand)" : "var(--ink)" }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/contacto`}
              onClick={() => setOpen(false)}
              className="btn btn-brand"
              style={{ marginTop: 10, padding: "13px 20px", fontSize: 15 }}
            >
              {copy.nav.cta} →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
