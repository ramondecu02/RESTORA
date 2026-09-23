"use client";
// Tooltip que sigue al ratón sobre cualquier elemento con data-tip="Título|detalle|detalle".
import { useEffect, useRef } from "react";

export function TipLayer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tip = ref.current!;
    let cur: Element | null = null;
    const show = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.("[data-tip]");
      if (!t) { if (cur) { cur = null; tip.hidden = true; } return; }
      if (t !== cur) {
        cur = t;
        const parts = (t.getAttribute("data-tip") || "").split("|");
        tip.replaceChildren();
        const b = document.createElement("b"); b.textContent = parts[0]; tip.appendChild(b);
        for (const p of parts.slice(1)) { const s = document.createElement("span"); s.textContent = p; s.style.display = "block"; tip.appendChild(s); }
        tip.hidden = false;
      }
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > window.innerHeight - 8) y = e.clientY - h - 14;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    };
    const hide = () => { cur = null; tip.hidden = true; };
    document.addEventListener("pointermove", show);
    document.addEventListener("pointerdown", hide);
    window.addEventListener("scroll", hide, true);
    return () => { document.removeEventListener("pointermove", show); document.removeEventListener("pointerdown", hide); window.removeEventListener("scroll", hide, true); };
  }, []);
  return <div id="tip" ref={ref} hidden role="tooltip" />;
}
