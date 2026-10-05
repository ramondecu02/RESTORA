"use client";
// Semicírculo de food cost con la marca del objetivo. El arco se dibuja al aparecer y se desliza hasta el valor nuevo cuando
// cambia (por ejemplo al cambiar de mes): es una transición de CSS, así que se puede interrumpir a mitad sin saltos.
import { useEffect, useState } from "react";
import { CountUp } from "./ui/count-up";

export function Gauge({ value, max = 48, target, caption }: { value: number | null; max?: number; target: number; caption?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r); }, []);
  const r = 95, cx = 115, cy = 118;
  const ang = (x: number) => Math.PI * (1 - Math.min(1, Math.max(0, x / max)));
  const pt = (a: number, rr = r) => [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  const v = value ?? 0;
  const [x1, y1] = pt(Math.PI);
  const ok = value != null && v <= target;
  const warn = value != null && v > target && v <= target + 3;
  const color = value == null ? "var(--line-2)" : ok ? "var(--ok)" : warn ? "var(--warn-dot)" : "var(--bad)";
  const [tx1, ty1] = pt(ang(target), r - 14), [tx2, ty2] = pt(ang(target), r + 14);
  const frac = value == null ? 0 : Math.min(1, Math.max(0, v / max));
  const arc = `M${x1} ${y1} A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <div className="gauge">
      <div className="gauge-box">
        <svg viewBox="0 0 230 128" role="img" aria-label={value == null ? "Food cost sin datos" : `Food cost ${v.toFixed(1)} %, objetivo ${target} %`}>
          <path d={arc} fill="none" stroke="var(--sunk)" strokeWidth="16" strokeLinecap="round" />
          <path className="gauge-arc" d={arc} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" pathLength={100} strokeDasharray="100"
            strokeDashoffset={on && frac > 0 ? 100 - frac * 100 : 100} />
          <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--ink)" strokeWidth="3" data-tip={`Objetivo|${target} %`} />
        </svg>
        <div className="gauge-v"><b><CountUp value={value} fmt="pct1" /></b><small>food cost · objetivo {target} %</small></div>
      </div>
      {caption ? <p className="gauge-cap">{caption}</p> : null}
    </div>
  );
}
