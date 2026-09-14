import type { Locale } from "@/lib/types";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/app/[locale]/admin/actions";

export function AdminHeader({ locale }: { locale: Locale }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--hair)",
      }}
    >
      <div
        className="mx-auto flex max-w-[1120px] items-center"
        style={{ padding: "13px 28px", gap: 14 }}
      >
        <Logo href={`/${locale}`} markSize={28} wordmarkSize={20} />
        <span className="mono-label hidden sm:inline">· Panel de leads</span>
        <div style={{ flex: 1 }} />
        <a href={`/${locale}`} className="text-muted transition-colors hover:text-ink" style={{ fontSize: 14 }}>
          Ver web ↗
        </a>
        <ThemeToggle />
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn-outline" style={{ padding: "8px 16px", fontSize: 14 }}>
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
