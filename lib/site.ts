import type { Locale } from "./types";

// Single source of truth for the public site: URL, contact data, social
// profiles and feature switches. Nothing here is invented — every TODO must be
// filled with real data before the corresponding UI is switched on.

export const SITE_NAME = "RESTORA";

// Production origin. NEXT_PUBLIC_SITE_URL overrides it (previews, local runs).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://restoraapp.app").replace(/\/+$/, "");

export const CONTACT_EMAIL = "hola@restoraapp.com";
// Shown in the footer and contact page; E.164 form feeds the tel: link.
export const CONTACT_PHONE_DISPLAY = "+34 640 648 985";
export const CONTACT_PHONE_E164 = "+34640648985";
// WhatsApp Business number: international format, digits only (wa.me).
export const WHATSAPP_NUMBER = "34640648985";

const WHATSAPP_TEXT: Record<Locale, string> = {
  es: "Hola, quiero saber más sobre RESTORA",
  ca: "Hola, vull saber més sobre RESTORA",
};

/** wa.me deep link with the pre-filled greeting in the visitor's language. */
export function whatsappUrl(locale: Locale): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT[locale])}`;
}

export type SocialKey = "instagram" | "linkedin" | "youtube" | "x" | "tiktok";

// TODO(Ramon): pegar aquí las URLs reales de los perfiles. Mientras `url` esté
// vacía, el icono NO se renderiza: nunca enlazamos a perfiles que no existen.
export const SOCIAL_LINKS: { key: SocialKey; label: string; url: string }[] = [
  { key: "instagram", label: "Instagram", url: "" },
  { key: "linkedin", label: "LinkedIn", url: "" },
  { key: "youtube", label: "YouTube", url: "" },
  { key: "x", label: "X", url: "" },
  { key: "tiktok", label: "TikTok", url: "" },
];

/** Social profiles that can actually be linked (non-empty URL). */
export const activeSocialLinks = () => SOCIAL_LINKS.filter((s) => s.url.trim() !== "");

// Trust claims that need confirmation before they can be shown.
// TODO(Ramon): confirmar dónde se alojan los datos (Cloudflare D1 / región)
// antes de activar el sello "Datos alojados en la UE".
export const TRUST_EU_HOSTING = false;

// Presentation video. Empty until the video exists → the home block renders a
// clear placeholder. Accepts a YouTube/Vimeo *embed* URL or a direct .mp4.
// TODO(Ramon): vídeo de presentación — specs en components/home/video.tsx
export const VIDEO_EMBED_URL = "";
export const VIDEO_POSTER = "/images/plating-line.webp";

// Lead magnet delivered by the newsletter block (one file per language).
export const LEAD_MAGNET: Record<Locale, string> = {
  es: "/recursos/checklist-food-cost-es.pdf",
  ca: "/recursos/checklist-food-cost-ca.pdf",
};

// Public routes. The slug is shared by both locales (/es/precios, /ca/precios).
// Used by the sitemap; /marca (noindex) and /admin are deliberately excluded.
export const PUBLIC_SLUGS = [
  "",
  "funcionalidades",
  "como-funciona",
  "precios",
  "preguntas",
  "sobre-nosotros",
  "contacto",
  "privacidad",
  "rgpd",
  "aviso-legal",
  "cookies",
] as const;
export type PublicSlug = (typeof PUBLIC_SLUGS)[number];

export const localePath = (locale: Locale, slug: string) => `/${locale}${slug ? `/${slug}` : ""}`;
export const absoluteUrl = (locale: Locale, slug: string) => `${SITE_URL}${localePath(locale, slug)}`;
