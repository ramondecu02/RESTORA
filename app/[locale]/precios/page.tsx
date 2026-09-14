import { notFound } from "next/navigation";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SitePricing } from "@/components/site/pricing";
import { CtaBand } from "@/components/site/cta-band";
import { SiteFooter } from "@/components/site/footer";

export default async function PreciosPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <SitePricing copy={copy} locale={locale} />
        <CtaBand copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}
