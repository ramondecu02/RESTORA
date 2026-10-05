"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { Logo } from "@/components/logo";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_LOGIN_URL, APP_SIGNUP_URL } from "@/lib/site";

function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
const isScrolled = () => window.scrollY > 24;
const notScrolled = () => false;

export function NavClient({
  nav,
  locale,
  overlay = false,
}: {
  nav: SiteCopy["nav"];
  locale: Locale;
  overlay?: boolean;
}) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeScroll, isScrolled, notScrolled);

  // Over a cinematic hero the bar floats transparently until you scroll.
  const transparent = overlay && !scrolled && !open;

  const links = [
    { href: `/${locale}/funcionalidades`, label: nav.features },
    { href: `/${locale}/como-funciona`, label: nav.how },
    { href: `/${locale}/precios`, label: nav.pricing },
    { href: `/${locale}/preguntas`, label: nav.faq },
    // En pantallas medianas no caben todos con «Entrar» y «Probar gratis»: estos dos se ven desde xl (y siempre en el menú y el pie)
    { href: `/${locale}/sobre-nosotros`, label: nav.about, wide: true },
    { href: `/${locale}/contacto`, label: nav.contact, wide: true },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={transparent ? "nav-overlay" : undefined}
      style={{
        // On the cinematic home the bar floats over the hero (out of flow);
        // elsewhere it sticks and reserves its own space.
        position: overlay ? "fixed" : "sticky",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: transparent ? "transparent" : "color-mix(in srgb, var(--bg) 82%, transparent)",
        backdropFilter: transparent ? "none" : "blur(14px)",
        WebkitBackdropFilter: transparent ? "none" : "blur(14px)",
        borderBottom: `1px solid ${transparent ? "transparent" : "var(--hair)"}`,
        transition: "background .35s ease, border-color .35s ease",
      }}
    >
      <nav
        className="mx-auto flex max-w-[1280px] items-center"
        style={{ padding: "14px clamp(14px, 3.4vw, 28px)", gap: "clamp(8px, 1.8vw, 26px)" }}
      >
        <Link href={`/${locale}`} aria-label="RESTORA" style={{ display: "flex", alignItems: "center", color: "inherit" }}>
          <Logo markSize={28} wordmarkSize={19} />
        </Link>
        <div style={{ flex: 1 }} />
        <div className="hidden items-center lg:flex" style={{ gap: "clamp(14px, 1.5vw, 22px)", fontSize: 15, fontWeight: 500, whiteSpace: "nowrap" }}>
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={"wide" in link ? "hidden transition-colors xl:inline" : "transition-colors"}
                style={{ color: active ? "var(--brand)" : "var(--muted)", fontWeight: active ? 600 : 500 }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <LangSwitcher locale={locale} />
        {/* On very narrow screens the theme toggle moves into the menu (see below). */}
        <span className="hidden min-[480px]:inline-flex">
          <ThemeToggle />
        </span>
        <a
          href={APP_LOGIN_URL}
          className="hidden lg:inline-flex"
          style={{ color: "var(--ink)", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}
        >
          {nav.login}
        </a>
        <a
          href={APP_SIGNUP_URL}
          className="btn btn-brand hidden lg:inline-flex"
          style={{ padding: "11px 20px", fontSize: 14.5, whiteSpace: "nowrap" }}
        >
          {nav.trial} →
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
          aria-expanded={open}
          className="inline-flex lg:hidden"
          style={{ alignItems: "center", justifyContent: "center", width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: "1px solid var(--hair)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer" }}
        >
          {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden" style={{ borderTop: "1px solid var(--hair)", background: "var(--bg)" }}>
          <div className="mx-auto max-w-[1280px]" style={{ padding: "10px 20px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Link href={`/${locale}`} onClick={() => setOpen(false)} style={{ padding: "13px 8px", fontSize: 16, fontWeight: pathname === `/${locale}` ? 700 : 500, color: "var(--ink)" }}>
              {nav.home}
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ padding: "13px 8px", fontSize: 16, fontWeight: isActive(link.href) ? 700 : 500, color: isActive(link.href) ? "var(--brand)" : "var(--ink)" }}
              >
                {link.label}
              </Link>
            ))}
            <a href={APP_LOGIN_URL} style={{ padding: "13px 8px", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
              {nav.login}
            </a>
            <a href={APP_SIGNUP_URL} className="btn btn-brand" style={{ marginTop: 10, padding: "13px 20px", fontSize: 15 }}>
              {nav.trial} →
            </a>
            <div className="min-[480px]:hidden" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 8px 4px", fontSize: 14, color: "var(--muted)" }}>
              <span>{nav.theme}</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
