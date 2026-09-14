import type { Dictionary } from "@/lib/dictionaries";
import { Masthead } from "./masthead";

const LEVEL_COLORS = ["#2f9e56", "#2f6fb5", "#7a3fc4"];
const LIFTS = [0, 18, 36];

export function Ladder({ dict }: { dict: Dictionary }) {
  return (
    <section
      id="howto"
      style={{
        background: "var(--panel)",
        borderTop: "1px solid var(--hair)",
        borderBottom: "1px solid var(--hair)",
      }}
    >
      <div className="mx-auto max-w-[1200px]" style={{ padding: "64px 28px" }}>
        <Masthead index="02" label={dict.sec.ladder} />
        <h2
          className="display"
          style={{ fontWeight: 800, fontSize: "clamp(32px, 5.4vw, 58px)", lineHeight: 0.96, margin: "20px 0 0" }}
        >
          {dict.ladder.title}
        </h2>
        <p style={{ fontSize: 18, color: "var(--muted)", margin: "14px 0 0" }}>{dict.ladder.sub}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            marginTop: 36,
            alignItems: "end",
          }}
        >
          {dict.ladder.steps.map((step, i) => {
            const color = LEVEL_COLORS[i];
            return (
              <div
                key={step.name}
                className="card"
                style={{ borderRadius: 16, padding: 26, marginBottom: LIFTS[i], position: "relative", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      className="display"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 11,
                        background: color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 20,
                      }}
                    >
                      {`N${i + 1}`}
                    </span>
                    <div className="display" style={{ fontWeight: 800, fontSize: 27, lineHeight: 1 }}>
                      {step.name}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 20, color: "var(--muted)" }}>↑</span>
                </div>
                <p style={{ fontSize: 15, color: "var(--muted)", margin: "18px 0 0" }}>{step.desc}</p>
                <div
                  className="mono"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 11.5,
                    color,
                    marginTop: 18,
                    fontWeight: 500,
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    padding: "5px 10px",
                    borderRadius: 999,
                  }}
                >
                  {step.tag}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
