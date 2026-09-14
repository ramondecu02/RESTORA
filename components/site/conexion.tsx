import type { SiteCopy } from "@/lib/site-copy";
import { Eyebrow } from "./ui";

function Diagram({ inputs, outputs }: { inputs: string[]; outputs: string[] }) {
  const W = 600;
  const H = 340;
  const cx = 315;
  const cy = 170;
  const r = 40;
  const inX = 20;
  const inW = 150;
  const inH = 38;
  const inYs = inputs.map((_, i) => 26 + i * ((H - 60) / (inputs.length - 1)));
  const outX = 430;
  const outW = 150;
  const outH = 56;
  const outYs = outputs.map((_, i) => (outputs.length === 2 ? [96, 190][i] : 140 + i * 90));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 620, display: "block" }} role="img" aria-label="Diagrama de conexión">
      {/* connectors: inputs -> center */}
      {inYs.map((y, i) => {
        const sx = inX + inW;
        const sy = y + inH / 2;
        return (
          <path
            key={`in-${i}`}
            d={`M ${sx} ${sy} C ${sx + 60} ${sy}, ${cx - r - 60} ${cy}, ${cx - r} ${cy}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1.5"
          />
        );
      })}
      {/* connectors: center -> outputs */}
      {outYs.map((y, i) => {
        const ey = y + outH / 2;
        return (
          <path
            key={`out-${i}`}
            d={`M ${cx + r} ${cy} C ${cx + r + 50} ${cy}, ${outX - 50} ${ey}, ${outX} ${ey}`}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="1.8"
          />
        );
      })}

      {/* input pills */}
      {inputs.map((label, i) => (
        <g key={label}>
          <rect x={inX} y={inYs[i]} width={inW} height={inH} rx={10} fill="var(--surface)" stroke="var(--hair)" />
          <circle cx={inX + 18} cy={inYs[i] + inH / 2} r={4} fill="var(--accent)" />
          <text x={inX + 34} y={inYs[i] + inH / 2 + 4} fontSize="13" fill="var(--ink)" fontFamily="var(--font-body)">
            {label}
          </text>
        </g>
      ))}

      {/* center node */}
      <circle cx={cx} cy={cy} r={r} fill="var(--brand)" />
      <text x={cx} y={cy + 8} fontSize="26" fontWeight="700" fill="var(--on-brand)" textAnchor="middle" fontFamily="var(--font-display)">
        R
      </text>

      {/* output pills */}
      {outputs.map((label, i) => (
        <g key={label}>
          <rect x={outX} y={outYs[i]} width={outW} height={outH} rx={12} fill="var(--surface)" stroke="color-mix(in srgb, var(--brand) 30%, var(--hair))" />
          <text x={outX + 16} y={outYs[i] + outH / 2 + 4} fontSize="13" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-body)">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function SiteConexion({ copy }: { copy: SiteCopy }) {
  const c = copy.conexion;
  return (
    <section style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }}>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 md:grid-cols-2" style={{ padding: "80px 28px" }}>
        <div>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)", margin: "16px 0 0", maxWidth: "14ch", textWrap: "balance" }}>
            {c.title}
          </h2>
          <p style={{ fontSize: 17, color: "var(--muted)", margin: "18px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>{c.sub}</p>
          <span className="btn btn-outline" style={{ padding: "10px 18px", fontSize: 13.5, marginTop: 26, cursor: "default" }}>
            {c.soon}
          </span>
        </div>
        <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
          <Diagram inputs={c.inputs} outputs={c.outputs} />
        </div>
      </div>
    </section>
  );
}
