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
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
