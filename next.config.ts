import type { NextConfig } from "next";

// CF_EXPORT=1 produces a fully static build of the public landing for
// Cloudflare Pages (see scripts/build-cloudflare.mjs). The admin panel, API
// routes and proxy are stashed for that build since they need a server.
const isCloudflareExport = process.env.CF_EXPORT === "1";

const nextConfig: NextConfig = {
  // Keep the Prisma client out of the server bundle so its query engine is
  // traced and available at runtime (Vercel / Node).
  serverExternalPackages: ["@prisma/client"],
  ...(isCloudflareExport
    ? {
        output: "export" as const,
        // No image optimizer on Pages: serve pre-rendered width variants
        // (scripts/gen-image-variants.mjs) through a custom loader.
        images: {
          loader: "custom" as const,
          loaderFile: "./lib/image-loader.ts",
          deviceSizes: [480, 768, 1080, 1440, 1920],
          imageSizes: [128, 256],
        },
      }
    : {
        // Same security headers the Cloudflare export gets from public/_headers.
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "SAMEORIGIN" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
