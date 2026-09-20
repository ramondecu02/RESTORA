import type { Metadata } from "next";
import { LOCALES, type Locale } from "./types";
import { SITE_NAME, absoluteUrl } from "./site";

// Shared Open Graph image (1200×630, generated from the hero photo).
export const OG_IMAGE = { url: "/og/restora-og.jpg", width: 1200, height: 630, alt: "RESTORA · control de food cost para restaurantes" };

/** Canonical + hreflang set for one page (same slug in every locale). */
export function localeAlternates(locale: Locale, slug: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(l, slug);
  languages["x-default"] = absoluteUrl("es", slug);
  return { canonical: absoluteUrl(locale, slug), languages };
}

/**
 * Per-page metadata: title/description plus a correct canonical, hreflang and
 * Open Graph block. Pages call this from generateMetadata so every route has
 * its own URL in the tags (a layout-level canonical would point them all home).
 */
export function pageMetadata(locale: Locale, slug: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: localeAlternates(locale, slug),
    openGraph: {
      title,
      description,
      url: absoluteUrl(locale, slug),
      siteName: SITE_NAME,
      locale: locale === "ca" ? "ca_ES" : "es_ES",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
