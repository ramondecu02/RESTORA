import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/**
 * Art-directed image frame.
 * The photo always fills its box with object-fit: cover (never distorted) and
 * keeps its subject via a focal-point class that adapts on mobile.
 */
export function Frame({
  src,
  alt,
  sizes,
  priority = false,
  fetchPriority,
  focal,
  ratio,
  radius = 0,
  kenburns = false,
  zoom = false,
  grain = false,
  className,
  style,
  overlay,
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** "high" for the LCP image (hero) so the browser fetches it first. */
  fetchPriority?: "high" | "low" | "auto";
  focal?: string;
  ratio?: string;
  radius?: number;
  kenburns?: boolean;
  zoom?: boolean;
  grain?: boolean;
  className?: string;
  style?: CSSProperties;
  overlay?: ReactNode;
  children?: ReactNode;
}) {
  const cls = [kenburns ? "kb" : "", zoom ? "img-zoom" : "", grain ? "grain" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls || undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        ...(ratio ? { aspectRatio: ratio } : null),
        background: "var(--panel)",
        ...style,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        fetchPriority={fetchPriority}
        className={["frame-img", focal].filter(Boolean).join(" ")}
      />
      {overlay}
      {children}
    </div>
  );
}
