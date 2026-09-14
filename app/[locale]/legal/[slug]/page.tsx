import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale, type Locale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

const SLUGS = ["privacidad", "rgpd"] as const;
type Slug = (typeof SLUGS)[number];

const COPY: Record<Slug, Record<Locale, { title: string; body: string }>> = {
  privacidad: {
    es: {
      title: "Política de privacidad",
      body: "Este documento está en preparación. Para cualquier cuestión sobre el tratamiento de tus datos, escríbenos a hola@restoraapp.com.",
    },
    ca: {
      title: "Política de privacitat",
      body: "Aquest document està en preparació. Per a qualsevol qüestió sobre el tractament de les teves dades, escriu-nos a hola@restoraapp.com.",
    },
  },
  rgpd: {
    es: {
      title: "Aviso RGPD",
      body: "Este documento está en preparación. Tratamos los datos de este formulario solo para contactarte sobre el programa de socios fundadores. Escríbenos a hola@restoraapp.com para ejercer tus derechos.",
    },
    ca: {
      title: "Avís RGPD",
      body: "Aquest document està en preparació. Tractem les dades d'aquest formulari només per contactar-te sobre el programa de socis fundadors. Escriu-nos a hola@restoraapp.com per exercir els teus drets.",
    },
  },
};

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default async function LegalPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  if (!SLUGS.includes(slug as Slug)) notFound();
  const siteCopy = getSiteCopy(locale);
  const copy = COPY[slug as Slug][locale];

  return (
    <>
      <SiteNav copy={siteCopy} locale={locale} />
      <main id="top" className="mx-auto max-w-[720px]" style={{ padding: "72px 28px 96px", minHeight: "60vh" }}>
        <h1 className="display" style={{ fontSize: "clamp(30px, 5vw, 46px)", margin: 0 }}>
          {copy.title}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17, margin: "20px 0 0", maxWidth: "52ch" }}>{copy.body}</p>
        <p style={{ marginTop: 28 }}>
          <a href={`/${locale}`} className="btn btn-outline" style={{ padding: "12px 20px", fontSize: 15 }}>
            ← RESTORA
          </a>
        </p>
      </main>
      <SiteFooter copy={siteCopy} locale={locale} />
    </>
  );
}
