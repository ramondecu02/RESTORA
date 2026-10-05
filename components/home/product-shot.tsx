import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * A real screenshot of the app (scripts/capturas.mjs), shown as it is: never redrawn, never retouched.
 * Explicit width/height keep the layout still while it loads.
 */
export function ProductShot({
  src,
  alt,
  width,
  height,
  sizes,
  radius = 14,
  style,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  radius?: number;
  style?: CSSProperties;
}) {
  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} style={{ display: "block", width: "100%", height: "auto", borderRadius: radius, ...style }} />;
}
