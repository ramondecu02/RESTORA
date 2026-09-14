import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionaries";
import { isLocale } from "@/lib/types";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FloatingCta } from "@/components/floating-cta";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Ladder } from "@/components/sections/ladder";
import { Showcase } from "@/components/showcase";
import { Why } from "@/components/sections/why";
import { Manifesto } from "@/components/sections/manifesto";
import { Icp } from "@/components/sections/icp";
import { Pricing } from "@/components/sections/pricing";
import { Proof } from "@/components/sections/proof";
import { Faq } from "@/components/faq";
import { Lead } from "@/components/sections/lead";

export default async function LandingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <Nav dict={dict} locale={locale} />
      <main id="top">
        <Hero dict={dict} />
        <Problem dict={dict} />
        <Ladder dict={dict} />
        <Showcase dict={dict} locale={locale} />
        <Why dict={dict} />
        <Manifesto dict={dict} />
        <Icp dict={dict} />
        <Pricing dict={dict} />
        <Proof dict={dict} />
        <Faq dict={dict} />
        <Lead dict={dict} locale={locale} />
      </main>
      <Footer dict={dict} locale={locale} />
      <FloatingCta label={dict.nav.cta} />
    </>
  );
}
