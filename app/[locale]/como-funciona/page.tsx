import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { PageHero } from "@/components/site/page-hero";
import { SiteInteligencia } from "@/components/site/inteligencia";
import { SiteConexion } from "@/components/site/conexion";
import { CtaBand } from "@/components/site/cta-band";
import { SiteFooter } from "@/components/site/footer";

export default async function ComoFuncionaPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const p = copy.pages.comoFunciona;

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHero eyebrow={p.eyebrow} title={p.title} sub={p.sub} photo="/images/chef.jpg" photoAlt="Chef en la cocina" />
        <SiteInteligencia copy={copy} />
        <SiteConexion copy={copy} />
        <CtaBand copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}
