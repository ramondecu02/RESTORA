"use client";
// Importación del CSV del TPV en tres pasos: columnas, productos y confirmación.
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toastError } from "@/components/ui/toast";
import { guessMapping, parseCsv, rowsFromMapping, type Mapping, type ParsedCsv } from "@/lib/csv";
import { bestMatches, norm } from "@/lib/fuzzy";
import { eur, fechaNum, plural, qty } from "@/lib/format";
import { importar } from "../actions";

type Rec = { id: string; name: string; pvp: number | null; familia: string };
const COLS: [keyof Mapping, string, boolean][] = [["producto", "Producto o plato", true], ["unidades", "Unidades vendidas", false], ["importe", "Importe (con IVA)", false], ["fecha", "Fecha", false], ["tickets", "Tickets o comensales", false]];

export function Importador({ recetas, alias, tracked }: { recetas: Rec[]; alias: Record<string, string>; tracked: boolean }) {
  const [file, setFile] = useState<{ name: string; parsed: ParsedCsv } | null>(null);
  const [map, setMap] = useState<Mapping | null>(null);
  const [step, setStep] = useState(1);
  const [asig, setAsig] = useState<Record<string, string>>({});
  const [opts, setOpts] = useState({ actualizarUds: true, descontarStock: tracked });
  const [done, setDone] = useState<null | { filas: number; total: number; sinAsignar: number; recetas: number; articulos: number; desde: string; hasta: string }>(null);
  const [pending, start] = useTransition();

  const load = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toastError("El archivo pesa demasiado (máximo 8 MB)."); return; }
    let text = await f.text();
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(await f.arrayBuffer());
    const parsed = parseCsv(text);
    if (!parsed.headers.length) { toastError("El archivo está vacío o no es un CSV."); return; }
    setFile({ name: f.name, parsed });
    setMap(parsed.mapping ?? guessMapping(parsed.headers, parsed.rows) ?? { producto: 0, unidades: null, importe: null, fecha: null, tickets: null });
    setStep(1);
  };
  const rows = useMemo(() => (file && map ? rowsFromMapping(file.parsed.rows, map) : []), [file, map]);
  const productos = useMemo(() => {
    const m = new Map<string, { name: string; uds: number; importe: number }>();
    for (const r of rows) { const k = norm(r.producto); const x = m.get(k) ?? { name: r.producto, uds: 0, importe: 0 }; x.uds += r.unidades; x.importe += r.importe ?? 0; m.set(k, x); }
    return [...m.entries()].sort((a, b) => b[1].importe - a[1].importe || b[1].uds - a[1].uds);
  }, [rows]);
  const toStep2 = () => {
    const a: Record<string, string> = {};
    for (const [k, p] of productos) {
      if (alias[k] && recetas.some((r) => r.id === alias[k])) { a[k] = alias[k]; continue; }
      const m = bestMatches(p.name, recetas, (r) => [r.name], 0.72, 1)[0];
      a[k] = m ? m.item.id : "";
    }
    setAsig(a); setStep(2);
  };
  const asignados = productos.filter(([k]) => asig[k]).length;
  const fechas = rows.map((r) => r.fecha).filter(Boolean).sort() as string[];
  const comensales = map?.tickets != null ? rows.reduce((s, r) => s + (r.tickets ?? 0), 0) : null;
  const send = () => start(async () => {
    const r = await importar({ filename: file!.name, fuente: "csv", rows: rows.map((x) => ({ fecha: x.fecha, producto: x.producto, unidades: x.unidades, importe: x.importe })),
      mapa: Object.fromEntries(productos.map(([k]) => [k, asig[k] || null])), comensales: comensales ? Math.round(comensales) : null, ...opts });
    if (r.ok) setDone(r.data!); else toastError(r.error);
  });

  if (done) return (
    <div className="stack narrow-col">
      <span className="okmark"><Icon name="check" /></span>
      <div className="saved-h"><h2>Ventas importadas</h2><p className="muted">{fechaNum(done.desde)} – {fechaNum(done.hasta)} · {plural(done.filas, "línea", "líneas")} · {eur(done.total)}</p></div>
      <ul className="stack-sm">
        <li className="note note-ok"><Icon name="check" /><p>{plural(done.recetas, "plato actualizado", "platos actualizados")} con sus unidades vendidas{opts.actualizarUds ? " (pasadas a unidades al mes)" : ""}.</p></li>
        {opts.descontarStock ? <li className="note note-ok"><Icon name="check" /><p>Descontado del inventario lo que llevan esos platos ({plural(done.articulos, "artículo", "artículos")}).</p></li> : null}
        {done.sinAsignar ? <li className="note note-warn"><Icon name="alert" /><p>{plural(done.sinAsignar, "línea sin asignar no se ha", "líneas sin asignar no se han")} importado.</p></li> : null}
      </ul>
      <Link className="btn" href="/ventas">Ver rentabilidad</Link>
    </div>
  );

  return (
    <div className="stack narrow-col" style={{ maxWidth: 820 }}>
      {!file ? (
        <>
          <label className="drop" htmlFor="csv">
            <span className="drop-ic"><Icon name="sheet" /></span>
            <b>Sube el CSV de ventas de tu TPV</b>
            <span className="muted">Con una fila por producto (y día, si lo tienes): producto, unidades e importe. Lo exportan Glop, Revo, Ágora, Cuiner, Square y casi todos.</span>
          </label>
          <input id="csv" className="sr" type="file" accept=".csv,text/csv,.txt" onChange={(e) => load(e.target.files?.[0])} />
          <div className="note"><Icon name="info" /><p>No conectamos con el TPV: tú exportas el archivo y lo subes cuando quieras (por ejemplo, una vez al mes). Recordamos cómo se llama cada plato en tu TPV para la próxima vez.</p></div>
        </>
      ) : step === 1 ? (
        <>
          <div className="row-sb"><b>{file.name}</b><button type="button" className="linkbtn" onClick={() => setFile(null)}>Cambiar archivo</button></div>
          <section className="card">
            <div className="card-h"><h2 className="h3">¿Qué hay en cada columna?</h2><span className="muted small">{plural(file.parsed.rows.length, "fila", "filas")}</span></div>
            <div className="fgrid fgrid-2">{COLS.map(([k, l, req]) => (
              <div className="fld" key={k}><label htmlFor={`m-${k}`}>{l}{req ? " *" : ""}</label>
                <select id={`m-${k}`} className="inp inp-sm" value={map?.[k] ?? ""} onChange={(e) => setMap((m) => ({ ...(m as Mapping), [k]: e.target.value === "" ? null : Number(e.target.value) }))}>
                  {!req ? <option value="">— No hay —</option> : null}
                  {file.parsed.headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                </select></div>))}</div>
            {map && map.unidades == null && map.importe == null ? <p className="ferr">Indica al menos las unidades o el importe.</p> : null}
          </section>
          <section className="card"><div className="card-h"><h2 className="h3">Así lo leemos</h2></div>
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Fecha</th><th>Producto</th><th className="r">Uds</th><th className="r">Importe</th></tr></thead>
              <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i}><td>{fechaNum(r.fecha)}</td><td>{r.producto}</td><td className="r">{qty(r.unidades)}</td><td className="r">{eur(r.importe)}</td></tr>)}</tbody></table></div>
            <p className="hint">{plural(rows.length, "línea válida", "líneas válidas")}{fechas.length ? ` · del ${fechaNum(fechas[0])} al ${fechaNum(fechas[fechas.length - 1])}` : ""}. Las filas de totales se ignoran.</p>
          </section>
          <button type="button" className="btn" disabled={!rows.length || (map?.unidades == null && map?.importe == null)} onClick={toStep2}>Siguiente: asignar productos</button>
        </>
      ) : (
        <>
          <section className="card">
            <div className="card-h"><h2 className="h3">¿Qué plato es cada producto del TPV?</h2><span className="tag">{asignados} de {productos.length}</span></div>
            <p className="muted small">Lo recordamos para la próxima importación. Los que dejes sin asignar no se importan (bebidas sueltas, extras…).</p>
            <div className="list">{productos.map(([k, p]) => (
              <div className="li" key={k}>
                <span className="li-main"><b>{p.name}</b><small>{qty(p.uds)} uds · {eur(p.importe)}</small></span>
                <select className="inp inp-sm" style={{ maxWidth: 260 }} value={asig[k] ?? ""} onChange={(e) => setAsig((a) => ({ ...a, [k]: e.target.value }))} aria-label={`Plato para ${p.name}`}>
                  <option value="">No importar</option>{recetas.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>))}</div>
          </section>
          <section className="card">
            <label className="check"><input type="checkbox" checked={opts.actualizarUds} onChange={(e) => setOpts({ ...opts, actualizarUds: e.target.checked })} /><span>Actualizar las <b>unidades al mes</b> de cada plato con estas ventas (se usan en márgenes y avisos).</span></label>
            <label className="check"><input type="checkbox" checked={opts.descontarStock} disabled={!tracked} onChange={(e) => setOpts({ ...opts, descontarStock: e.target.checked })} /><span>Descontar del <b>inventario</b> los ingredientes de lo vendido{!tracked ? " (aún no controlas stock)" : ""}.</span></label>
          </section>
          <div className="row-wrap"><button type="button" className="btn btn-3" onClick={() => setStep(1)}><Icon name="back" size={18} /> Atrás</button>
            <button type="button" className="btn" disabled={pending || !asignados} onClick={send}>{pending ? <span className="spin" /> : null}Importar {plural(asignados, "producto", "productos")}</button></div>
        </>
      )}
    </div>
  );
}
