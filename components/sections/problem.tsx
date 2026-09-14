import type { Dictionary } from "@/lib/dictionaries";
import { Masthead } from "./masthead";

export function Problem({ dict }: { dict: Dictionary }) {
  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "56px 28px" }}>
      <Masthead index="01" label={dict.sec.problem} />
      <h2
        className="display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(32px, 5.4vw, 58px)",
          lineHeight: 0.96,
          maxWidth: "18ch",
          textWrap: "balance",
          margin: "20px 0 0",
        }}
      >
        {dict.problem.title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 14,
          marginTop: 34,
        }}
      >
        {dict.problem.pains.map((pain, i) => (
          <div key={pain.title} className="card hover-lift reveal" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="mono" style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600 }}>
              {`0${i + 1}`}
            </div>
            <div className="display" style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.02 }}>
              {pain.title}
            </div>
            <p style={{ fontSize: 14.5, color: "var(--muted)", margin: 0 }}>{pain.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
