import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { PageHero } from "@/components/site/page-hero";
import { SiteFeatures } from "@/components/site/features";
import { FeatureSection } from "@/components/site/feature-section";
import { EscandalloMock } from "@/components/site/escandallo-mock";
import { Photo } from "@/components/site/photo";
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
        <PageHero eyebrow={p.eyebrow} title={p.title} sub={p.sub} photo="/images/chef-funcionalidades.webp" photoAlt="Chef emplatando en cocina profesional" focal="center" />
        <SiteFeatures copy={copy} locale={locale} />
        <FeatureSection
          id="proveedores"
          eyebrow={copy.proveedores.eyebrow}
          title={copy.proveedores.title}
          sub={copy.proveedores.sub}
          ctaLabel={copy.proveedores.cta}
          ctaHref={`/${locale}/contacto`}
          visual={
            <div style={{ position: "relative", width: "min(480px, 100%)" }}>
              <Photo
                src="/images/mercancia.webp"
                alt="Recepción de mercancía y producto fresco"
                radius={20}
                focal="center"
                zoom
                style={{ aspectRatio: "4 / 3", width: "100%" }}
              />
              <div
                className="mono"
                style={{
                  position: "absolute",
                  left: 16,
                  bottom: 16,
                  background: "color-mix(in srgb, var(--surface) 92%, transparent)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border: "1px solid var(--hair)",
                  borderRadius: 14,
                  boxShadow: "0 20px 45px -30px rgba(20,32,26,0.5)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  maxWidth: "72%",
                }}
              >
                <span style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #E4736A, #C94a41)", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, fontFamily: "var(--font-body)" }}>Tomate rama</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    1,85 €/kg <span style={{ color: "var(--down)", fontWeight: 700 }}>↑12%</span>
                  </div>
                </div>
              </div>
            </div>
          }
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
