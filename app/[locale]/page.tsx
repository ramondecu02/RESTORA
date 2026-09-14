import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { FloatingCta } from "@/components/floating-cta";
import { SiteNav } from "@/components/site/nav";
import { SiteHero } from "@/components/site/hero";
import { SiteProblem } from "@/components/site/problem";
import { SiteFeatures } from "@/components/site/features";
import { FeatureSection } from "@/components/site/feature-section";
import { ProveedoresMock } from "@/components/site/proveedores-mock";
import { EscandalloMock } from "@/components/site/escandallo-mock";
import { SiteInteligencia } from "@/components/site/inteligencia";
import { SiteConexion } from "@/components/site/conexion";
import { SitePricing } from "@/components/site/pricing";
import { SiteFaq } from "@/components/site/faq";
import { SiteLead } from "@/components/site/lead";
import { SiteFooter } from "@/components/site/footer";

export default async function LandingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main id="top">
        <SiteHero copy={copy} />
        <SiteProblem copy={copy} />
        <SiteFeatures copy={copy} />
        <FeatureSection
          id="proveedores"
          eyebrow={copy.proveedores.eyebrow}
          title={copy.proveedores.title}
          sub={copy.proveedores.sub}
          ctaLabel={copy.proveedores.cta}
          visual={<ProveedoresMock />}
        />
        <FeatureSection
          id="escandallos"
          eyebrow={copy.escandallos.eyebrow}
          title={copy.escandallos.title}
          sub={copy.escandallos.sub}
          ctaLabel={copy.escandallos.cta}
          visual={<EscandalloMock />}
          reverse
          panel
        />
        <SiteInteligencia copy={copy} />
        <SiteConexion copy={copy} />
        <SitePricing copy={copy} />
        <SiteFaq copy={copy} />
        <SiteLead copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
      <FloatingCta label={copy.nav.cta} />
    </>
  );
}
