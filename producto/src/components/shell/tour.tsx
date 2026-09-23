"use client";
// Recorrido guiado (coachmarks): resalta una zona y explica qué es. Se muestra una vez por pantalla.
import { useCallback, useEffect, useState } from "react";
import { marcarTour } from "@/app/(app)/prefs-actions";

export type TourStep = { sel: string | string[]; h: string; p: string };

export function Tour({ k, steps, show }: { k: string; steps: TourStep[]; show: boolean }) {
  const [i, setI] = useState<number | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [app, setApp] = useState<DOMRect | null>(null);
  const find = useCallback((st: TourStep) => {
    for (const s of Array.isArray(st.sel) ? st.sel : [st.sel]) {
      const el = document.querySelector<HTMLElement>(s);
      if (el && el.getClientRects().length && el.offsetParent !== null) return el;
    }
    return null;
  }, []);
  useEffect(() => { if (!show) return; const t = setTimeout(() => setI(0), 500); return () => clearTimeout(t); }, [show]);
  const end = useCallback(() => { setI(null); marcarTour(k).catch(() => {}); }, [k]);
  useEffect(() => {
    if (i == null) return;
    const st = steps[i];
    const el = st ? find(st) : null;
    if (!el) { if (i < steps.length - 1) setI(i + 1); else end(); return; }
    const place = () => {
      const a = document.getElementById("app")!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setApp(a);
      setBox({ x: r.left - a.left - 6, y: r.top - a.top - 6, w: r.width + 12, h: r.height + 12 });
    };
    el.scrollIntoView({ block: "nearest" });
    place();
    window.addEventListener("resize", place);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") end(); };
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("resize", place); document.removeEventListener("keydown", onKey); };
  }, [i, steps, find, end]);
  if (i == null || !box || !app) return null;
  const st = steps[i], n = steps.length, last = i === n - 1;
  const below = box.y + box.h + 180 < app.height;
  const tipX = Math.max(12, Math.min(app.width - 312, box.x));
  const tipY = below ? box.y + box.h + 10 : Math.max(12, box.y - 190);
  return (
    <div className="tour">
      <div className="tour-hole" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
      <div className="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tour-h" style={{ left: tipX, top: tipY }}>
        <h2 id="tour-h">{st.h}</h2>
        <p>{st.p}</p>
        <div className="tour-foot">
          <span>{n > 1 ? `${i + 1} de ${n}` : "Consejo"}</span>
          {!last ? <button type="button" className="tour-skip" onClick={end}>Saltar</button> : null}
          <button type="button" className="tour-next" autoFocus onClick={() => (last ? end() : setI(i + 1))}>{last ? "Entendido" : "Siguiente"}</button>
        </div>
      </div>
    </div>
  );
}
