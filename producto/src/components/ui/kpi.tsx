// Ficha de indicador: la misma en todas las pantallas. La cifra cuenta hasta su valor, la variación dice si va a mejor o a peor
// frente al periodo anterior, la miniatura enseña de dónde viene y, si lleva a algún sitio, la ficha entera es un enlace.
// Sirve igual desde una página del servidor que desde un componente de cliente (la cifra animada es la única parte de cliente).
import Link from "next/link";
import type { ReactNode } from "react";
import { Delta, Sparkline } from "@/components/charts";
import { CountUp, type CountFmt } from "@/components/ui/count-up";

export type KpiProps = {
  label: string;
  value: number | null;
  fmt: CountFmt;
  /** Variación frente al periodo anterior (en %, o en la unidad de `deltaSuffix`). */
  delta?: number | null;
  /** En costes, que suba es malo. */
  goodWhenUp?: boolean;
  /** « %» por defecto; «pp» para diferencias entre porcentajes. */
  deltaSuffix?: string;
  /** Evolución en miniatura (huecos = null) y posición del punto que se resalta. */
  spark?: (number | null)[];
  marca?: number;
  /** «vs septiembre»: se enseña bajo la cifra cuando hay variación. */
  vs?: string | null;
  /** Se enseña cuando no hay dato todavía (qué hacer para tenerlo). */
  hint?: string;
  /** Apoyo bajo la cifra cuando no hay comparación. */
  sub?: ReactNode;
  /** Unidad pequeña junto a la cifra («platos»). */
  unit?: string;
  /** Un estado en lugar de una cifra («Activa»): no cuenta ni lleva variación; el apoyo es `sub`. */
  text?: string;
  /** Pinta la cifra: bien, a vigilar o mal. */
  tone?: "ok" | "warn" | "bad";
  /** Si lleva a algún sitio, toda la ficha es un enlace. */
  href?: string | null;
  /** Para fichas dentro de un componente de cliente: en vez de enlace, un botón (con `pressed` si filtra algo). */
  onClick?: () => void;
  pressed?: boolean;
  /** Posición en la fila: escalona la entrada. */
  i?: number;
};

export function Kpi({ label, value, fmt, delta = null, goodWhenUp = true, deltaSuffix, spark, marca, vs = null, hint, sub, unit, text, tone, href, onClick, pressed, i = 0 }: KpiProps) {
  const apoyo = text ? sub : value == null ? hint : delta != null && vs ? vs : sub;
  const inner = <>
    <span className="tile-lab">{label}</span>
    <div className="tile-mid">
      <span className="tile-val">{text ?? <><CountUp value={value} fmt={fmt} />{unit && value != null ? <small> {unit}</small> : null}</>}</span>
      {text ? null : <Delta value={delta} goodWhenUp={goodWhenUp} suffix={deltaSuffix} />}
    </div>
    {spark ? <Sparkline values={spark} marca={marca} label={`${label}: evolución`} /> : null}
    <span className="tile-vs">{apoyo ?? " "}</span>
  </>;
  const cls = `tile${tone ? ` tile-${tone}` : ""}${href || onClick ? " tile-link" : ""}`;
  const style = { ["--i" as string]: i };
  if (onClick) return <button type="button" className={cls} style={style} onClick={onClick} aria-pressed={pressed}>{inner}</button>;
  return href ? <Link className={cls} href={href} style={style}>{inner}</Link> : <div className={cls} style={style}>{inner}</div>;
}

/** Fila de fichas: dos columnas en el móvil y cuatro cuando el contenido da de sí. */
export function Kpis({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="tiles tiles-row" role="group" aria-label={label}>{children}</div>;
}
