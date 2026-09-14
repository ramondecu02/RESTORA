import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { getLegal } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { LegalArticle } from "@/components/pages/legal-article";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const legal = getLegal(isLocale(locale) ? locale : "es");
  return { title: `${legal.privacidad.title} · RESTORA`, description: legal.privacidad.sub };
}

export default async function PrivacidadPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const legal = getLegal(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <LegalArticle
          doc={legal.privacidad}
          legal={legal}
          locale={locale}
          otherHref={`/${locale}/rgpd`}
          otherLabel={legal.rgpd.title}
        />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}
