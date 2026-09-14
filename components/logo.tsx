// Brand lockup: the "plato inteligente" app-icon (amber tile, white rising
// line = coste→margen) + the RESTORA wordmark. Icon fill uses the amber token
// so it reads correctly in both themes.

export function BrandMark({
  size = 32,
  radius = 9,
  className,
}: {
  size?: number;
  radius?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      style={{ display: "block", borderRadius: radius }}
    >
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <circle cx="32" cy="35" r="17" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".38" />
      <polyline
        points="19,41 27,35 35,38 45,23"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="23" r="4.2" fill="#fff" />
    </svg>
  );
}

export function Logo({
  href,
  wordmarkSize = 25,
  markSize = 32,
}: {
  href?: string;
  wordmarkSize?: number;
  markSize?: number;
}) {
  const inner = (
    <>
      <BrandMark size={markSize} radius={8} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: wordmarkSize,
          letterSpacing: "0.16em",
          lineHeight: 1,
          color: "currentColor",
        }}
      >
        RESTORA
      </span>
    </>
  );

  const style = { display: "flex", alignItems: "center", gap: 11, color: "inherit" } as const;

  if (href) {
    return (
      <a href={href} style={style} aria-label="RESTORA">
        {inner}
      </a>
    );
  }
  return <span style={style}>{inner}</span>;
}
