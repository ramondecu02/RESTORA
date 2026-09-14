import type { CSSProperties, ReactNode } from "react";

// Photo slot with a graceful gradient fallback and optional hover zoom.
// The image lives on an inner .photo-layer so it can scale on hover without
// clipping the container's rounded corners. If the file at `src` is missing,
// the container's gradient shows through (no broken-image icon).
export function Photo({
  src,
  alt,
  radius = 20,
  className,
  style,
  children,
  focal = "center",
  zoom = false,
}: {
  src: string;
  alt: string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  focal?: string;
  zoom?: boolean;
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
      <div
        className="photo-layer"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${src}")`,
          backgroundSize: "cover",
          backgroundPosition: focal,
          backgroundRepeat: "no-repeat",
        }}
      />
      {children}
    </div>
  );
}
