import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { PageHero } from "@/components/site/page-hero";
import { SiteFeatures } from "@/components/site/features";
import { FeatureSection } from "@/components/site/feature-section";
import { ProveedoresMock } from "@/components/site/proveedores-mock";
import { EscandalloMock } from "@/components/site/escandallo-mock";
import { CtaBand } from "@/components/site/cta-band";
import { SiteFooter } from "@/components/site/footer";

export default async function FuncionalidadesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const p = copy.pages.funcionalidades;

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHero eyebrow={p.eyebrow} title={p.title} sub={p.sub} photo="/images/chef2.jpg" photoAlt="Chef trabajando en cocina" />
        <SiteFeatures copy={copy} locale={locale} />
        <FeatureSection
          id="proveedores"
          eyebrow={copy.proveedores.eyebrow}
          title={copy.proveedores.title}
          sub={copy.proveedores.sub}
          ctaLabel={copy.proveedores.cta}
          ctaHref={`/${locale}/contacto`}
          visual={<ProveedoresMock />}
        />
        <FeatureSection
          id="escandallos"
          eyebrow={copy.escandallos.eyebrow}
          title={copy.escandallos.title}
          sub={copy.escandallos.sub}
          ctaLabel={copy.escandallos.cta}
          ctaHref={`/${locale}/contacto`}
          visual={<EscandalloMock />}
          reverse
          panel
        />
        <CtaBand copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}
