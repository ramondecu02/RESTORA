import type { CSSProperties, ReactNode } from "react";

export function Eyebrow({ children, color = "muted" }: { children: ReactNode; color?: "muted" | "brand" }) {
  return (
    <div
      style={{
        fontWeight: 600,
        fontSize: 12.5,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: color === "brand" ? "var(--brand)" : "var(--muted)",
      }}
    >
      {children}
    </div>
  );
}

// Standard section headline (sentence case, tight).
export function Title({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <h2
      className="display"
      style={{ fontSize: "clamp(30px, 4.4vw, 46px)", margin: "16px 0 0", maxWidth: "18ch", ...style }}
    >
      {children}
    </h2>
  );
}

export function Lead({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{ fontSize: "clamp(16px, 1.6vw, 18px)", color: "var(--muted)", margin: "18px 0 0", maxWidth: "46ch", lineHeight: 1.6, ...style }}>
      {children}
    </p>
  );
}
