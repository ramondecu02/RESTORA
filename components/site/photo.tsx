import type { CSSProperties, ReactNode } from "react";

// Photo slot with a graceful gradient fallback: if the file at `src` is missing,
// the gradient shows (no broken-image icon). Drop real files into public/images/.
export function Photo({
  src,
  alt,
  radius = 20,
  className,
  style,
  children,
}: {
  src: string;
  alt: string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        backgroundImage: `url("${src}"), linear-gradient(135deg, #e7efe8, #c6d2c7)`,
        backgroundSize: "cover, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        borderRadius: radius,
        border: "1px solid var(--hair)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
