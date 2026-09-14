import type { Dictionary } from "@/lib/dictionaries";
import { Masthead } from "./masthead";

export function Proof({ dict }: { dict: Dictionary }) {
  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "64px 28px" }}>
      <Masthead index="07" label={dict.sec.proof} />
      <h2
        className="display"
        style={{ fontWeight: 800, fontSize: "clamp(30px, 5vw, 50px)", lineHeight: 0.96, margin: "20px 0 0" }}
      >
        {dict.proof.title}
      </h2>

      {/* Honest placeholders — never fabricate real logos/reviews. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginTop: 32,
        }}
      >
        {dict.proof.logos.map((logo) => (
          <div
            key={logo}
            style={{
              height: 82,
              border: "1px dashed var(--line)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface)",
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 11.5, letterSpacing: "0.04em", color: "var(--muted)", textAlign: "center", padding: "0 10px" }}
            >
              {logo}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          marginTop: 14,
        }}
      >
        {dict.proof.testimonials.map((testimonial) => (
          <div key={testimonial.who} className="card hover-lift reveal" style={{ padding: 26 }}>
            <div className="display" style={{ fontWeight: 600, fontSize: 20, color: "var(--muted)", lineHeight: 1.2, textTransform: "none" }}>
              “{testimonial.quote}”
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--hair)" }} />
              <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{testimonial.who}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
