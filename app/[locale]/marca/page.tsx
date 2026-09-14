import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionaries";
import { isLocale } from "@/lib/types";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/sections/masthead";

const SWATCHES = [
  { hex: "#1E3D2F", label: "ámbar\n#1E3D2F" },
  { hex: "#1E211A", label: "tinta\n#1E211A" },
  { hex: "#F0EEE6", label: "fondo\n#F0EEE6" },
  { hex: "#2F9E56", label: "N1\n#2F9E56" },
  { hex: "#2F6FB5", label: "N2\n#2F6FB5" },
  { hex: "#7A3FC4", label: "N3\n#7A3FC4" },
  { hex: "#3E8E6A", label: "ámbar·osc\n#3E8E6A" },
];

// Fixed-color lockup mark for the on-light / on-dark demonstrations.
function DemoMark() {
  return (
    <svg width="50" height="50" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1E3D2F" />
      <circle cx="32" cy="35" r="17" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".38" />
      <polyline points="19,41 27,35 35,38 45,23" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="45" cy="23" r="4.2" fill="#fff" />
    </svg>
  );
}

function FaviconGlyph({ size, stroke }: { size: number; stroke: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <polyline points="17,42 27,35 35,38 46,22" fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      {size > 16 && <circle cx="46" cy="22" r={size > 32 ? 4.4 : 5} fill="#fff" />}
    </svg>
  );
}

export default async function MarcaPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const cardBase: React.CSSProperties = {
    border: "1px solid var(--hair)",
    borderRadius: 14,
    minHeight: 172,
  };

  return (
    <>
      <Nav dict={dict} locale={locale} />
      <main id="top">
        <section className="mx-auto max-w-[1200px]" style={{ padding: "52px 28px 80px" }}>
          <Masthead index="00" label={dict.brand.kicker} />
          <h1
            className="display"
            style={{ fontWeight: 800, fontSize: "clamp(30px, 5vw, 48px)", margin: "16px 0 0", lineHeight: 0.98 }}
          >
            {dict.brand.title}
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginTop: 28,
            }}
          >
            {/* Lockup on light */}
            <div
              style={{
                ...cardBase,
                background: "#FBFAF6",
                padding: 34,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DemoMark />
                <span className="display" style={{ fontWeight: 800, fontSize: 40, letterSpacing: "0.03em", color: "#1E211A" }}>
                  RESTORA
                </span>
              </div>
              <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.06em", color: "#75786B" }}>
                LOCKUP · SOBRE CLARO
              </span>
            </div>

            {/* Lockup on dark */}
            <div
              style={{
                ...cardBase,
                background: "#14160E",
                borderColor: "#2E3126",
                padding: 34,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DemoMark />
                <span className="display" style={{ fontWeight: 800, fontSize: 40, letterSpacing: "0.03em", color: "#F2F1E8" }}>
                  RESTORA
                </span>
              </div>
              <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.06em", color: "#9B9E8F" }}>
                BLANCO · SOBRE OSCURO
              </span>
            </div>

            {/* Favicon + monogram */}
            <div
              style={{
                ...cardBase,
                background: "var(--surface)",
                padding: 26,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <FaviconGlyph size={46} stroke={5} />
                <FaviconGlyph size={32} stroke={6} />
                <FaviconGlyph size={16} stroke={8} />
                <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.05em", color: "var(--muted)", lineHeight: 1.4 }}>
                  FAVICON
                  <br />
                  48 · 32 · 16
                </span>
              </div>
              <div style={{ height: 1, background: "var(--hair)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 11,
                    border: "2px solid var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    background: "var(--surface)",
                  }}
                >
                  <span className="display" style={{ fontWeight: 800, fontSize: 28, color: "var(--ink)", lineHeight: 1 }}>
                    R
                  </span>
                  <span style={{ position: "absolute", right: -5, bottom: -5, width: 11, height: 11, background: "var(--brand)", transform: "rotate(45deg)" }} />
                </div>
                <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.05em", color: "var(--muted)", lineHeight: 1.4 }}>
                  OPCIÓN B
                  <br />
                  MONOGRAMA R
                </span>
              </div>
            </div>
          </div>

          {/* Tokens + typography */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
              marginTop: 14,
            }}
          >
            <div className="card" style={{ padding: 24 }}>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
                Tokens de marca
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {SWATCHES.map((s) => (
                  <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6, width: 64 }}>
                    <div style={{ height: 46, borderRadius: 9, border: "1px solid var(--hair)", background: s.hex }} />
                    <span className="mono" style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1.3, whiteSpace: "pre-line" }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                Sistema tipográfico
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <div className="display" style={{ fontWeight: 800, fontSize: 30, letterSpacing: "0.01em", lineHeight: 1 }}>
                  Big Shoulders
                </div>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>DISPLAY · 700/800</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 500, fontSize: 20 }}>Work Sans — lectura</div>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>CUERPO · 400/500/600</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <div className="mono" style={{ fontWeight: 500, fontSize: 19, color: "var(--brand)" }}>31,4% · 1,94 €/L · +14%</div>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>EL DATO · PLEX MONO</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer dict={dict} locale={locale} />
    </>
  );
}
