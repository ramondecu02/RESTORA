// «Requiere tu atención»: lo que pide una decisión, de más a menos grave, separado de la información de fondo.
// Es la misma banda en Hoy y en las demás pantallas: cada tarjeta dice qué pasa, cuánto pesa y qué hacer.
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export type Foco = {
  tono: "bad" | "warn" | "info";
  ic: IconName;
  /** Tema en una o dos palabras («Subida de precio»). */
  k: string;
  /** La frase: qué pasa. */
  t: string;
  /** El detalle: a quién afecta y qué hacer. */
  p: string;
  /** Cifra que pesa, ya con su animación, y la unidad que la acompaña. */
  fig?: [ReactNode, string];
  /** Acción principal y, si la hay, una segunda. */
  a: [string, string];
  b?: [string, string];
};

const ORDEN = { bad: 0, warn: 1, info: 2 } as const;

/** Ordena de más a menos grave (a igual gravedad, se respeta el orden en que se dieron). */
export const porGravedad = (focos: Foco[]) => [...focos].sort((x, y) => ORDEN[x.tono] - ORDEN[y.tono]);

export function Atencion({ focos, titulo, id, max = 4, chip, verTodo, compacta = false }: {
  focos: Foco[]; titulo: string; id: string; max?: number;
  /** A la derecha del título (por ejemplo, el estado de salud de la carta). */
  chip?: ReactNode;
  /** «Ver todos los avisos» cuando hay más tarjetas que las que caben. */
  verTodo?: [string, string];
  /** Sin la cifra grande: para pantallas donde la banda es un aviso y no el protagonista. */
  compacta?: boolean;
}) {
  if (!focos.length) return null;
  return (
    <section className={`focus ${compacta ? "focus-c" : ""}`} aria-labelledby={id}>
      <div className="focus-h">
        <h2 className="h2" id={id}>{titulo}<span className="focus-n">{focos.length}</span></h2>
        {chip}
      </div>
      <div className="focus-list">{focos.slice(0, max).map((f, i) => (
        <article className={`fc fc-${f.tono}`} key={f.t} style={{ ["--i" as string]: i }}>
          <div className="fc-k"><Icon name={f.ic} size={16} /> {f.k}</div>
          <h3 className="fc-t">{f.t}</h3>
          {f.fig && !compacta ? <p className="fc-fig"><b>{f.fig[0]}</b> <small>{f.fig[1]}</small></p> : null}
          <p className="fc-p">{f.p}</p>
          <div className="fc-a"><Link className="btn btn-2 btn-xs" href={f.a[1]}>{f.a[0]}</Link>{f.b ? <Link className="btn btn-3 btn-xs" href={f.b[1]}>{f.b[0]}</Link> : null}</div>
        </article>))}</div>
      {verTodo && focos.length > max ? <Link className="linkbtn" href={verTodo[1]}>{verTodo[0]} <Icon name="arrowR" size={16} /></Link> : null}
    </section>
  );
}
