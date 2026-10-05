"use client";
// Navegación en pestañas del móvil: si no caben todos los nombres, se desliza, y al entrar deja a la vista la pestaña actual.
import { useEffect, useRef, type ReactNode } from "react";

export function SegNav({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("[aria-current]")?.scrollIntoView({ inline: "center", block: "nearest" }); }, []);
  return <nav ref={ref} className="seg subnav" aria-label={label} data-tour="seg">{children}</nav>;
}
