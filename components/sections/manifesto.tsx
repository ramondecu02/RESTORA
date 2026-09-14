import type { Dictionary } from "@/lib/dictionaries";

export function Manifesto({ dict }: { dict: Dictionary }) {
  return (
    <section style={{ background: "var(--ink)", color: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(135deg, rgba(233,168,58,0.035) 0 1px, transparent 1px 26px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -140,
          right: -100,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--amber) 50%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-[960px]" style={{ padding: "96px 28px", position: "relative" }}>
        <div
          className="mono"
          style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 600 }}
        >
          04 / {dict.manifesto.kicker}
        </div>
        <h2
          className="display"
          style={{
            fontWeight: 800,
            fontSize: "clamp(38px, 6.4vw, 76px)",
            lineHeight: 0.94,
            margin: "20px 0 0",
            textWrap: "balance",
          }}
        >
          {dict.manifesto.title}
        </h2>
        <p
          style={{
            fontSize: "clamp(18px, 2.4vw, 25px)",
            lineHeight: 1.5,
            margin: "30px 0 0",
            maxWidth: "48ch",
            color: "color-mix(in srgb, var(--bg) 82%, transparent)",
          }}
        >
          {dict.manifesto.body}
        </p>
      </div>
    </section>
  );
}
