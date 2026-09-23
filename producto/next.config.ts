import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // La app vive en producto/ con su propio package-lock; sin esto Next toma como raíz el repositorio
  // (hay otro lockfile en la web pública) y vigila y traza archivos de fuera.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  // El indicador de desarrollo tapa la barra de pestañas en móvil; los errores se siguen mostrando.
  devIndicators: false,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
