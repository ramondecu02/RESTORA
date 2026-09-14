"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/types";

function rememberLocale(target: Locale) {
  try {
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* ignore */
  }
}

/**
 * Switches locale in place: replaces the leading /es or /ca segment of the
 * current path and stores the choice in a cookie for future visits.
 */
export function LangSwitcher({
  locale,
  variant = "nav",
}: {
  locale: Locale;
  variant?: "nav" | "footer";
}) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/(es|ca)(?=\/|$)/, "") || "";

  const labels: Record<Locale, { nav: string; footer: string }> = {
    es: { nav: "ES", footer: "Castellano" },
    ca: { nav: "CA", footer: "Català" },
  };

  if (variant === "footer") {
    return (
      <div
        className="mono"
        style={{
          display: "inline-flex",
          gap: 6,
          border: "1px solid color-mix(in srgb, var(--bg) 28%, transparent)",
          borderRadius: 999,
          padding: 4,
          width: "fit-content",
          fontSize: 12,
        }}
      >
        {LOCALES.map((target) => {
          const active = target === locale;
          return (
            <Link
              key={target}
              href={`/${target}${rest}`}
              onClick={() => rememberLocale(target)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontWeight: active ? 600 : 400,
                background: active ? "var(--brand)" : "transparent",
                color: active ? "#14160E" : "inherit",
              }}
            >
              {labels[target].footer}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        border: "1px solid var(--hair)",
        borderRadius: 999,
        padding: 3,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {LOCALES.map((target) => {
        const active = target === locale;
        return (
          <Link
            key={target}
            href={`/${target}${rest}`}
            onClick={() => rememberLocale(target)}
            aria-current={active ? "true" : undefined}
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontWeight: active ? 600 : 500,
              background: active ? "var(--brand)" : "transparent",
              color: active ? "var(--on-brand)" : "var(--muted)",
            }}
          >
            {labels[target].nav}
          </Link>
        );
      })}
    </div>
  );
}
