import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Prisma client out of the server bundle so its query engine is
  // traced and available at runtime (Vercel / Node).
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
