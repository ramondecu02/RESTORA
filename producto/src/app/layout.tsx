import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RESTORA", template: "%s · RESTORA" },
  description: "Control de costes para cocinas: albaranes leídos, escandallos vivos y proveedores comparados.",
  applicationName: "RESTORA",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F5F6F3" }, { media: "(prefers-color-scheme: dark)", color: "#0E1411" }],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = (await cookies()).get("rs_theme")?.value;
  return (
    <html lang="es" data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
      <body>{children}</body>
    </html>
  );
}
