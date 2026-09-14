import type { Dictionary } from "@/lib/dictionaries";
import { Masthead } from "./masthead";

export function Icp({ dict }: { dict: Dictionary }) {
  return (
    <section className="mx-auto max-w-[1200px]" style={{ padding: "64px 28px" }}>
      <Masthead index="05" label={dict.sec.icp} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 44,
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <h2
          className="display"
          style={{
            fontWeight: 800,
            fontSize: "clamp(30px, 5vw, 54px)",
            lineHeight: 0.96,
            textWrap: "balance",
            margin: 0,
          }}
        >
          {dict.icp.title}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dict.icp.list.map((item) => (
            <div
              key={item}
              className="card hover-lift reveal"
              style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: 12, padding: "16px 20px" }}
            >
              <span style={{ width: 9, height: 9, background: "var(--brand)", transform: "rotate(45deg)", flexShrink: 0 }} />
              <span style={{ fontWeight: 500, fontSize: 16.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
