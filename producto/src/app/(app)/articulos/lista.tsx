"use client";
// Listado de artículos: búsqueda y filtros al momento, agrupado por tipo, y el margen de los productos que se venden tal cual
// (vinos, cervezas, refrescos…) con el precio de venta editable en la propia fila.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { toast, toastError } from "@/components/ui/toast";
import { estadoFC } from "@/lib/costing";
import { eur, pct, pctN, plural, qty } from "@/lib/format";
import { lineUnitsFor, type BaseUnit, type LineUnit } from "@/lib/units";
import { cantidadPorVenta, costeDeVenta, margenVenta, pistasPorEnvase, SERVIDOS_ML, servidoPorDefecto, ventasPorUnidad, type Servido } from "@/lib/venta-articulo";
import { editarReventa } from "../ventas/reventa";
import { fijarVentaArticulo } from "./actions";

type Kind = "cocina" | "bebida" | "otros";
export type Venta = Servido & { pvp: number | null };
export type ArtFila = {
  id: string; name: string; cat: string; catName: string; catOrden: number; kind: Kind; prov: string | null; unit: BaseUnit;
  stock: number | null; precio: number | null; src: string | null; variacion: number | null; gasto: number;
  /** Producto final (vino, cerveza, refresco, licor): se vende tal cual y tiene margen propio */
  reventa: boolean;
  /** €/unidad base ya con el aprovechable aplicado: lo que cuesta de verdad lo que se sirve */
  costeNeto: number | null;
  venta: Venta | null;
};
type Orden = "nombre" | "gasto" | "subida" | "precio" | "margen";
const KINDS: { k: Kind | "todos"; t: string }[] = [{ k: "todos", t: "Todos" }, { k: "cocina", t: "Cocina" }, { k: "bebida", t: "Bebidas" }, { k: "otros", t: "Otros" }];
const PAGINA = 60;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lo que se sirve en cada venta: lo guardado o, si es una unidad suelta, una unidad. */
const servido = (a: ArtFila, v: Venta | null) => v ?? (servidoPorDefecto(a.unit) ? { pvp: null, ...servidoPorDefecto(a.unit)! } : null);
const costeVenta = (a: ArtFila, v: Venta | null) => { const s = servido(a, v); return s ? costeDeVenta(a.costeNeto, s.cantidad, s.unidad, a.unit, s.raciones) : null; };

export function ListaArticulos({ filas, iva, fcObjetivo, canPrecios, inicial }: {
  filas: ArtFila[]; iva: number; fcObjetivo: number; canPrecios: boolean; inicial: { q: string; cat: string; orden: string };
}) {
  const [q, setQ] = useState(inicial.q);
  const [cat, setCat] = useState(inicial.cat);
  const [orden, setOrden] = useState<Orden>((["nombre", "gasto", "subida", "precio", "margen"] as string[]).includes(inicial.orden) ? (inicial.orden as Orden) : "nombre");
  const [kind, setKind] = useState<Kind | "todos">(() => filas.find((f) => f.cat === inicial.cat)?.kind ?? "todos");
  const [solo, setSolo] = useState<null | "sinPrecio" | "subidas" | "sinPvp">(null);
  const [ventas, setVentas] = useState<Record<string, Venta | null>>(() => Object.fromEntries(filas.filter((f) => f.reventa).map((f) => [f.id, f.venta])));
  const [abierto, setAbierto] = useState<string | null>(null);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [limite, setLimite] = useState(PAGINA);
  const [prev, setPrev] = useState(filas);
  if (prev !== filas) { setPrev(filas); setVentas(Object.fromEntries(filas.filter((f) => f.reventa).map((f) => [f.id, f.venta]))); }
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Artículos que ya tienen su producto de reventa en el servidor: hasta que tengan precio de venta no hay nada que crear
  const existe = useRef(new Set(filas.filter((f) => f.venta).map((f) => f.id)));

  const url = (n: { q?: string; cat?: string; orden?: string }) => {
    const p = new URLSearchParams();
    const v = { q, cat, orden: orden === "nombre" ? "" : orden, ...n };
    for (const [k, x] of Object.entries(v)) if (x) p.set(k, x);
    window.history.replaceState(null, "", "/articulos" + (p.size ? "?" + p : ""));
  };
  const cambiaQ = (v: string) => { setQ(v); setLimite(PAGINA); url({ q: v }); };
  const cambiaCat = (v: string) => { setCat(v); setLimite(PAGINA); url({ cat: v }); };
  const cambiaOrden = (v: Orden) => { setOrden(v); url({ orden: v === "nombre" ? "" : v }); };
  const cambiaKind = (k: Kind | "todos") => { setKind(k); setCat(""); setSolo(null); setLimite(PAGINA); url({ cat: "" }); };

  const margen = (a: ArtFila) => {
    const v = ventas[a.id] ?? null, c = costeVenta(a, v);
    return v ? margenVenta(c, v.pvp, iva) : null;
  };

  const porTipo = useMemo(() => {
    const m = new Map<Kind | "todos", number>([["todos", filas.length]]);
    for (const f of filas) m.set(f.kind, (m.get(f.kind) ?? 0) + 1);
    return m;
  }, [filas]);
  const enTipo = useMemo(() => filas.filter((f) => kind === "todos" || f.kind === kind), [filas, kind]);
  const cats = useMemo(() => {
    const m = new Map<string, { id: string; name: string; orden: number; n: number }>();
    for (const f of enTipo) { const x = m.get(f.cat) ?? { id: f.cat, name: f.catName, orden: f.catOrden, n: 0 }; x.n++; m.set(f.cat, x); }
    return [...m.values()].sort((a, b) => a.orden - b.orden);
  }, [enTipo]);

  const nq = norm(q.trim().slice(0, 60));
  const lista = useMemo(() => {
    let l = enTipo.filter((a) => (!cat || a.cat === cat) && (!nq || norm(a.name).includes(nq) || norm(a.catName).includes(nq) || (a.prov != null && norm(a.prov).includes(nq))));
    if (solo === "sinPrecio") l = l.filter((a) => a.precio == null);
    if (solo === "subidas") l = l.filter((a) => (a.variacion ?? 0) >= 0.005);
    if (solo === "sinPvp") l = l.filter((a) => a.reventa && !ventas[a.id]?.pvp);
    const mg = (a: ArtFila) => { const v = ventas[a.id] ?? null, c = costeVenta(a, v); return v ? margenVenta(c, v.pvp, iva)?.margen ?? null : null; };
    if (orden === "gasto") l = [...l].sort((a, b) => b.gasto - a.gasto);
    else if (orden === "subida") l = [...l].sort((a, b) => (b.variacion ?? -9) - (a.variacion ?? -9));
    else if (orden === "precio") l = [...l].sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0));
    else if (orden === "margen") l = [...l].sort((a, b) => (mg(a) ?? 1e9) - (mg(b) ?? 1e9));
    return l;
  }, [enTipo, cat, nq, solo, orden, ventas, iva]);

  const nSinPrecio = enTipo.filter((a) => a.precio == null).length;
  const nSubidas = enTipo.filter((a) => (a.variacion ?? 0) >= 0.005).length;
  const revs = enTipo.filter((a) => a.reventa);
  const nSinPvp = revs.filter((a) => !ventas[a.id]?.pvp).length;
  const mgs = revs.map((a) => margen(a)?.margen).filter((x): x is number => x != null);
  const mgMedio = mgs.length ? mgs.reduce((s, x) => s + x, 0) / mgs.length : null;

  const guardar = (a: ArtFila, v: Venta | null) => {
    setVentas((s) => ({ ...s, [a.id]: v }));
    clearTimeout(timers.current[a.id]);
    timers.current[a.id] = setTimeout(async () => {
      if (!v || (v.pvp == null && !existe.current.has(a.id))) return;
      const r = await fijarVentaArticulo(a.id, a.unit === "ud" ? { pvp: v.pvp, porUnidad: ventasPorUnidad(v) } : { pvp: v.pvp, cantidad: cantidadPorVenta(v), unidad: v.unidad });
      if (!r.ok) toastError(r.error ?? "No se ha podido guardar");
      else { existe.current.add(a.id); toast(v.pvp != null ? "Precio de venta guardado" : "Precio de venta quitado"); }
    }, 700);
  };

  const grupos = useMemo(() => {
    if (orden !== "nombre" || cat) return null;
    const m = new Map<string, { id: string; name: string; orden: number; items: ArtFila[] }>();
    for (const a of lista) { const g = m.get(a.cat) ?? { id: a.cat, name: a.catName, orden: a.catOrden, items: [] }; g.items.push(a); m.set(a.cat, g); }
    return [...m.values()].sort((a, b) => a.orden - b.orden);
  }, [lista, orden, cat]);

  const visibles = new Set(lista.slice(0, limite).map((a) => a.id));
  const fila = (a: ArtFila) => (visibles.has(a.id) ? <Fila key={a.id} a={a} v={ventas[a.id] ?? null} iva={iva} fcObjetivo={fcObjetivo} canPrecios={canPrecios}
    abierto={abierto === a.id} onAbrir={() => setAbierto(abierto === a.id ? null : a.id)} onCambia={(v) => guardar(a, v)} /> : null);
  const hayFiltro = !!(q || cat || solo);

  return (
    <div className="stack al">
      <div className="toolbar">
        <div className="searchbox">
          <Icon name="search" size={18} />
          <input className="inp" type="search" value={q} onChange={(e) => cambiaQ(e.target.value)} placeholder="Buscar por nombre, tipo o proveedor" aria-label="Buscar artículo" enterKeyHint="search" />
        </div>
        <select className="inp" value={orden} onChange={(e) => cambiaOrden(e.target.value as Orden)} aria-label="Ordenar" style={{ flex: "0 1 190px" }}>
          <option value="nombre">Por tipo y nombre</option><option value="gasto">Más compra (90 días)</option><option value="subida">Subidas de precio</option>
          <option value="precio">Más caros</option><option value="margen">Menos margen primero</option>
        </select>
      </div>

      <div className="seg al-kinds" role="tablist" aria-label="Qué artículos ver">
        {KINDS.filter((k) => k.k === "todos" || porTipo.get(k.k)).map((k) => (
          <button key={k.k} type="button" role="tab" aria-selected={kind === k.k} className={kind === k.k ? "is-on" : ""} onClick={() => cambiaKind(k.k)}>
            {k.t} <span className="cnt muted">{porTipo.get(k.k) ?? 0}</span>
          </button>
        ))}
      </div>

      {cats.length > 1 ? (
        <div className="chips" role="list" aria-label="Tipo de artículo">
          <button type="button" role="listitem" className={`chip ${!cat ? "is-on" : ""}`} onClick={() => cambiaCat("")}>Todos <span className="cnt">{enTipo.length}</span></button>
          {cats.map((c) => <button type="button" role="listitem" key={c.id} className={`chip ${cat === c.id ? "is-on" : ""}`} onClick={() => cambiaCat(cat === c.id ? "" : c.id)}>{c.name} <span className="cnt">{c.n}</span></button>)}
        </div>
      ) : null}

      <div className="al-tools">
        {nSinPrecio ? <button type="button" className={`chip chip-sm ${solo === "sinPrecio" ? "is-on" : ""}`} aria-pressed={solo === "sinPrecio"} onClick={() => setSolo(solo === "sinPrecio" ? null : "sinPrecio")}>Sin precio <span className="cnt">{nSinPrecio}</span></button> : null}
        {nSubidas ? <button type="button" className={`chip chip-sm ${solo === "subidas" ? "is-on" : ""}`} aria-pressed={solo === "subidas"} onClick={() => setSolo(solo === "subidas" ? null : "subidas")}>Con subida <span className="cnt">{nSubidas}</span></button> : null}
        {revs.length && canPrecios && nSinPvp ? <button type="button" className={`chip chip-sm ${solo === "sinPvp" ? "is-on" : ""}`} aria-pressed={solo === "sinPvp"} onClick={() => setSolo(solo === "sinPvp" ? null : "sinPvp")}>Sin precio de venta <span className="cnt">{nSinPvp}</span></button> : null}
        <span className="muted small al-count" aria-live="polite">{hayFiltro ? `${lista.length} de ${enTipo.length}` : plural(lista.length, "artículo", "artículos")}</span>
      </div>

      {revs.length ? (
        <div className="al-resumen" role="note">
          <Icon name="euro" size={18} />
          <span>
            <b>Productos que vendes tal cual: {mgMedio != null ? `margen medio ${pctN(mgMedio, 0)}` : "aún sin precio de venta"}.</b>{" "}
            {nSinPvp ? <>{plural(nSinPvp, "falta por ponerle", "faltan por ponerles")} precio de venta.</> : <>Todos tienen precio de venta.</>}{" "}
            <span className="muted">Toca «Margen» en cada vino, cerveza o refresco para fijar el PVP.</span>
          </span>
        </div>
      ) : null}

      <section className="card al-card">
        {!lista.length ? (
          <div className="empty"><span className="li-ic"><Icon name="box" /></span><b>{filas.length ? "Nada con ese filtro" : "Aún no tienes artículos"}</b>
            <p>{filas.length ? "Prueba con otra búsqueda o quita los filtros." : "Se crean solos al guardar tu primer albarán. También puedes añadirlos a mano."}</p>
            <div className="empty-actions">
              {filas.length ? <button type="button" className="btn btn-2" onClick={() => { setQ(""); setCat(""); setSolo(null); setKind("todos"); window.history.replaceState(null, "", "/articulos"); }}>Quitar filtros</button>
                : <><Link className="btn" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link><Link className="btn btn-2" href="/articulos/nuevo">Nuevo artículo</Link></>}
            </div></div>
        ) : grupos ? grupos.map((g) => {
          const cerrado = cerrados.has(g.id) && !nq;
          const n = g.items.filter((a) => visibles.has(a.id)).length;
          if (!n && !cerrado) return null;
          return (
            <div key={g.id} className="al-grupo">
              <button type="button" className="al-gh" aria-expanded={!cerrado} onClick={() => setCerrados((s) => { const x = new Set(s); if (x.has(g.id)) x.delete(g.id); else x.add(g.id); return x; })}>
                <Icon name="chevD" size={18} className={cerrado ? "ic al-rot" : "ic"} /> <b>{g.name}</b> <span className="muted small">{g.items.length}</span>
              </button>
              {cerrado ? null : <div className="list">{g.items.map(fila)}</div>}
            </div>
          );
        }) : <div className="list">{lista.map(fila)}</div>}
        {lista.length > limite ? <button type="button" className="btn btn-2 al-mas" onClick={() => setLimite((l) => l + PAGINA)}>Mostrar {Math.min(PAGINA, lista.length - limite)} más <span className="muted">({lista.length - limite} sin ver)</span></button> : null}
      </section>
    </div>
  );
}

function Fila({ a, v, iva, fcObjetivo, canPrecios, abierto, onAbrir, onCambia }: {
  a: ArtFila; v: Venta | null; iva: number; fcObjetivo: number; canPrecios: boolean; abierto: boolean; onAbrir: () => void; onCambia: (v: Venta | null) => void;
}) {
  const coste = costeVenta(a, v);
  const m = v ? margenVenta(coste, v.pvp, iva) : null;
  const tono = m ? ({ ok: "tag-ok", warn: "tag-warn", crit: "tag-bad", none: "" } as const)[estadoFC(1 - m.margen / 100, fcObjetivo).estado] : "";
  return (
    <div className={`al-fila ${abierto ? "is-open" : ""}`}>
      <Link className="li" href={`/articulos/${a.id}`}>
        <span className="li-ic"><Icon name="box" /></span>
        <span className="li-main"><b>{a.name}</b><small>{a.prov ?? "Sin proveedor"}{a.stock != null ? ` · stock ${qty(a.stock)} ${a.unit}` : ""}</small></span>
        <span className="li-end">
          <b>{a.precio != null ? `${eur(a.precio)}/${a.unit}` : "Sin precio"}</b>
          {a.variacion != null && Math.abs(a.variacion) >= 0.005 ? <span className={`tag ${a.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{a.variacion > 0 ? "+" : "−"}{pct(Math.abs(a.variacion))}</span> : a.src ? <small>{a.src}</small> : null}
        </span>
      </Link>
      {a.reventa ? (
        <button type="button" className={`al-venta ${m ? "" : "al-venta-vacio"}`} aria-expanded={abierto} onClick={onAbrir}
          aria-label={m ? `Margen de ${a.name}: ${pctN(m.margen, 0)}. Editar precio de venta` : `Poner precio de venta a ${a.name}`}>
          {m && v?.pvp ? <><span className="al-venta-k">Vendes a</span> <b>{eur(v.pvp)}</b> <span className={`tag ${tono}`}>Margen {pctN(m.margen, 0)}</span> <span className="muted small">{eur(m.beneficio)} por venta</span></>
            : <><Icon name="euro" size={16} /> <span>{v?.pvp ? "Sin coste para calcular el margen" : "Poner precio de venta y ver margen"}</span></>}
          <Icon name="chevD" size={16} className={abierto ? "ic al-rot al-chev" : "ic al-chev"} />
        </button>
      ) : null}
      {a.reventa && abierto ? <Editor a={a} v={v} iva={iva} coste={coste} canPrecios={canPrecios} onCambia={onCambia} /> : null}
    </div>
  );
}

function Editor({ a, v, iva, coste, canPrecios, onCambia }: { a: ArtFila; v: Venta | null; iva: number; coste: number | null; canPrecios: boolean; onCambia: (v: Venta | null) => void }) {
  const s = servido(a, v);
  const unidades = lineUnitsFor(a.unit);
  const enUd = a.unit === "ud";
  const pistas = enUd ? pistasPorEnvase(a.name) : [];
  /** Al cambiar lo que se sirve, el margen que tenías se mantiene: el PVP se recalcula con el coste nuevo. */
  const conServido = (n: Servido) => {
    const nuevo: Venta = { ...n, pvp: v?.pvp ?? null };
    const c = costeDeVenta(a.costeNeto, n.cantidad, n.unidad, a.unit, n.raciones);
    const mRef = v?.pvp && coste ? margenVenta(coste, v.pvp, iva)?.margen ?? null : null;
    const r = c && mRef != null ? editarReventa({ coste: c, pvp: null, iva, conLineas: true, mRef }, { margen: mRef }) : null;
    onCambia(r ? { ...nuevo, pvp: r.pvp } : nuevo);
  };
  const cambiaVentas = (n: number | null) => { if (n != null && n >= 0.01 && n <= 10000) conServido({ cantidad: 1, unidad: "ud", raciones: n }); };
  const cambiaServido = (cantidad: number | null, unidad: LineUnit) => { if (cantidad != null && cantidad > 0) conServido({ cantidad, unidad, raciones: 1 }); };
  const edita = (patch: { pvp?: number | null; margen?: number }) => {
    if (!s) return;
    if (coste == null) { if (patch.pvp !== undefined) onCambia({ ...s, pvp: patch.pvp }); return; }
    const r = editarReventa({ coste, pvp: v?.pvp ?? null, iva, conLineas: true }, patch);
    if (r) onCambia({ ...s, pvp: r.pvp });
  };
  const m = v?.pvp && coste ? margenVenta(coste, v.pvp, iva) : null;
  const id = `al-${a.id}`;
  return (
    <div className="al-ed">
      <div className="al-ed-fila">
        {enUd ? (
          <div className="fld">
            <label htmlFor={`${id}-s`}>Ventas que salen de cada unidad comprada</label>
            <NumInput id={`${id}-s`} className="inp inp-xs inp-num" decimals={2} value={s ? ventasPorUnidad(s) : 1} disabled={!canPrecios} onValue={cambiaVentas} />
            {canPrecios && pistas.length ? <div className="al-presets">{pistas.map((p) => <button key={p.t} type="button" className="chip chip-sm" onClick={() => cambiaVentas(p.n)}>{p.t}</button>)}</div> : null}
          </div>
        ) : (
          <div className="fld">
            <label htmlFor={`${id}-s`}>Se sirve en cada venta</label>
            <div className="al-serv">
              <NumInput id={`${id}-s`} className="inp inp-xs inp-num" decimals={3} value={s ? cantidadPorVenta(s) : null} disabled={!canPrecios} onValue={(n) => cambiaServido(n, s?.unidad ?? unidades[0])} />
              <select className="inp inp-xs" value={s?.unidad ?? unidades[0]} disabled={!canPrecios} aria-label="Unidad" onChange={(e) => cambiaServido(s ? cantidadPorVenta(s) : 1, e.target.value as LineUnit)}>
                {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {a.unit === "L" && canPrecios ? <div className="al-presets">{SERVIDOS_ML.map((p) => <button key={p.ml} type="button" className="chip chip-sm" onClick={() => cambiaServido(p.ml, "ml")}>{p.t}</button>)}</div> : null}
          </div>
        )}
        <div className="fld">
          <label htmlFor={`${id}-p`}>Precio de venta (con IVA)</label>
          <NumInput id={`${id}-p`} className="inp inp-xs inp-num" decimals={2} value={v?.pvp ?? null} disabled={!canPrecios || !s} onValue={(n) => edita({ pvp: n })} placeholder="0,00" />
        </div>
        <div className="fld">
          <label htmlFor={`${id}-m`}>Margen %</label>
          <NumInput id={`${id}-m`} className="inp inp-xs inp-num" decimals={0} value={m ? m.margen : null} disabled={!canPrecios || coste == null} onValue={(n) => n != null && edita({ margen: Math.min(99, Math.max(0, n)) })} placeholder="—" />
        </div>
      </div>
      <p className="muted small al-ed-nota">
        {coste != null ? <>Te cuesta <b>{eur(coste)}</b> cada venta (compra {a.precio != null ? `${eur(a.precio)}/${a.unit}` : "—"}{enUd && s && ventasPorUnidad(s) !== 1 ? `, entre ${qty(ventasPorUnidad(s), 2)} ventas` : ""}{a.costeNeto != null && a.precio != null && a.costeNeto > a.precio + 1e-9 ? ", con merma" : ""}).{" "}</>
          : a.precio == null ? <>Este artículo aún no tiene precio de compra: súbelo con un albarán o ponlo en su ficha.</> : !s ? <>Indica cuánto se sirve en cada venta (por ejemplo 75 cl una botella) para calcular el coste.</> : null}
        {enUd && s && ventasPorUnidad(s) === 1 && pistas.length ? <b>¿Vendes la unidad entera? Si es una caja o un barril, indica cuántas ventas salen de ella.{" "}</b> : null}
        {m ? <>{m.beneficio >= 0 ? "Ganas" : "Pierdes"} <b>{eur(Math.abs(m.beneficio))}</b> por venta, sin IVA.{" "}</> : null}
        {canPrecios ? <>Se guarda solo y también sale en <Link className="link" href="/ventas">Ventas</Link> y en la carta.</> : <>Tu rol no cambia precios de venta.</>}
      </p>
    </div>
  );
}
