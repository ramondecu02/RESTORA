import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

// Photo slot with a graceful gradient fallback and optional hover zoom.
// The image lives on an inner .photo-layer so it can scale on hover without
// clipping the container's rounded corners. It is a real <img> (next/image,
// lazy by default, responsive srcset via `sizes`) rather than a CSS
// background, so browsers can pick the right size and defer it.
export function Photo({
  src,
  alt,
  radius = 20,
  className,
  style,
  children,
  focal = "center",
  zoom = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  src: string;
  alt: string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  focal?: string;
  zoom?: boolean;
  sizes?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={[zoom ? "photo-zoom" : "", className].filter(Boolean).join(" ")}
      style={{
        background: "linear-gradient(135deg, #e7efe8, #d8c8ad)",
        borderRadius: radius,
        border: "1px solid var(--hair)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div className="photo-layer" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <Image src={src} alt="" fill sizes={sizes} style={{ objectFit: "cover", objectPosition: focal }} />
      </div>
      {children}
    </div>
  );
}
