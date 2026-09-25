"use client";
// Importación del CSV del TPV en tres pasos: columnas, productos y confirmación.
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { Confirm } from "@/components/ui/sheet";
import { toastError } from "@/components/ui/toast";
import { agruparVentas, contarTickets, diasPeriodo, fechaIsoValida, guessMapping, leerVentas, MAX_FILAS, parseCsv, periodoPorDefecto, type Mapping, type ParsedCsv } from "@/lib/csv";
import { bestMatches, norm } from "@/lib/fuzzy";
import { eur, fechaNum, isoDate, plural, qty } from "@/lib/format";
import { importar } from "../actions";

type Rec = { id: string; name: string; pvp: number | null; familia: string };
const COLS: [keyof Mapping, string, boolean][] = [["producto", "Producto o plato", true], ["unidades", "Unidades vendidas", false], ["importe", "Importe (con IVA)", false], ["fecha", "Fecha", false], ["tickets", "Tickets o comensales", false]];
/** Las acciones de servidor admiten hasta 2 MB por envío (next.config.ts): se avisa antes de llegar. */
const MAX_BYTES = 1_900_000;

export function Importador({ recetas, alias, tracked }: { recetas: Rec[]; alias: Record<string, string>; tracked: boolean }) {
  const [file, setFile] = useState<{ name: string; parsed: ParsedCsv } | null>(null);
  const [map, setMap] = useState<Mapping | null>(null);
  const [step, setStep] = useState(1);
  const [asig, setAsig] = useState<Record<string, string>>({});
  const [opts, setOpts] = useState({ actualizarUds: true, descontarStock: tracked });
  const [periodo, setPeriodo] = useState<{ desde: string; hasta: string } | null>(null);
  const [com, setCom] = useState<number | null>(null);
  const [solape, setSolape] = useState<{ filename: string; desde: string; hasta: string } | null>(null);
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
  const lect = useMemo(() => (file && map ? leerVentas(file.parsed.rows, map) : null), [file, map]);
  const rows = useMemo(() => lect?.rows ?? [], [lect]);
  const recById = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const productos = useMemo(() => {
    const m = new Map<string, { name: string; uds: number; importe: number; sinUds: boolean; impSinUds: number }>();
    for (const r of rows) {
      const k = norm(r.producto); const x = m.get(k) ?? { name: r.producto, uds: 0, importe: 0, sinUds: false, impSinUds: 0 };
      x.importe += r.importe ?? 0;
      if (r.unidades == null) { x.sinUds = true; x.impSinUds += r.importe ?? 0; } else x.uds += r.unidades;
      m.set(k, x);
    }
    return [...m.entries()].sort((a, b) => b[1].importe - a[1].importe || b[1].uds - a[1].uds);
  }, [rows]);
  const fechas = useMemo(() => [...new Set(rows.map((r) => r.fecha).filter((f): f is string => !!f))].sort(), [rows]);
  const tkHeader = map?.tickets != null ? file?.parsed.headers[map.tickets] ?? "" : null;
  const tk = useMemo(() => (tkHeader != null ? contarTickets(rows, tkHeader) : null), [rows, tkHeader]);
  // Sin fechas (o con una sola) no sabemos cuántos días recoge el archivo: lo indica el usuario.
  const pidePeriodo = fechas.length <= 1;
  const periodoOk = !pidePeriodo || (!!periodo && fechaIsoValida(periodo.desde) && fechaIsoValida(periodo.hasta) && periodo.desde <= periodo.hasta && diasPeriodo(periodo.desde, periodo.hasta) <= 366);
  const toStep2 = () => {
    const a: Record<string, string> = {};
    for (const [k, p] of productos) {
      if (alias[k] && recetas.some((r) => r.id === alias[k])) { a[k] = alias[k]; continue; }
      const m = bestMatches(p.name, recetas, (r) => [r.name], 0.72, 1)[0];
      a[k] = m ? m.item.id : "";
    }
    setAsig(a); setPeriodo(pidePeriodo ? periodoPorDefecto(fechas, isoDate()) : null); setCom(tk?.n ?? null); setStep(2);
  };
  const asignados = productos.filter(([k]) => asig[k]).length;
  const sinPvp = productos.filter(([k, p]) => p.sinUds && asig[k] && !recById.get(asig[k])?.pvp).length;
  const send = (forzar = false) => start(async () => {
    const { productos: nombres, filas } = agruparVentas(rows);
    const input: Parameters<typeof importar>[0] = {
      filename: file!.name, fuente: "csv", productos: nombres, filas, mapa: Object.fromEntries(productos.map(([k]) => [k, asig[k] || null])),
      desde: pidePeriodo ? periodo?.desde ?? null : null, hasta: pidePeriodo ? periodo?.hasta ?? null : null,
      comensales: tkHeader != null && com != null && com > 0 ? Math.round(com) : null, forzar, ...opts,
    };
    if (filas.length > MAX_FILAS || new TextEncoder().encode(JSON.stringify(input)).length > MAX_BYTES) {
      toastError("El archivo tiene demasiadas líneas para importarlo de una vez. Divídelo por meses."); return;
    }
    try {
      const r = await importar(input);
      if (r.ok) setDone(r.data); else if (r.solape) setSolape(r.solape); else toastError(r.error);
    } catch {
      toastError("No se han podido enviar las ventas. Revisa la conexión o divide el archivo por meses.");
    }
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
              <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i}><td>{fechaNum(r.fecha)}</td><td>{r.producto}</td><td className="r">{r.unidades == null ? "—" : qty(r.unidades)}</td><td className="r">{eur(r.importe)}</td></tr>)}</tbody></table></div>
            <p className="hint">{plural(rows.length, "línea válida", "líneas válidas")}{fechas.length ? ` · del ${fechaNum(fechas[0])} al ${fechaNum(fechas[fechas.length - 1])}` : ""}{lect?.orden === "mdy" ? " (fechas en formato mes/día)" : ""}
              {tk ? ` · ${tk.porId ? plural(tk.n, "ticket distinto", "tickets distintos") : plural(tk.n, "comensal", "comensales")}` : ""}. Las filas de totales se ignoran.
              {map && map.unidades == null && map.importe != null ? " Sin columna de unidades: las calculamos con el importe y el PVP de cada plato." : ""}</p>
            {lect?.fechasNoValidas ? <div className="note note-warn"><Icon name="alert" /><p>{plural(lect.fechasNoValidas, "fila tiene una fecha que no entendemos y no se importará", "filas tienen una fecha que no entendemos y no se importarán")}. Revisa qué columna es la fecha.</p></div> : null}
          </section>
          <button type="button" className="btn" disabled={!rows.length || (map?.unidades == null && map?.importe == null)} onClick={toStep2}>Siguiente: asignar productos</button>
        </>
      ) : (
        <>
          <section className="card">
            <div className="card-h"><h2 className="h3">¿Qué plato es cada producto del TPV?</h2><span className="tag">{asignados} de {productos.length}</span></div>
            <p className="muted small">Lo recordamos para la próxima importación. Los que dejes sin asignar no se importan (bebidas sueltas, extras…).</p>
            {sinPvp ? <div className="note note-warn"><Icon name="alert" /><p>{plural(sinPvp, "producto no trae unidades y su plato no tiene", "productos no traen unidades y su plato no tiene")} PVP: se importa el importe, pero sin unidades vendidas. Ponle PVP al plato para que cuenten.</p></div> : null}
            <div className="list">{productos.map(([k, p]) => {
              const pvp = asig[k] ? recById.get(asig[k])?.pvp : null;
              const uds = p.sinUds ? (pvp ? `≈ ${qty(p.uds + p.impSinUds / pvp, 1)} uds` : "sin unidades") : `${qty(p.uds)} uds`;
              return (
                <div className="li" key={k}>
                  <span className="li-main"><b>{p.name}</b><small>{uds} · {eur(p.importe)}</small></span>
                  <select className="inp inp-sm" style={{ maxWidth: 260 }} value={asig[k] ?? ""} onChange={(e) => setAsig((a) => ({ ...a, [k]: e.target.value }))} aria-label={`Plato para ${p.name}`}>
                    <option value="">No importar</option>{recetas.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>);
            })}</div>
          </section>
          {pidePeriodo ? (
            <section className="card" aria-labelledby="h-per">
              <div className="card-h"><h2 className="h3" id="h-per">¿Qué días recoge el archivo?</h2>{periodo && periodoOk ? <span className="muted small">{plural(diasPeriodo(periodo.desde, periodo.hasta), "día", "días")}</span> : null}</div>
              <p className="muted small">{fechas.length ? `Todas las filas son del ${fechaNum(fechas[0])}. Si el archivo resume más días, indícalo` : "El archivo no trae fechas. Indica el periodo que resume"}: con él pasamos las ventas a unidades al mes.</p>
              <div className="fgrid fgrid-2">
                <div className="fld"><label htmlFor="p-desde">Desde</label><input type="date" id="p-desde" className="inp inp-sm" value={periodo?.desde ?? ""} onChange={(e) => setPeriodo((p) => ({ desde: e.target.value, hasta: p?.hasta ?? e.target.value }))} /></div>
                <div className="fld"><label htmlFor="p-hasta">Hasta</label><input type="date" id="p-hasta" className="inp inp-sm" value={periodo?.hasta ?? ""} onChange={(e) => setPeriodo((p) => ({ desde: p?.desde ?? e.target.value, hasta: e.target.value }))} /></div>
              </div>
              {!periodoOk ? <p className="ferr">Indica un periodo válido: el inicio antes del final y como mucho un año.</p> : null}
            </section>
          ) : null}
          <section className="card">
            <label className="check"><input type="checkbox" checked={opts.actualizarUds} onChange={(e) => setOpts({ ...opts, actualizarUds: e.target.checked })} /><span>Actualizar las <b>unidades al mes</b> de cada plato con estas ventas (se usan en márgenes y avisos).</span></label>
            <label className="check"><input type="checkbox" checked={opts.descontarStock} disabled={!tracked} onChange={(e) => setOpts({ ...opts, descontarStock: e.target.checked })} /><span>Descontar del <b>inventario</b> los ingredientes de lo vendido{!tracked ? " (aún no controlas stock)" : ""}.</span></label>
            {tkHeader != null ? (
              <div className="fld"><label htmlFor="v-com">Tickets o comensales del periodo</label>
                <NumInput id="v-com" className="inp inp-sm" style={{ maxWidth: 160 }} decimals={0} value={com} onValue={(n) => setCom(n == null ? null : Math.max(0, Math.round(n)))} />
                <p className="hint">{tk ? (tk.porId ? `Tickets distintos de la columna «${tkHeader}».` : `Suma de la columna «${tkHeader}»: si el archivo repite la cifra en cada producto, corrígela.`) : `La columna «${tkHeader}» no trae datos.`} Se usa para el ticket por comensal.</p></div>
            ) : null}
          </section>
          <div className="row-wrap"><button type="button" className="btn btn-3" onClick={() => setStep(1)}><Icon name="back" size={18} /> Atrás</button>
            <button type="button" className="btn" disabled={pending || !asignados || !periodoOk} onClick={() => send()}>{pending ? <span className="spin" /> : null}Importar {plural(asignados, "producto", "productos")}</button></div>
          <Confirm open={!!solape} onClose={() => setSolape(null)} title="Ventas ya importadas" confirm="Importar igualmente" busy={pending}
            text={solape ? `Ya importaste «${solape.filename || "Ventas"}», con ventas del ${fechaNum(solape.desde)} al ${fechaNum(solape.hasta)}, y este archivo coincide en fechas. Si lo importas, esas ventas contarán dos veces y el inventario se descontará otra vez. Para sustituirla, bórrala antes en Ventas.` : ""}
            onConfirm={() => { setSolape(null); send(true); }} />
        </>
      )}
    </div>
  );
}
