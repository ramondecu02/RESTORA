import type { Locale } from "./types";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import { getSiteCopy } from "./site-copy";
import { getPreguntas } from "./pages-copy";

// Datos estructurados (schema.org) de la web. Solo lo que la web ya dice: sin precios, sin valoraciones y sin datos de empresa
// (la razón social, el NIF y el domicilio están pendientes). Cuando se confirmen los planes (D1) se pueden añadir `offers`.

const lang = (locale: Locale) => (locale === "ca" ? "ca-ES" : "es-ES");

/** Inicio: la web y el producto. */
export function softwareLd(locale: Locale) {
  const copy = getSiteCopy(locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#web`, url: absoluteUrl(locale, ""), name: SITE_NAME, inLanguage: lang(locale) },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        url: absoluteUrl(locale, ""),
        description: copy.meta.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: lang(locale),
      },
    ],
  };
}

/** Preguntas: las mismas preguntas y respuestas que se ven en la página. */
export function faqLd(locale: Locale) {
  const items = getPreguntas(locale).groups.flatMap((g) => g.items);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang(locale),
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}
