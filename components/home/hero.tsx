import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { CountUp } from "@/components/site/count-up";
import { Frame } from "./frame";

const SPARK = [38, 41, 39, 44, 42, 48, 46, 52, 50, 57, 55, 61];

function Spark() {
  const w = 132;
  const h = 30;
  const max = Math.max(...SPARK);
  const min = Math.min(...SPARK);
  const d = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" style={{ display: "block" }}>
      <path className="line-draw" pathLength={1} d={d} fill="none" stroke="#8fd3b0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const glass: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(18,28,22,0.74), rgba(9,15,11,0.82))",
  backdropFilter: "blur(16px) saturate(1.15)",
  WebkitBackdropFilter: "blur(16px) saturate(1.15)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 20,
  boxShadow: "0 46px 90px -44px rgba(0,0,0,0.85)",
  color: "#fff",
};

export function HomeHero({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const h = copy.hero;
  const metrics = copy.home.heroMetrics;
  const alert = copy.home.heroAlert;

  return (
    <section
      style={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        background: "#0a0f0c",
        minHeight: "clamp(620px, 94vh, 940px)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Frame
        src="/images/kitchen-hero.webp"
        alt="Chef emplatando en una cocina profesional"
        sizes="100vw"
        priority
        focal="focal-hero"
        kenburns
        style={{ position: "absolute", inset: 0, borderRadius: 0, zIndex: 0, background: "#0a0f0c" }}
      />
      {/* legibility layers */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(96deg, rgba(7,12,9,0.94) 0%, rgba(7,12,9,0.84) 28%, rgba(7,12,9,0.46) 56%, rgba(7,12,9,0.18) 76%, rgba(7,12,9,0.5) 100%)" }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(7,12,9,0.72) 0%, rgba(7,12,9,0) 24%, rgba(7,12,9,0) 58%, rgba(7,12,9,0.7) 100%)" }}
      />
      <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />

      <div
        className="mx-auto grid w-full max-w-[1280px] items-end gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
        style={{ position: "relative", zIndex: 2, padding: "clamp(150px, 20vh, 220px) 28px clamp(64px, 9vh, 96px)" }}
      >
        {/* Message */}
        <div>
          <div className="editorial-eyebrow rise-in" style={{ color: "rgba(255,255,255,0.6)" }}>
            {h.eyebrow}
          </div>
          <h1
            className="display-serif rise-in"
            style={{ animationDelay: "0.08s", color: "#fff", fontSize: "clamp(42px, 6.2vw, 80px)", margin: "22px 0 0", maxWidth: "13ch" }}
          >
            {h.title}
          </h1>
          <p
            className="rise-in"
            style={{ animationDelay: "0.16s", color: "rgba(255,255,255,0.76)", fontSize: "clamp(16px, 1.45vw, 18.5px)", lineHeight: 1.65, margin: "24px 0 0", maxWidth: "47ch" }}
          >
            {h.sub}
          </p>
          <div className="rise-in" style={{ animationDelay: "0.24s", display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
            <Link
              href={`/${locale}/contacto`}
              className="btn"
              style={{ background: "#fff", color: "#12211a", border: "1px solid #fff", padding: "15px 26px", fontSize: 15.5 }}
            >
              {h.ctaPrimary}
              <ArrowRight size={17} strokeWidth={2} />
            </Link>
            <Link
              href={`/${locale}/como-funciona`}
              className="btn"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.34)", padding: "15px 26px", fontSize: 15.5, backdropFilter: "blur(6px)" }}
            >
              {h.ctaSecondary}
            </Link>
          </div>
        </div>

        {/* RESTORA living inside the kitchen */}
        <div
          className="rise-in"
          style={{ animationDelay: "0.34s", display: "flex", flexDirection: "column", gap: 14, width: "min(100%, 392px)", justifySelf: "stretch" }}
        >
          <div style={{ ...glass, padding: "20px 20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8fd3b0", boxShadow: "0 0 0 4px rgba(143,211,176,0.18)" }} />
              <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", fontWeight: 600 }}>
                RESTORA · hoy
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{m.label}</span>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                    <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>
                      <CountUp end={m.end} decimals={m.decimals} suffix={m.suffix} />
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: m.good ? "#8fd3b0" : "#e7b48b",
                        background: m.good ? "rgba(143,211,176,0.12)" : "rgba(231,180,139,0.12)",
                        border: `1px solid ${m.good ? "rgba(143,211,176,0.26)" : "rgba(231,180,139,0.26)"}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {m.delta}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "18px 0 14px" }} />
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.4, maxWidth: "16ch" }}>
                Evolución de compras · 30 días
              </span>
              <Spark />
            </div>
          </div>

          {/* Live alert — the intelligence layer, in the room */}
          <div style={{ ...glass, padding: "15px 17px", display: "flex", alignItems: "center", gap: 13 }}>
            <span
              aria-hidden="true"
              style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(231,180,139,0.14)", border: "1px solid rgba(231,180,139,0.28)", color: "#e7b48b" }}
            >
              <Flame size={16} strokeWidth={1.9} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.4 }}>{alert.text}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "#8fd3b0", fontWeight: 600, marginTop: 3 }}>{alert.action} →</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
