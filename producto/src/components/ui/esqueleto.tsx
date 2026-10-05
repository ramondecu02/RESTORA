// Esqueleto de carga genérico: la misma estructura que las pantallas de lista (fichas, filtros, tarjeta con filas y, si toca,
// una columna lateral) para que al llegar los datos no haya saltos. Se usa dentro de <Suspense> DESPUÉS de comprobar la sesión
// y el plan en la página: así el bloqueo sigue siendo una redirección real y no una navegación del cliente.
import type { CSSProperties } from "react";

const L = (w: number | string, h = 12, extra?: CSSProperties) => <i className="skel sk-line" style={{ width: w, height: h, ...extra }} />;

function Filas({ n }: { n: number }) {
  return <>{Array.from({ length: n }, (_, i) => (
    <div className="sk-row" key={i}>
      <i className="skel sk-ic" />
      <div className="sk-col">{L(`${46 + ((i * 17) % 30)}%`, 14)}{L(`${30 + ((i * 11) % 25)}%`)}</div>
      {L(54, 14)}
    </div>))}</>;
}

export function Esqueleto({ banner = false, kpis = 0, filas = 0, platos = 0, lateral = false, filtros = false, texto = "Cargando…" }: {
  /** Cabecera con foto (la carta). */
  banner?: boolean;
  /** Número de fichas de la fila de indicadores. */
  kpis?: number;
  /** Filas de la tarjeta principal. */
  filas?: number;
  /** Tarjetas de plato (rejilla de la carta). */
  platos?: number;
  /** Columna lateral con dos tarjetas de gráfico. */
  lateral?: boolean;
  /** Barra de búsqueda y filtros. */
  filtros?: boolean;
  texto?: string;
}) {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <span className="sr">{texto}</span>
      {banner ? <i className="skel" style={{ display: "block", height: 150, borderRadius: 18 }} /> : null}
      {kpis ? <div className="tiles tiles-row">{Array.from({ length: kpis }, (_, i) => <i className="skel sk-tile" key={i} />)}</div> : null}
      <div className={lateral ? "list-grid" : undefined}>
        <div className="stack">
          {filtros ? <div className="toolbar"><i className="skel" style={{ flex: "1 1 220px", height: 44, borderRadius: 12 }} /><i className="skel" style={{ width: 150, height: 44, borderRadius: 12 }} /></div> : null}
          {filas ? <div className="sk-card">{L(150, 16)}<Filas n={filas} /></div> : null}
          {platos ? <div className="dishgrid">{Array.from({ length: platos }, (_, i) => <i className="skel sk-dish" key={i} />)}</div> : null}
        </div>
        {lateral ? (
          <div className="stack">
            <div className="sk-card">{L(140, 16)}<i className="skel" style={{ height: 120, borderRadius: 12 }} /></div>
            <div className="sk-card">{L(160, 16)}{[0, 1, 2, 3].map((i) => <i className="skel sk-line" key={i} style={{ height: 18 }} />)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
