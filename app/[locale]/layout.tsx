import type { Metadata } from "next";
import { notFound } from "next/navigation";
// Google consolidated "Big Shoulders Display" into the "Big Shoulders" family;
// it is the current equivalent of the design's display face.
import { Big_Shoulders, IBM_Plex_Mono, Work_Sans } from "next/font/google";
import "../globals.css";
import { getDictionary } from "@/lib/dictionaries";
import { isLocale, LOCALES, type Locale } from "@/lib/types";

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-big-shoulders",
  display: "swap",
});

const body = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-work-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Blocking script: apply the stored (or OS-preferred) theme before first paint
// to avoid a flash of the wrong palette.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('restora-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const dict = getDictionary(isLocale(locale) ? locale : "es");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      languages: { es: "/es", ca: "/ca" },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: locale === "ca" ? "ca_ES" : "es_ES",
      type: "website",
    },
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
      className={`${display.variable} ${body.variable} ${mono.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {props.children}
      </body>
    </html>
  );
}
