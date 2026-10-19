"use client";
// Puntos bajo una fila que se desliza (móvil): dicen cuántas tarjetas hay y cuál se ve; pulsar un punto lleva a esa tarjeta.
import { useEffect, useRef, useState } from "react";

export function PuntosCarrusel({ total }: { total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  useEffect(() => {
    const lista = ref.current?.previousElementSibling as HTMLElement | null;
    if (!lista) return;
    const calcula = () => {
      const t = lista.children;
      if (!t.length) return;
      const paso = (t[1] as HTMLElement | undefined)?.offsetLeft ?? 0;
      const base = (t[0] as HTMLElement).offsetLeft;
      const llegaAlFinal = lista.scrollLeft + lista.clientWidth >= lista.scrollWidth - 4;
      setActual(llegaAlFinal ? t.length - 1 : paso > base ? Math.round(lista.scrollLeft / (paso - base)) : 0);
    };
    calcula();
    lista.addEventListener("scroll", calcula, { passive: true });
    return () => lista.removeEventListener("scroll", calcula);
  }, []);
  const ir = (i: number) => {
    const lista = ref.current?.previousElementSibling as HTMLElement | null;
    const t = lista?.children[i] as HTMLElement | undefined;
    if (lista && t) lista.scrollTo({ left: t.offsetLeft - 16, behavior: "smooth" });
  };
  return (
    <div className="dots" ref={ref} role="group" aria-label="Avisos">
      {Array.from({ length: total }, (_, i) => (
        <button key={i} type="button" className="dot" aria-label={`Aviso ${i + 1} de ${total}`} aria-current={i === actual ? "true" : undefined} onClick={() => ir(i)} />
      ))}
    </div>
  );
}
