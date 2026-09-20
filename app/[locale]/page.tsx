import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { pageMetadata } from "@/lib/seo";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { SiteExplore } from "@/components/site/explore";
import { HomeHero } from "@/components/home/hero";
import { HomeStrip } from "@/components/home/strip";
import { HomeProblem } from "@/components/home/problem";
import { FeatureRow, OverlayCard } from "@/components/home/feature-row";
import { HomeProfit } from "@/components/home/profit";
import { HomeIntelligence } from "@/components/home/intelligence";
import { HomeClosing } from "@/components/home/closing";
import { HomeVideo } from "@/components/home/video";
import { NewsletterSection } from "@/components/site/newsletter-section";
import { ShareBand } from "@/components/site/share-band";

const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  // Ink (not muted): the card is translucent over a photo, so muted text
  // dropped under the 4.5:1 contrast threshold.
  color: "var(--ink)",
  fontWeight: 600,
};

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const typed = isLocale(locale) ? locale : "es";
  const copy = getSiteCopy(typed);
  return pageMetadata(typed, "", copy.meta.title, copy.meta.description);
}

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} overlay />
      <main>
        <HomeHero copy={copy} locale={locale} />
        <HomeVideo copy={copy} locale={locale} />
        <HomeStrip copy={copy} />
        <HomeProblem copy={copy} locale={locale} />

        {/* Compras — fresh product + the purchase record */}
        <FeatureRow
          eyebrow={copy.home.compras.eyebrow}
          title={copy.home.compras.title}
          sub={copy.home.compras.sub}
          ctaLabel={copy.features.cta}
          ctaHref={`/${locale}/funcionalidades`}
          src="/images/producto.webp"
          alt="Producto fresco recibido en cocina"
          focal="focal-producto"
          overlay={
            <OverlayCard position="bottom-left">
              <div style={label}>Última compra</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 7 }}>Distribuidora Mediterránea</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 5 }}>
                <span style={{ fontSize: 19, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>1.240 €</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--down)" }}>+4,2%</span>
              </div>
            </OverlayCard>
          }
        />

        {/* Proveedores — the delivery, and what it really costs */}
        <FeatureRow
          reverse
          tone="surface"
          eyebrow={copy.proveedores.eyebrow}
          title={copy.proveedores.title}
          sub={copy.proveedores.sub}
          ctaLabel={copy.proveedores.cta}
          ctaHref={`/${locale}/funcionalidades`}
          src="/images/mercancia.webp"
          alt="Recepción de mercancía en el restaurante"
          focal="focal-mercancia"
          overlay={
            <OverlayCard position="bottom-right">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "linear-gradient(135deg, #E4736A, #C94a41)" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Tomate rama</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    1,85 €/kg <span style={{ color: "var(--down)", fontWeight: 700 }}>↑12%</span>
                  </div>
                </div>
              </div>
            </OverlayCard>
          }
        />

        {/* Escandallos — the plate, and its real margin */}
        <FeatureRow
          eyebrow={copy.escandallos.eyebrow}
          title={copy.escandallos.title}
          sub={copy.escandallos.sub}
          ctaLabel={copy.escandallos.cta}
          ctaHref={`/${locale}/funcionalidades`}
          src="/images/chef-plating.webp"
          alt="Chef terminando un plato"
          focal="focal-chef"
          overlay={
            <OverlayCard position="bottom-right">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Image src="/images/plato.webp" alt="" width={44} height={44} style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Lubina a la brasa</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>Coste 8,20 € · Margen 19,80 €</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--hair)", fontSize: 12.5 }}>
                <span style={{ color: "var(--muted)" }}>Food cost</span>
                <span style={{ fontWeight: 700, color: "var(--brand)", fontVariantNumeric: "tabular-nums" }}>29,3%</span>
              </div>
            </OverlayCard>
          }
        />

        <HomeProfit copy={copy} />
        <HomeIntelligence copy={copy} locale={locale} />
        <SiteExplore copy={copy} locale={locale} />
        <NewsletterSection copy={copy} locale={locale} />
        <ShareBand copy={copy} />
        <HomeClosing copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}
