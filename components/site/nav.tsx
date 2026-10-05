import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { NavClient } from "./nav-client";

// Server component on purpose: the client bar only receives the nav labels. Passing the whole `copy` object
// would serialize every string of the site into the HTML of every page.
export function SiteNav({ copy, locale, overlay = false }: { copy: SiteCopy; locale: Locale; overlay?: boolean }) {
  return <NavClient nav={copy.nav} locale={locale} overlay={overlay} />;
}
