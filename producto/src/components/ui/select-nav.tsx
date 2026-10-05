"use client";
// Selector que navega al cambiar (ordenar, elegir periodo…): sin botón «Filtrar» y con la URL como estado, así se puede compartir y volver atrás.
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SelectNav({ label, value, options, className = "inp" }: { label: string; value: string; options: { v: string; l: string; href: string }[]; className?: string }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  return (
    <select className={className} aria-label={label} value={value} aria-busy={pend || undefined} data-pend={pend || undefined}
      onChange={(e) => { const o = options.find((x) => x.v === e.target.value); if (o) start(() => router.push(o.href)); }}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
