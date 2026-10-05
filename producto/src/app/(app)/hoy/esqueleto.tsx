// Esqueleto de Hoy: la misma estructura que la pantalla (aviso, panel y columna lateral) para que no haya saltos al llegar los datos.
export function HoyEsqueleto() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <span className="sr">Cargando tu resumen de hoy…</span>
      <div className="greet"><i className="skel sk-line" style={{ width: 150 }} /><i className="skel" style={{ width: 210, height: 26, marginTop: 6 }} /></div>
      <div className="hoy-grid">
        <div className="hoy-col">
          <div className="focus-list">{[0, 1, 2].map((i) => (
            <div className="sk-card" key={i}><i className="skel sk-line" style={{ width: "40%" }} /><i className="skel sk-line" style={{ width: "85%", height: 16 }} /><i className="skel sk-line" style={{ width: "30%", height: 26 }} /><i className="skel sk-line" style={{ width: "70%" }} /></div>))}</div>
          <div className="panel">
            <div className="panel-h"><i className="skel sk-line" style={{ width: 150, height: 18 }} /><i className="skel" style={{ width: 260, height: 40, borderRadius: 12 }} /></div>
            <div className="panel-body">
              <div className="panel-gauge"><i className="skel sk-gauge" /><i className="skel sk-line" style={{ width: 170 }} /></div>
              <div className="tiles">{[0, 1, 2, 3].map((i) => <i className="skel" key={i} style={{ height: 104, borderRadius: 14 }} />)}</div>
            </div>
            <i className="skel" style={{ height: 220, borderRadius: 12 }} />
          </div>
          <div className="sk-card"><i className="skel sk-line" style={{ width: 160, height: 16 }} /><i className="skel" style={{ height: 150, borderRadius: 12 }} /></div>
        </div>
        <div className="hoy-col">
          <div className="sk-card">{[0, 1, 2, 3, 4].map((i) => <i className="skel sk-line" key={i} style={{ height: 22 }} />)}</div>
          <div className="sk-card"><i className="skel sk-line" style={{ width: 150, height: 16 }} /><i className="skel" style={{ height: 120, borderRadius: 12 }} /></div>
        </div>
      </div>
    </div>
  );
}
