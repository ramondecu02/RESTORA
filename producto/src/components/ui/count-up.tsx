"use client";
// Cifra que cuenta hasta su valor al aparecer y que se desliza del valor anterior al nuevo cuando cambia (p. ej. al cambiar de mes).
// El HTML del servidor ya trae el valor final: sin JavaScript, con «reducir movimiento» o para un lector de pantalla se lee siempre la cifra buena.
import { useEffect, useRef } from "react";
import { eur, eur0, qty } from "@/lib/format";

/** Formatos disponibles: se pide por nombre porque desde una página del servidor no se pueden pasar funciones a un componente de cliente. */
const FORMATOS = {
  eur: (n: number) => eur(n),
  eur0: (n: number) => eur0(n),
  int: (n: number) => qty(n, 0),
  pct0: (n: number) => qty(n, 0) + " %",
  pct1: (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %",
  dias: (n: number) => qty(n, 0) + " d",
} as const;
export type CountFmt = keyof typeof FORMATOS;

const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, fmt = "int", duration = 650, className }: { value: number | null; fmt?: CountFmt; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null); // lo que se está enseñando ahora (para continuar desde ahí si cambia a mitad)
  const format = FORMATOS[fmt];
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value == null) { el.textContent = "—"; shown.current = null; return; }
    const from = shown.current ?? 0;
    if (reduce() || from === value) { el.textContent = format(value); shown.current = value; return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 4); // ease-out fuerte: arranca rápido y se asienta
      const v = k >= 1 ? value : from + (value - from) * e;
      shown.current = v;
      el.textContent = format(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, format]);
  return <span ref={ref} className={className}>{value == null ? "—" : format(value)}</span>;
}
