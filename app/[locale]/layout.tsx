import type { Metadata } from "next";
import { notFound } from "next/navigation";
// Inter for UI/body; Instrument Serif for editorial display headlines (home).
import { Inter, Instrument_Serif } from "next/font/google";
import "../globals.css";
import { getSiteCopy } from "@/lib/site-copy";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { FloatingActions } from "@/components/site/floating-actions";
import { isLocale, LOCALES, type Locale } from "@/lib/types";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

// Blocking script: apply the stored (or OS-preferred) theme before first paint
// to avoid a flash of the wrong palette.
const THEME_SCRIPT = `(function(){try{document.documentElement.classList.add('js');var t=localStorage.getItem('restora-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const typed = isLocale(locale) ? locale : "es";
  const copy = getSiteCopy(typed);
  return {
    // Absolute URLs for canonical/hreflang/OG come from here (never localhost).
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    ...pageMetadata(typed, "", copy.meta.title, copy.meta.description),
  };
}

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const typedLocale: Locale = locale;

  return (
    <html
      lang={typedLocale}
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {props.children}
        <FloatingActions locale={typedLocale} labels={getSiteCopy(typedLocale).floating} />
      </body>
    </html>
  );
}
