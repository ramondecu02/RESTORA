"use client";

// Custom next/image loader for the Cloudflare static export.
// scripts/gen-image-variants.mjs pre-renders every public/images/*.webp at the
// widths below (public/images/_w/<name>-<w>.webp, git-ignored, built on demand),
// so <Image sizes="…"> gets a real srcset instead of shipping the 2000px
// original to a 375px phone.
export const VARIANT_WIDTHS = [128, 256, 480, 768, 1080, 1440, 1920] as const;

export default function cloudflareImageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const m = /^\/images\/([^/]+)\.webp$/.exec(src);
  if (!m) return src;
  const w = VARIANT_WIDTHS.find((v) => v >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
  return `/images/_w/${m[1]}-${w}.webp`;
}
