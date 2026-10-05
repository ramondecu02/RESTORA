"use client";
// Recorrido guiado (coachmarks): resalta una zona y explica qué es. Se muestra una vez por pantalla.
// Se pinta en #ovl-root (la misma capa que las hojas y los avisos), que ocupa exactamente el marco de la app: las
// medidas se toman contra ese marco y el resalte cae donde debe también en escritorio, con la barra lateral.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { marcarTour } from "@/app/(app)/prefs-actions";

export type TourStep = { sel: string | string[]; h: string; p: string };
type Side = "below" | "above" | "right" | "left" | "inside";
type Place = { hole: { x: number; y: number; w: number; h: number }; tip: { left: number; top: number; width: number }; side: Side; arrow: number; ready: boolean };

const GUTTER = 16; // el mismo margen lateral que el contenido de la app
const GAP = 14;
const PAD = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function Tour({ k, steps, show }: { k: string; steps: TourStep[]; show: boolean }) {
  const [i, setI] = useState<number | null>(null);
  const [pl, setPl] = useState<Place | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const tries = useRef(0);
  const find = useCallback((st: TourStep) => {
    for (const s of Array.isArray(st.sel) ? st.sel : [st.sel]) {
      const el = document.querySelector<HTMLElement>(s);
      if (el && el.getClientRects().length && el.offsetParent !== null) return el;
    }
    return null;
  }, []);
  useEffect(() => { if (!show) return; const t = setTimeout(() => setI(0), 500); return () => clearTimeout(t); }, [show]);
  const end = useCallback(() => { setI(null); setPl(null); marcarTour(k).catch(() => {}); }, [k]);

  // Coloca el resalte y la tarjeta: debajo del elemento si cabe, si no encima, al lado o, como último recurso, dentro
  const layout = useCallback(() => {
    const el = elRef.current, app = document.getElementById("app");
    if (!el || !app) return;
    const a = app.getBoundingClientRect(), r = el.getBoundingClientRect();
    const hole = { x: r.left - a.left - PAD, y: r.top - a.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
    const measured = tipRef.current?.offsetHeight ?? 0;
    const th = measured || 190;
    const width = Math.min(340, a.width - GUTTER * 2);
    const cx = hole.x + hole.w / 2, cy = hole.y + hole.h / 2;
    const fitsBelow = hole.y + hole.h + GAP + th <= a.height - GUTTER;
    const fitsAbove = hole.y - GAP - th >= GUTTER;
    const fitsRight = hole.x + hole.w + GAP + width <= a.width - GUTTER;
    const fitsLeft = hole.x - GAP - width >= GUTTER;
    const side: Side = fitsBelow ? "below" : fitsAbove ? "above" : fitsRight ? "right" : fitsLeft ? "left" : "inside";
    let left: number, top: number, arrow: number;
    if (side === "below" || side === "above") {
      // Con la tarjeta del ancho de la pantalla (móvil) queda alineada con los márgenes de la app; si no, con el borde del elemento
      left = clamp(hole.x, GUTTER, a.width - width - GUTTER);
      top = side === "below" ? hole.y + hole.h + GAP : hole.y - GAP - th;
      arrow = clamp(cx - left, 22, width - 22);
    } else if (side === "right" || side === "left") {
      left = side === "right" ? hole.x + hole.w + GAP : hole.x - GAP - width;
      top = clamp(cy - th / 2, GUTTER, a.height - th - GUTTER);
      arrow = clamp(cy - top, 22, th - 22);
    } else {
      left = clamp(cx - width / 2, GUTTER, a.width - width - GUTTER);
      top = a.height - th - GUTTER - 72; // por encima de la barra inferior
      arrow = 0;
    }
    setPl({ hole, tip: { left, top, width }, side, arrow, ready: measured > 0 });
  }, []);

  // La tarjeta se pinta oculta hasta conocer su alto real: en cuanto está en el DOM se mide y se coloca (antes de pintar nada)
  useLayoutEffect(() => {
    if (pl && !pl.ready && tipRef.current && tries.current++ < 3) layout();
  }, [pl, layout]);
  // Si por lo que sea no se llegó a medir, nunca se deja el resalte sin tarjeta: pasados 400 ms se enseña igualmente
  useEffect(() => {
    if (!pl || pl.ready) return;
    const t = setTimeout(() => setPl((p) => (p ? { ...p, ready: true } : p)), 400);
    return () => clearTimeout(t);
  }, [pl]);

  useEffect(() => {
    if (i == null) return;
    const st = steps[i];
    const el = st ? find(st) : null;
    if (!el) { if (i < steps.length - 1) setI(i + 1); else end(); return; }
    elRef.current = el;
    tries.current = 0;
    el.scrollIntoView({ block: "nearest" });
    layout();
    // Segunda pasada cuando la tarjeta ya está pintada y se conoce su alto real
    const raf = requestAnimationFrame(layout);
    let queued = 0;
    const again = () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(layout); };
    window.addEventListener("resize", again);
    document.addEventListener("scroll", again, true); // el contenido se desplaza dentro de .content
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      else if (e.key === "ArrowRight" && i < steps.length - 1) setI(i + 1);
      else if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
      else if (e.key === "Tab") {
        // La tarjeta es modal: el foco no sale de ella
        const f = tipRef.current?.querySelectorAll<HTMLElement>("button");
        if (!f?.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(queued); window.removeEventListener("resize", again); document.removeEventListener("scroll", again, true); document.removeEventListener("keydown", onKey); };
  }, [i, steps, find, end, layout]);

  const root = typeof document !== "undefined" ? document.getElementById("ovl-root") : null;
  if (i == null || !pl || !root) return null;
  const st = steps[i], n = steps.length, last = i === n - 1;
  return createPortal(
    <div className="tour">
      <div className="tour-hole" style={{ left: pl.hole.x, top: pl.hole.y, width: pl.hole.w, height: pl.hole.h }} />
      <div ref={tipRef} className={`tour-tip tour-${pl.side}`} data-ready={pl.ready ? "" : undefined} role="dialog" aria-modal="true" aria-labelledby="tour-h" aria-describedby="tour-p"
        style={{ left: pl.tip.left, top: pl.tip.top, width: pl.tip.width, ["--arrow" as string]: `${pl.arrow}px` }}>
        {pl.side !== "inside" ? <span className="tour-arrow" aria-hidden="true" /> : null}
        <p className="tour-step">{n > 1 ? `Paso ${i + 1} de ${n}` : "Consejo"}</p>
        <h2 id="tour-h">{st.h}</h2>
        <p id="tour-p" className="tour-p">{st.p}</p>
        <div className="tour-foot">
          {n > 1 ? <span className="tour-dots" aria-hidden="true">{steps.map((_, j) => <i key={j} className={j === i ? "on" : j < i ? "done" : ""} />)}</span> : <span className="tour-dots" />}
          {!last ? <button type="button" className="tour-skip" onClick={end}>Saltar</button> : null}
          <button type="button" className="tour-next" autoFocus onClick={() => (last ? end() : setI(i + 1))}>{last ? "Entendido" : "Siguiente"}</button>
        </div>
      </div>
    </div>,
    root,
  );
}
