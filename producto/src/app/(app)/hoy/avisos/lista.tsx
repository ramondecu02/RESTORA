"use client";
// Avisos de precio ordenados por lo que pesan: los que piden acción primero, cada uno con su impacto al mes en una barra, y el detalle
// que se abre al pulsar (el primero, ya abierto). Filtrar es instantáneo: no hay viaje al servidor.
import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "@/components/icons";
import { eur, eur0, fcPar, pct, plural } from "@/lib/format";

export type Aviso = {
  id: string; nombre: string; unit: string; proveedor: string | null; fecha: string; antes: number; ahora: number; variacion: number;
  platos: { id: string; name: string }[]; salen: { id: string; name: string }[]; impactoMes: number; fcAntes: number | null; fcDespues: number | null;
  alternativa: { proveedor: string; precio: number } | null;
};
type Filtro = "todos" | "accion" | "vigilar";
const PASO = 8;

export function ListaAvisos({ avisos }: { avisos: Aviso[] }) {
  const base = useId();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(avisos.slice(0, 1).map((a) => a.id)));
  const [mostrar, setMostrar] = useState(PASO);
  const accion = avisos.filter((a) => a.salen.length);
  const vigilar = avisos.filter((a) => !a.salen.length);
  const lista = filtro === "accion" ? accion : filtro === "vigilar" ? vigilar : avisos;
  const visibles = lista.slice(0, mostrar);
  const max = Math.max(1e-9, ...avisos.map((a) => a.impactoMes));
  const alternar = (id: string) => setAbiertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const elegir = (f: Filtro) => { setFiltro(f); setMostrar(PASO); };
  const chip = (f: Filtro, texto: string, n: number) => (
    <button type="button" aria-pressed={filtro === f} className={`chip ${filtro === f ? "is-on" : ""}`} onClick={() => elegir(f)}>{texto} <span className="cnt">{n}</span></button>
  );
  return (
    <section className="stack-sm" aria-label="Avisos de precio">
      <div className="chips" role="group" aria-label="Filtrar avisos">
        {chip("todos", "Todos", avisos.length)}
        {chip("accion", "Acción recomendada", accion.length)}
        {chip("vigilar", "Para vigilar", vigilar.length)}
      </div>
      {visibles.length ? (
        <div className="av-list">
          {visibles.map((a, i) => {
            const abierto = abiertos.has(a.id);
            const idc = `${base}-${a.id}`;
            const tono = a.salen.length ? "bad" : "warn";
            const principal = a.salen[0] ?? a.platos[0];
            return (
              <article key={a.id} className={`av av-${tono} ${abierto ? "is-open" : ""}`} style={{ ["--i" as string]: Math.min(i, 6) }}>
                <button type="button" className="av-h" aria-expanded={abierto} aria-controls={idc} onClick={() => alternar(a.id)}>
                  <span className={`ins-ic ${tono}`}><Icon name="trendUp" /></span>
                  <span className="av-t">
                    <b>{a.nombre} <span className={`av-pct ${tono}`}>+{pct(a.variacion)}</span></b>
                    <small>{a.proveedor ? `${a.proveedor} · ` : ""}{plural(a.platos.length, "plato afectado", "platos afectados")}{a.salen.length ? ` · ${plural(a.salen.length, "se sale del objetivo", "se salen del objetivo")}` : ""}</small>
                  </span>
                  <span className="av-e"><b>+{eur0(a.impactoMes)}</b><small>al mes</small></span>
                  <Icon name="chevD" size={18} className="ic av-chev" />
                  <span className="av-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, (a.impactoMes / max) * 100)}%` }} /></span>
                </button>
                <div className="av-body" id={idc} inert={!abierto}>
                  <div className="av-in">
                    <p className="ins-p">De {eur(a.antes)} a {eur(a.ahora)}/{a.unit} el {a.fecha}. {a.salen.length ? `${a.salen.map((p) => p.name).slice(0, 4).join(", ")} ${a.salen.length === 1 ? "pasa" : "pasan"} del objetivo.` : "Ninguno se sale del objetivo, pero el margen se estrecha."} Afecta a: {a.platos.map((p) => p.name).slice(0, 4).join(", ")}{a.platos.length > 4 ? ` y ${a.platos.length - 4} más` : ""}.</p>
                    <div className="ins-figs">
                      <div className="ins-fig"><small>Coste extra al mes</small><b>{eur(a.impactoMes)}</b></div>
                      <div className="ins-fig"><small>Food cost de la carta</small><b>{fcPar(a.fcAntes, a.fcDespues)}</b></div>
                      <div className="ins-fig"><small>Platos afectados</small><b>{a.platos.length}</b></div>
                    </div>
                    {a.alternativa ? <p className="ins-p ins-alt"><Icon name="swap" size={16} /><span>{a.alternativa.proveedor} lo tiene a {eur(a.alternativa.precio)}/{a.unit}.</span></p> : null}
                    <div className="ins-acts">
                      <Link className="btn btn-2 btn-xs" href={`/escandallos/${principal.id}`}>Valorar {principal.name}</Link>
                      <Link className="btn btn-3 btn-xs" href={`/articulos/${a.id}`}>{a.alternativa ? "Ver alternativas" : "Ver el artículo"}</Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="muted small">No hay avisos con ese filtro.</p>}
      {lista.length > mostrar ? <button type="button" className="btn btn-2 btn-sm av-mas" onClick={() => setMostrar((m) => m + PASO)}>Ver {Math.min(PASO, lista.length - mostrar)} más <span className="muted">({lista.length - mostrar} sin ver)</span></button> : null}
    </section>
  );
}
