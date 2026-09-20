import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { getLegal } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { pageMetadata } from "@/lib/seo";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { LegalArticle, legalRelated } from "@/components/pages/legal-article";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const typed = isLocale(locale) ? locale : "es";
  const legal = getLegal(typed);
  return pageMetadata(typed, "aviso-legal", `${legal.avisoLegal.title} · RESTORA`, legal.avisoLegal.sub);
}

export default async function AvisoLegalPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const legal = getLegal(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <LegalArticle doc={legal.avisoLegal} legal={legal} locale={locale} related={legalRelated(legal, locale, "aviso-legal")} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}
