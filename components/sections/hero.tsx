import type { Dictionary } from "@/lib/dictionaries";

const CHART_HEIGHTS = [30, 44, 38, 52, 46, 60, 54, 50, 44, 58, 52, 72];

export function Hero({ dict }: { dict: Dictionary }) {
  const bars = CHART_HEIGHTS.map((h, i) => {
    const last = i === CHART_HEIGHTS.length - 1;
    const pct = Math.round(22 + h * 0.7);
    return {
      h,
      bg: last ? "var(--amber)" : `color-mix(in srgb, var(--amber) ${pct}%, transparent)`,
    };
  });

  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "60px 28px 20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 48,
          alignItems: "center",
        }}
      >
        {/* Left column */}
        <div>
          <div
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontSize: 11.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--amber)",
              fontWeight: 600,
              border: "1px solid var(--amber)",
              borderRadius: 999,
              padding: "6px 14px",
              maxWidth: "100%",
            }}
          >
            <span style={{ width: 6, height: 6, background: "var(--amber)", borderRadius: "50%", flexShrink: 0 }} />
            <span>{dict.hero.eyebrow}</span>
          </div>

          <h1
            className="display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(48px, 8vw, 88px)",
              lineHeight: 0.9,
              margin: "22px 0 0",
              textWrap: "balance",
            }}
          >
            {dict.hero.title}
          </h1>

          <p style={{ fontSize: "clamp(17px, 2.2vw, 21px)", color: "var(--muted)", maxWidth: "32ch", margin: "22px 0 0" }}>
            {dict.hero.sub}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <a href="#lead" className="btn btn-amber" style={{ padding: "15px 26px", fontSize: 16 }}>
              {dict.hero.ctaPrimary} →
            </a>
            <a href="#howto" className="btn btn-outline" style={{ padding: "15px 26px", fontSize: 16 }}>
              {dict.hero.ctaSecondary}
            </a>
          </div>

          {/* Data ticker */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 26,
              marginTop: 38,
              paddingTop: 26,
              borderTop: "1px solid var(--hair)",
            }}
          >
            {dict.ticker.map((t) => (
              <div key={t.k}>
                <div className="mono" style={{ fontWeight: 600, fontSize: 26, color: "var(--ink)" }}>
                  {t.v}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: "0.04em", color: "var(--muted)", textTransform: "uppercase" }}
                >
                  {t.k}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instrument card */}
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 34px 80px -44px rgba(30,33,26,0.55)",
          }}
        >
          <div
            className="mono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 18px",
              borderBottom: "1px solid var(--hair)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--muted)",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)" }} />
            {dict.hero.liveAlert}
            <div style={{ flex: 1 }} />
            <span>{dict.hero.today}</span>
          </div>

          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--amber-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--amber)",
                  fontSize: 17,
                  flexShrink: 0,
                }}
              >
                ▲
              </span>
              <div style={{ flex: 1 }}>
                <div
                  className="display"
                  style={{ fontWeight: 700, fontSize: 27, lineHeight: 1 }}
                >
                  {dict.hero.alertTitle}
                </div>
                <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "8px 0 0" }}>{dict.hero.alertBody}</p>
              </div>
              <div className="mono" style={{ fontWeight: 600, color: "var(--amber)", fontSize: 18 }}>
                +14%
              </div>
            </div>

            {/* Chart */}
            <div style={{ marginTop: 20, border: "1px solid var(--hair)", borderRadius: 12, padding: 16 }}>
              <div
                className="mono"
                style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--muted)", marginBottom: 10 }}
              >
                <span>{dict.hero.chartLabel}</span>
                <span>€/L · 12 SEM</span>
              </div>
              <div style={{ height: 84, display: "flex", alignItems: "flex-end", gap: 5 }}>
                {bars.map((bar, i) => (
                  <div
                    key={i}
                    style={{ flex: 1, background: bar.bg, borderRadius: "3px 3px 0 0", height: bar.h }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <div style={{ flex: 1, background: "var(--bg)", borderRadius: 9, padding: "10px 12px" }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{dict.hero.stat1Label}</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 19, color: "var(--amber)" }}>2,21 €/L</div>
                </div>
                <div style={{ flex: 1, background: "var(--bg)", borderRadius: 9, padding: "10px 12px" }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{dict.hero.stat2Label}</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 19 }}>2,01 €/L</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
