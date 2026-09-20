import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/types";
import { PUBLIC_SLUGS, absoluteUrl } from "@/lib/site";

// Static sitemap (emitted as /sitemap.xml by the Cloudflare export). Every
// public route is listed once per locale with its hreflang alternates.
export const dynamic = "force-static";

const PRIORITY: Record<string, number> = {
  "": 1,
  funcionalidades: 0.9,
  "como-funciona": 0.9,
  precios: 0.9,
  contacto: 0.8,
  preguntas: 0.7,
  "sobre-nosotros": 0.6,
};
const LEGAL = new Set(["privacidad", "rgpd", "aviso-legal", "cookies"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_SLUGS.flatMap((slug) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(locale, slug),
      lastModified,
      changeFrequency: slug === "" ? ("weekly" as const) : LEGAL.has(slug) ? ("yearly" as const) : ("monthly" as const),
      priority: PRIORITY[slug] ?? 0.3,
      alternates: {
        languages: {
          es: absoluteUrl("es", slug),
          ca: absoluteUrl("ca", slug),
          "x-default": absoluteUrl("es", slug),
        },
      },
    })),
  );
}
