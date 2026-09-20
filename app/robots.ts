import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Emitted as /robots.txt by the static export.
// Cloudflare's "managed robots.txt" (the Content-Signal block for search /
// ai-input / ai-train) is prepended at the edge to whatever the origin serves,
// so the AI signals declared in the dashboard keep working alongside this file.
// After deploying, check https://restoraapp.app/robots.txt shows both blocks.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal brand board and the (server-only) admin are not for crawlers.
        disallow: ["/es/marca", "/ca/marca", "/es/admin", "/ca/admin", "/admin", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
