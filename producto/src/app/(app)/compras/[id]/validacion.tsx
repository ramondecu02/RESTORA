"use client";
// Revisión del albarán leído: solo te paramos donde hace falta (artículo, cantidad, unidades, IVA).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { ArticlePicker, type Picked } from "@/components/pickers";
import { TaskScreen } from "@/components/shell/task-screen";
import { Tour } from "@/components/shell/tour";
import { NumInput } from "@/components/ui/num-input";
import { Confirm, Sheet } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { draftCheck, lineImporte, pendientes, prettyProduct } from "@/lib/draft";
import { eur, fecha as fFecha, plural, qty } from "@/lib/format";
import { bestMatches, norm } from "@/lib/fuzzy";
import type { Draft, DraftLine } from "@/lib/ocr-types";
import { inferPackFactor, type BaseUnit } from "@/lib/units";
import { confirmar, descartar, guardarBorrador } from "../actions";

type Art = { id: string; name: string; unit: BaseUnit; categoryId: string; iva: number; rend: number; aliases: string[] };
type CatItem = { id: string; name: string; unit: BaseUnit; categoryId: string; rend: number; aliases: string[] };
type Cat = { id: string; name: string; singular: string; iva: number };
type Prov = { id: string; name: string };
type FileRef = { url: string; mime: string; name: string };
type Base = { unit: BaseUnit; iva: number; name: string; categoryId: string };

const RATES = [4, 10, 21];
const sameUnit = (u: string, base: BaseUnit) => {
  const x = norm(u);
  if (!x || x === norm(base)) return true;
  if (base === "kg") return /^(kg|kgs|kilo|kilos|k)$/.test(x);
  if (base === "L") return /^(l|lt|lts|litro|litros)$/.test(x);
  return /^(ud|uds|u|un|unid|unidad|unidades|und|pieza|piezas|pz)$/.test(x);
};

export function Validacion({ docId, initial, files, arts, catalog, cats, provs, meta, tourSeen }: {
  docId: string; initial: Draft; files: FileRef[]; arts: Art[]; catalog: CatItem[]; cats: Cat[]; provs: Prov[];
  meta: { ms: number | null; model: string | null }; tourSeen: boolean;
}) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [filter, setFilter] = useState<"decidir" | "todas">("decidir");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ line: string | null } | null>(null);
  const [showDoc, setShowDoc] = useState(false);
  const [ask, setAsk] = useState<null | { kind: "total" | "duplicado" | "descartar"; text: string }>(null);
  const [saving, startSave] = useTransition();
  const [discarding, startDiscard] = useTransition();
  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const catIva = useMemo(() => new Map(cats.map((c) => [c.id, c.iva])), [cats]);
  const manual = !!d.manual;

  // Guardado automático del borrador
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => { guardarBorrador(docId, d).then((r) => { if (!r.ok) toastError(r.error); }); }, 700);
    return () => clearTimeout(t);
  }, [d, docId]);

  const baseOf = (l: DraftLine): Base | null => {
    if (!l.match) return null;
    if (l.match.tipo === "nuevo" && l.nuevo) return { unit: l.nuevo.unit, iva: catIva.get(l.nuevo.categoryId) ?? 10, name: l.nuevo.name, categoryId: l.nuevo.categoryId };
    if (l.match.tipo === "tuyo") { const a = arts.find((x) => x.id === l.match!.id); return a ? { unit: a.unit, iva: a.iva, name: a.name, categoryId: a.categoryId } : null; }
    const c = catalog.find((x) => x.id === l.match!.id);
    return c ? { unit: c.unit, iva: catIva.get(c.categoryId) ?? 10, name: c.name, categoryId: c.categoryId } : null;
  };
  /** Tipo propuesto para un artículo nuevo: el del candidato más parecido. */
  const suggestCat = (l: DraftLine) => {
    for (const c of l.candidatos) {
      const cat = c.tipo === "tuyo" ? arts.find((a) => a.id === c.id)?.categoryId : catalog.find((x) => x.id === c.id)?.categoryId;
      if (cat) return cat;
    }
    const near = bestMatches(l.texto, catalog, (x) => [x.name, ...x.aliases], 0.3, 1)[0];
    return near?.item.categoryId ?? "otros";
  };
  const setLine = (id: string, f: (l: DraftLine) => DraftLine) => setD((x) => ({ ...x, lineas: x.lineas.map((l) => (l.id === id ? f(l) : l)) }));

  /** Tras elegir artículo: recalcula conversión de unidades e IVA esperado, como hace la lectura. */
  const rebase = (l: DraftLine, base: Base): DraftLine => {
    let factor = l.factor, fuente = l.factorFuente;
    if (fuente !== "usuario") {
      const inf = inferPackFactor(l.texto + " " + l.unidadCompra, base.unit);
      if (inf) { factor = inf.factor; fuente = "texto"; }
      else if (sameUnit(l.unidadCompra, base.unit)) { factor = 1; fuente = "unidad"; }
      else { factor = null; fuente = null; }
    }
    let iva = l.iva, ivaDec = l.decisiones.iva, ivaOk = l.resuelto.iva;
    if (!(l.resuelto.iva && l.decisiones.iva)) {
      if (l.ivaLeido == null || l.ivaLeido === base.iva) { iva = l.ivaLeido ?? base.iva; ivaDec = false; ivaOk = true; }
      else { iva = null; ivaDec = true; ivaOk = false; }
    }
    return {
      ...l, factor, factorFuente: fuente, ivaEsperado: base.iva, iva,
      unidadCompra: l.unidadCompra || base.unit,
      decisiones: { ...l.decisiones, unidad: factor == null || l.decisiones.unidad && fuente === "usuario", iva: ivaDec },
      resuelto: { ...l.resuelto, articulo: true, unidad: factor != null, iva: ivaOk },
    };
  };
  const pick = (lineId: string, p: { tipo: "tuyo" | "catalogo"; id: string } | { tipo: "nuevo"; nuevo: NonNullable<DraftLine["nuevo"]> }) => {
    setLine(lineId, (l) => {
      const next: DraftLine = p.tipo === "nuevo"
        ? { ...l, match: { tipo: "nuevo", id: null, score: 1, porUsuario: true }, nuevo: p.nuevo, ignorar: false, decisiones: { ...l.decisiones, articulo: true } }
        : { ...l, match: { tipo: p.tipo, id: p.id, score: 1, porUsuario: true }, nuevo: null, ignorar: false, decisiones: { ...l.decisiones, articulo: true } };
      const b = baseOf(next);
      return b ? rebase(next, b) : next;
    });
  };
  const undoMatch = (id: string) => setLine(id, (l) => ({ ...l, match: null, nuevo: null, ignorar: false, decisiones: { ...l.decisiones, articulo: true }, resuelto: { ...l.resuelto, articulo: false } }));

  const chk = draftCheck(d);
  const pendLines = d.lineas.filter((l) => pendientes(l).length > 0);
  const nPend = pendLines.reduce((n, l) => n + pendientes(l).length, 0) + (!d.proveedor.id && !(d.proveedor.nombre ?? "").trim() ? 1 : 0);
  const decLines = d.lineas.filter((l) => !l.ignorar && (l.decisiones.articulo || l.decisiones.cantidad || l.decisiones.iva || l.decisiones.unidad));
  const showFilter = decLines.length > 0 && !manual;
  const f = showFilter ? filter : "todas";
  const shown = f === "decidir" ? decLines : d.lineas;

  const save = (opts: { forzarTotal?: boolean; forzarDuplicado?: boolean } = {}) => startSave(async () => {
    await guardarBorrador(docId, d);
    const r = await confirmar(docId, d, opts);
    if (r.ok) { router.push(`/compras/${r.id}?guardado=1`); router.refresh(); return; }
    if (r.kind === "total") setAsk({ kind: "total", text: `Las líneas suman ${eur(chk.total)} y el documento dice ${eur(d.total)} (diferencia de ${eur(Math.abs(r.diff ?? 0))}). Revisa cantidades y precios, o guárdalo igualmente si sabes por qué no cuadra.` });
    else if (r.kind === "duplicado") setAsk({ kind: "duplicado", text: `${r.error} Si lo guardas otra vez, esa compra contará dos veces.` });
    else toastError(r.error);
  });

  const docPane = files.length ? (
    <div className="docimg">
      {files.map((fl, i) => fl.mime === "application/pdf"
        ? <iframe key={i} src={fl.url} title={`Documento original, página ${i + 1}`} />
        : <a key={i} href={fl.url} target="_blank" rel="noopener"><img src={fl.url} alt={`Documento original, página ${i + 1}`} /></a>)}
    </div>
  ) : null;

  const numWarn = !manual && d.confNumero !== "alta" && !d.numeroRevisado;
  const totalTag = chk.incompleto || nPend ? <span className="tag">Se comprueba al decidir</span>
    : d.total == null ? <span className="tag">Calculado: {eur(chk.total)}</span>
    : chk.cuadra ? <span className="tag tag-ok"><Icon name="check" size={14} sw={3} /> Cuadra con las líneas</span>
    : <span className="tag tag-bad">No cuadra: {chk.diff! > 0 ? "+" : "−"}{eur(Math.abs(chk.diff!))}</span>;

  const provSel = (
    <select className="inp inp-sm" aria-label="Proveedor" value={d.proveedor.id ?? "__nuevo"} onChange={(e) => {
      const v = e.target.value;
      setD((x) => ({ ...x, proveedor: v === "__nuevo" ? { ...x.proveedor, id: null, nuevo: true } : { ...x.proveedor, id: v, nuevo: false, nombre: provs.find((p) => p.id === v)?.name ?? "" } }));
    }}>
      <option value="__nuevo">Proveedor nuevo…</option>
      {provs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );

  const head = (
    <section className="card" aria-labelledby="h-cab">
      <div className="card-h"><h2 className="h3" id="h-cab">Cabecera</h2>{meta.ms ? <span className="muted small">Leído en {Math.max(1, Math.round(meta.ms / 1000))} s</span> : manual ? <span className="muted small">Compra apuntada a mano</span> : null}</div>
      <dl className="kv">
        <div><dt>Proveedor</dt><dd style={{ flexDirection: "column", alignItems: "stretch" }}>
          {d.proveedor.id && !manual ? <div className="row-wrap"><b>{provs.find((p) => p.id === d.proveedor.id)?.name ?? d.proveedor.nombre}</b><span className="tag tag-ok"><Icon name="check" size={14} sw={3} /> Tu proveedor</span></div> : null}
          {!d.proveedor.id ? <div className="stack-xs">
            <input className="inp inp-sm" aria-label="Nombre del proveedor nuevo" value={d.proveedor.nombre ?? ""} placeholder="Nombre del proveedor" onChange={(e) => setD((x) => ({ ...x, proveedor: { ...x.proveedor, nombre: e.target.value } }))} />
            <span className="hint">{manual ? "Escríbelo o elige uno de tu lista." : "Nuevo · se añadirá a tus proveedores al guardar."}{d.proveedor.cif ? ` CIF ${d.proveedor.cif}.` : ""}</span>
          </div> : null}
          {provs.length ? provSel : null}
        </dd></div>
        <div><dt><label htmlFor="v-fecha">Fecha</label></dt><dd><input type="date" id="v-fecha" className="inp inp-sm" style={{ maxWidth: 200 }} value={d.fecha ?? ""} onChange={(e) => setD((x) => ({ ...x, fecha: e.target.value || null }))} />{!manual && d.confFecha !== "alta" ? <span className="conf conf-media">Revísala</span> : null}</dd></div>
        <div className={numWarn ? "kv-warn" : ""}><dt><label htmlFor="v-num">Nº {d.tipoDocumento === "factura" ? "factura" : "albarán"}</label></dt><dd>
          <input className={`inp inp-sm ${numWarn ? "inp-warn" : ""}`} id="v-num" style={{ maxWidth: 200 }} value={d.numero ?? ""} onChange={(e) => setD((x) => ({ ...x, numero: e.target.value || null, numeroRevisado: true }))} />
          {numWarn ? <span className="conf conf-media">Revísalo</span> : null}
        </dd></div>
        <div><dt>Total</dt><dd>
          {manual ? <NumInput className="inp inp-sm inp-num" style={{ maxWidth: 140 }} decimals={2} value={d.total} onValue={(n) => setD((x) => ({ ...x, total: n }))} aria-label="Total del documento (opcional)" placeholder="Opcional" /> : <b className="num">{eur(d.total)}</b>}
          {totalTag}
        </dd></div>
      </dl>
      {numWarn ? <div className="stack-xs"><p className="hint">El número se lee regular: ¿{d.numero} o {d.numeroAlt}? Compruébalo en el original. No impide guardar.</p>
        <div className="row-wrap">{[d.numero, d.numeroAlt].filter(Boolean).map((n) => <button key={n} type="button" className="btn btn-2 btn-xs" onClick={() => setD((x) => ({ ...x, numero: n, numeroRevisado: true }))}>Es {n}</button>)}</div></div> : null}
      {d.desglose.length ? (
        <details className="desg">
          <summary><Icon name="chevD" size={18} /> Desglose de IVA del documento</summary>
          <div className="desg-t">
            <span className="dh">Tipo</span><span className="dh r">Base</span><span className="dh r">Cuota</span><span className="dh r">Líneas</span>
            {chk.desglose.map((r) => [
              <span key={r.tipo + "t"}>{r.tipo} %</span>, <span key={r.tipo + "b"} className="r">{eur(r.base)}</span>, <span key={r.tipo + "c"} className="r">{eur(r.cuota)}</span>,
              <span key={r.tipo + "o"} className="r">{chk.incompleto || nPend ? "Pendiente" : r.ok ? "Cuadra" : r.ok === false ? `No (${eur(r.calc)})` : "—"}</span>,
            ])}
          </div>
          <p className="hint">Leído del pie del documento. Cada línea se contrasta con este desglose y con el tipo de artículo.</p>
        </details>
      ) : null}
    </section>
  );

  const warnings = <>
    {d.duplicado ? <div className="note note-warn"><Icon name="alert" /><p>Ya guardaste un documento con el número <b>{d.numero}</b> de este proveedor{d.duplicado.fecha ? ` (${fFecha(d.duplicado.fecha)})` : ""}. Si es el mismo, descártalo: si no, la compra contará dos veces. <a className="link" href={`/compras/${d.duplicado.id}`}>Ver el guardado</a></p></div> : null}
    {d.tipoDocumento === "factura" ? <div className="note"><Icon name="info" /><p>Es una <b>factura</b>. Si ya subiste los albaranes que incluye, no la guardes: duplicarías las compras.</p></div> : null}
    {d.observaciones ? <div className="note"><Icon name="info" /><p>{d.observaciones}</p></div> : null}
  </>;

  const addLine = () => setPicker({ line: null });
  const onPicked = (p: Picked) => {
    if (p.tipo === "receta") return;
    if (picker?.line) { pick(picker.line, { tipo: p.tipo, id: p.id }); setPicker(null); return; }
    const id = "m" + Date.now().toString(36);
    const a = p.tipo === "tuyo" ? arts.find((x) => x.id === p.id) : null;
    const c = p.tipo === "catalogo" ? catalog.find((x) => x.id === p.id) : null;
    const iva = a?.iva ?? (c ? catIva.get(c.categoryId) ?? 10 : 10);
    const line: DraftLine = {
      id, texto: p.name, cantidad: 1, cantidadTexto: "1", unidadCompra: p.unit, factor: 1, factorFuente: "unidad", precio: null, descuento: 0, bonificadas: 0, importe: null,
      ivaLeido: iva, iva, ivaEsperado: iva, conf: { linea: "alta", cantidad: "alta", precio: "alta" }, duda: null,
      match: { tipo: p.tipo, id: p.id, score: 1, porUsuario: true }, nuevo: null, candidatos: [],
      decisiones: { articulo: false, iva: false, cantidad: false, unidad: false }, resuelto: { articulo: true, iva: true, cantidad: true, unidad: true }, manual: true,
    };
    setD((x) => ({ ...x, lineas: [...x.lineas, line] }));
    setEditing(id);
    setPicker(null);
  };
  const onCreateFromPicker = (name: string) => {
    const lineId = picker?.line;
    setPicker(null);
    if (lineId) { setCreating(lineId); setLine(lineId, (l) => ({ ...l, nuevo: { name, categoryId: l.nuevo?.categoryId ?? "otros", unit: l.nuevo?.unit ?? "kg", rend: 100 } })); }
  };

  const lines = (
    <section className="stack-sm" aria-labelledby="h-lin">
      <div className="row-sb"><h2 className="h3" id="h-lin">Líneas</h2><span className="muted small">{plural(d.lineas.length, "línea", "líneas")}</span></div>
      {!manual ? <div className="legend" data-tour="legend"><span className="conf conf-alta">Leído seguro</span><span className="conf conf-media">Revísalo</span><span className="conf conf-baja">Decides tú</span></div> : null}
      {showFilter ? (
        <div className="seg" role="tablist" aria-label="Filtrar líneas">
          <button type="button" role="tab" aria-selected={f === "decidir"} className={f === "decidir" ? "is-on" : ""} onClick={() => setFilter("decidir")}>Para decidir ({pendLines.length})</button>
          <button type="button" role="tab" aria-selected={f === "todas"} className={f === "todas" ? "is-on" : ""} onClick={() => setFilter("todas")}>Todas ({d.lineas.length})</button>
        </div>
      ) : null}
      {!pendLines.length && d.lineas.length ? <div className="note note-ok"><Icon name="check" /><p><b>Todo revisado.</b> {plural(d.lineas.length, "línea lista", "líneas listas")} para guardar.</p></div> : null}
      {!d.lineas.length ? <div className="card"><div className="empty"><span className="li-ic"><Icon name="receipt" /></span><b>Sin líneas todavía</b><p>Añade cada producto que compraste con su cantidad y precio.</p></div></div> : null}
      <div className="lns">
        {shown.map((l) => (
          <LineCard key={l.id} l={l} base={baseOf(l)} catName={catName} cats={cats} manual={manual} defaultCat={suggestCat(l)}
            editing={editing === l.id} setEditing={(on) => setEditing(on ? l.id : null)}
            creating={creating === l.id} setCreating={(on) => setCreating(on ? l.id : null)}
            onPickCand={(c) => pick(l.id, { tipo: c.tipo, id: c.id })}
            onNuevo={(n) => { pick(l.id, { tipo: "nuevo", nuevo: n }); setCreating(null); }}
            onFind={() => setPicker({ line: l.id })}
            onUndo={() => undoMatch(l.id)}
            onChange={(fn) => setLine(l.id, fn)}
            onRemove={() => setD((x) => ({ ...x, lineas: x.lineas.filter((y) => y.id !== l.id) }))} />
        ))}
      </div>
      {f === "decidir" && d.lineas.length > decLines.length ? <button type="button" className="linkbtn" onClick={() => setFilter("todas")}>Ver las {d.lineas.length - decLines.length} líneas leídas sin dudas <Icon name="chevD" size={18} /></button> : null}
      <button type="button" className="btn btn-2 btn-sm" onClick={addLine}><Icon name="plus" size={18} /> Añadir una línea</button>
    </section>
  );

  const foot = (
    <div className="foot-in">
      <div className={`foot-note ${nPend ? "warn" : "ok"}`}>
        {nPend ? <><Icon name="alert" /><span>{nPend === 1 ? "Queda 1 decisión" : `Quedan ${nPend} decisiones`} antes de guardar.</span></>
          : <><Icon name="check" /><span>Todo revisado · {eur(d.total ?? chk.total)}</span></>}
      </div>
      <div className="foot-btns">
        <button type="button" className="btn btn-3" onClick={() => setAsk({ kind: "descartar", text: "Se borrará este documento y no se guardará ninguna compra." })}>Descartar</button>
        <button type="button" className="btn" disabled={!!nPend || saving || !d.lineas.length} onClick={() => save()}>{saving ? <span className="spin" /> : null}Confirmar y guardar</button>
      </div>
    </div>
  );

  return (
    <TaskScreen title={manual ? "Apunta la compra" : "Revisa el albarán"} sub={d.proveedor.nombre || d.proveedor.nombreLeido || undefined} back="/compras" foot={foot}
      actions={files.length ? <button type="button" className="btn btn-2 btn-xs only-narrow" onClick={() => setShowDoc(true)}>Ver original</button> : undefined}>
      <div className={files.length ? "val-grid" : "stack"}>
        {files.length ? <aside className="docpane" aria-label="Documento original"><div className="docpane-h"><b>Original</b><span className="muted">{files[0].name}</span></div>{docPane}</aside> : null}
        <div className="val-col">{warnings}{head}{lines}</div>
      </div>
      <Sheet open={showDoc} onClose={() => setShowDoc(false)} title="Documento original" wide>{docPane}</Sheet>
      <ArticlePicker open={!!picker} onClose={() => setPicker(null)} onPick={onPicked} onCreate={picker?.line ? onCreateFromPicker : undefined}
        arts={arts} catalog={catalog} cats={catName} title={picker?.line ? "¿Qué artículo es?" : "Añadir línea"} />
      <Confirm open={ask?.kind === "total" || ask?.kind === "duplicado"} onClose={() => setAsk(null)} title={ask?.kind === "total" ? "El total no cuadra" : "Documento repetido"}
        text={ask?.text} confirm="Guardar igualmente" busy={saving}
        onConfirm={() => { const k = ask?.kind; setAsk(null); save(k === "total" ? { forzarTotal: true, forzarDuplicado: true } : { forzarDuplicado: true }); }} />
      <Confirm open={ask?.kind === "descartar"} onClose={() => setAsk(null)} title="¿Descartar el documento?" text={ask?.text} confirm="Descartar" danger busy={discarding}
        onConfirm={() => startDiscard(async () => { const r = await descartar(docId); if (r && !r.ok) toastError(r.error); })} />
      {!manual ? <Tour k="validacion" show={!tourSeen} steps={[{ sel: '[data-tour="legend"]', h: "Solo te paramos donde hace falta", p: "Verde: leído con seguridad. Ámbar: échale un ojo. Rojo: decides tú antes de guardar." }]} /> : null}
    </TaskScreen>
  );
}

function LineCard({ l, base, catName, cats, manual, defaultCat, editing, setEditing, creating, setCreating, onPickCand, onNuevo, onFind, onUndo, onChange, onRemove }: {
  l: DraftLine; base: Base | null; catName: Map<string, string>; cats: Cat[]; manual: boolean; defaultCat: string;
  editing: boolean; setEditing: (on: boolean) => void; creating: boolean; setCreating: (on: boolean) => void;
  onPickCand: (c: { tipo: "tuyo" | "catalogo"; id: string }) => void; onNuevo: (n: NonNullable<DraftLine["nuevo"]>) => void;
  onFind: () => void; onUndo: () => void; onChange: (f: (l: DraftLine) => DraftLine) => void; onRemove: () => void;
}) {
  const pend = pendientes(l);
  const imp = lineImporte(l);
  const unit = base?.unit;
  const name = l.ignorar ? prettyProduct(l.texto) : base?.name ?? (l.nuevo?.name || prettyProduct(l.texto));
  const qTxt = !l.resuelto.cantidad && l.decisiones.cantidad ? `${l.cantidadTexto || "?"} ${l.unidadCompra}` : `${qty(l.cantidad)} ${l.unidadCompra}`;
  const ivaTxt = l.ignorar ? "" : (l.iva ?? null) == null ? " · IVA por decidir" : ` · IVA ${l.iva} %`;
  const conv = unit && l.factor && l.factor !== 1 && l.precio != null ? <small> = {qty((l.cantidad ?? 0) * l.factor)} {unit} a {eur(l.precio / l.factor)}/{unit}</small> : null;
  const confCls = pend.length ? "conf-baja" : l.conf.linea === "media" || l.conf.precio === "media" ? "conf-media" : "conf-alta";
  const [qTmp, setQTmp] = useState<number | null>(l.cantidad ?? (l.importe != null && l.precio ? Math.round((l.importe / l.precio) * 1000) / 1000 : null));
  const [fTmp, setFTmp] = useState<number | null>(l.factor);
  const [nv, setNv] = useState<NonNullable<DraftLine["nuevo"]>>(l.nuevo ?? { name: prettyProduct(l.texto), categoryId: defaultCat, unit: guessUnit(l.texto, l.unidadCompra), rend: 100 });
  useEffect(() => { if (creating) setNv(l.nuevo ?? { name: prettyProduct(l.texto), categoryId: defaultCat, unit: guessUnit(l.texto, l.unidadCompra), rend: 100 }); }, [creating, l.nuevo, l.texto, l.unidadCompra, defaultCat]);

  const tags: React.ReactNode[] = [];
  if (!l.ignorar && l.match && !l.match.porUsuario && l.resuelto.articulo) tags.push(<span key="m" className="tag tag-ok"><Icon name="check" size={14} sw={3} /> {l.match.tipo === "tuyo" ? `Tu artículo · ${Math.round(l.match.score * 100)} %` : "Nuevo en tu lista · catálogo"}</span>);
  if (base && !pend.length && !l.ignorar) tags.push(<span key="c" className="tag">{catName.get(base.categoryId)}</span>);
  if (!l.ignorar && !l.decisiones.iva && l.iva != null && l.ivaEsperado != null && l.iva === l.ivaEsperado && !manual) tags.push(<span key="i" className="tag tag-ok">IVA {l.iva} % · coincide</span>);
  if (l.ignorar) tags.push(<span key="x" className="tag">No es un producto · solo cuenta para el total</span>);

  const Done = ({ txt, onUndo: u }: { txt: string; onUndo: () => void }) => (
    <div className="done-row"><span className="tag tag-ok"><Icon name="check" size={14} sw={3} /> {txt}</span><button type="button" className="linkbtn" onClick={u}>Cambiar</button></div>
  );
  const expected = l.importe != null && l.precio ? l.importe / (l.precio * (1 - (l.descuento || 0) / 100)) : null;
  const rates = [...new Set([l.ivaEsperado, l.ivaLeido, ...RATES].filter((x): x is number => x != null))];

  return (
    <article className={`ln ${pend.length ? "is-dec" : ""}`} id={`ln-${l.id}`}>
      <div className="ln-h">
        <span className={`conf ${confCls}`}><span className="sr">{pend.length ? "Decides tú" : confCls === "conf-media" ? "Revísalo" : "Leído con seguridad"}</span></span>
        <div className="ln-n"><b>{name}</b>{!l.manual || l.texto !== name ? <small>{l.texto}</small> : null}</div>
        <b className="ln-amt">{eur(imp)}</b>
        <button type="button" className="iconbtn iconbtn-sm" aria-label={`Editar ${name}`} aria-expanded={editing} onClick={() => setEditing(!editing)}><Icon name="edit" size={18} /></button>
      </div>
      <p className="ln-m">{qTxt} × {eur(l.precio)}{l.descuento ? ` − ${l.descuento} %` : ""}{l.bonificadas ? ` + ${qty(l.bonificadas)} gratis` : ""}{ivaTxt}{conv}</p>
      {l.duda && pend.length ? <p className="hint">{l.duda}</p> : null}
      {tags.length ? <div className="tags">{tags}</div> : null}

      {!l.ignorar && !l.resuelto.articulo ? (
        creating ? (
          <div className="dec">
            <p><b>Nuevo artículo.</b> Elige su tipo y cómo lo mides en cocina.</p>
            <div className="fgrid fgrid-2">
              <div className="fld"><label htmlFor={`n-${l.id}`}>Nombre</label><input id={`n-${l.id}`} className="inp inp-sm" value={nv.name} onChange={(e) => setNv({ ...nv, name: e.target.value })} /></div>
              <div className="fld"><label htmlFor={`c-${l.id}`}>Tipo</label><select id={`c-${l.id}`} className="inp inp-sm" value={nv.categoryId} onChange={(e) => setNv({ ...nv, categoryId: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name} · IVA {c.iva} %</option>)}</select></div>
              <div className="fld"><label htmlFor={`u-${l.id}`}>Se mide en</label><select id={`u-${l.id}`} className="inp inp-sm" value={nv.unit} onChange={(e) => setNv({ ...nv, unit: e.target.value as BaseUnit })}><option value="kg">kg (peso)</option><option value="L">L (volumen)</option><option value="ud">ud (unidades)</option></select></div>
              <div className="fld"><label htmlFor={`r-${l.id}`}>Aprovechable (%)</label><NumInput id={`r-${l.id}`} className="inp inp-sm" decimals={0} value={nv.rend} onValue={(n) => setNv({ ...nv, rend: Math.min(100, Math.max(1, n ?? 100)) })} /></div>
            </div>
            <div className="dec-btns"><button type="button" className="btn btn-sm" disabled={nv.name.trim().length < 2} onClick={() => onNuevo({ ...nv, name: nv.name.trim() })}>Crear artículo</button><button type="button" className="btn btn-2 btn-sm" onClick={() => setCreating(false)}>Cancelar</button></div>
          </div>
        ) : (
          <div className="dec">
            <p><b>No lo reconocemos con seguridad.</b> {l.candidatos.length ? "¿Es alguno de estos?" : "Elige el artículo o créalo."}</p>
            {l.candidatos.length ? <div className="dec-opts">{l.candidatos.map((c) => (
              <button type="button" key={c.tipo + c.id} className="dec-opt" onClick={() => onPickCand({ tipo: c.tipo, id: c.id })}>
                <span>{c.name} <small>{c.tipo === "catalogo" ? "· catálogo" : "· tuyo"}</small></span><span className="tag">{Math.round(c.score * 100)} %</span>
              </button>
            ))}</div> : null}
            <div className="dec-btns">
              <button type="button" className="btn btn-sm" onClick={() => setCreating(true)}><Icon name="plus" size={18} /> Crear artículo</button>
              <button type="button" className="btn btn-2 btn-sm" onClick={onFind}><Icon name="search" size={18} /> Buscar otro</button>
            </div>
            <button type="button" className="linkbtn" onClick={() => onChange((x) => ({ ...x, ignorar: true, resuelto: { ...x.resuelto, articulo: true } }))}>No es un producto (portes, envases…)</button>
          </div>
        )
      ) : null}

      {!l.ignorar && l.resuelto.articulo && !l.resuelto.cantidad ? (
        <div className="dec">
          <p>La cantidad no se lee bien («{l.cantidadTexto || "?"}»).{expected != null ? <> Por el importe de la línea ({eur(l.importe)} a {eur(l.precio)}) serían <b>{qty(expected)} {l.unidadCompra}</b>.</> : null}</p>
          <div className="dec-q">
            <div className="fld"><label htmlFor={`q-${l.id}`}>Cantidad</label><div className="inp-unit"><NumInput id={`q-${l.id}`} value={qTmp} onValue={setQTmp} /><span>{l.unidadCompra}</span></div></div>
            <button type="button" className="btn" disabled={!(qTmp && qTmp > 0)} onClick={() => onChange((x) => ({ ...x, cantidad: qTmp, resuelto: { ...x.resuelto, cantidad: true } }))}>Confirmar</button>
          </div>
        </div>
      ) : null}

      {!l.ignorar && l.resuelto.articulo && !l.resuelto.unidad && unit ? (
        <div className="dec">
          <p>¿Cuántos <b>{unit === "ud" ? "unidades" : unit}</b> trae cada «{l.unidadCompra || "unidad de compra"}»? Así el coste por {unit} sale bien.</p>
          <div className="dec-q">
            <div className="fld"><label htmlFor={`f-${l.id}`}>1 {l.unidadCompra || "unidad"} =</label><div className="inp-unit"><NumInput id={`f-${l.id}`} value={fTmp} onValue={setFTmp} /><span>{unit}</span></div></div>
            <button type="button" className="btn" disabled={!(fTmp && fTmp > 0)} onClick={() => onChange((x) => ({ ...x, factor: fTmp, factorFuente: "usuario", resuelto: { ...x.resuelto, unidad: true } }))}>Confirmar</button>
          </div>
        </div>
      ) : null}

      {!l.ignorar && l.resuelto.articulo && !l.resuelto.iva ? (
        <div className="dec">
          <p>{l.ivaLeido != null
            ? <>En la línea pone <b>{l.ivaLeido} %</b>{l.ivaEsperado != null ? <>, pero para {base ? `«${base.name}»` : "este artículo"} lo habitual es el <b>{l.ivaEsperado} %</b></> : null}. ¿Cuál aplica?</>
            : <>No aparece el IVA de esta línea. {l.ivaEsperado != null ? <>Lo habitual es el <b>{l.ivaEsperado} %</b>.</> : null}</>}</p>
          <div className="dec-btns">{rates.slice(0, 4).map((r) => (
            <button type="button" key={r} className={`btn btn-sm ${r === l.ivaEsperado ? "" : "btn-2"}`} onClick={() => onChange((x) => ({ ...x, iva: r, resuelto: { ...x.resuelto, iva: true } }))}>
              {r} %{r === l.ivaEsperado ? " · sugerido" : r === l.ivaLeido ? " · como la línea" : ""}
            </button>
          ))}</div>
        </div>
      ) : null}

      {l.match?.porUsuario && l.resuelto.articulo && !l.manual ? <Done txt={l.match.tipo === "nuevo" ? "Artículo creado por ti" : "Emparejado por ti"} onUndo={onUndo} /> : null}
      {l.ignorar ? <Done txt="Marcado como no producto" onUndo={() => onChange((x) => ({ ...x, ignorar: false, resuelto: { ...x.resuelto, articulo: !!x.match } }))} /> : null}
      {l.decisiones.cantidad && l.resuelto.cantidad ? <Done txt={`Cantidad confirmada: ${qty(l.cantidad)} ${l.unidadCompra}`} onUndo={() => onChange((x) => ({ ...x, resuelto: { ...x.resuelto, cantidad: false } }))} /> : null}
      {l.factorFuente === "usuario" && l.resuelto.unidad ? <Done txt={`1 ${l.unidadCompra} = ${qty(l.factor)} ${unit ?? ""}`} onUndo={() => onChange((x) => ({ ...x, factorFuente: null, resuelto: { ...x.resuelto, unidad: false } }))} /> : null}
      {l.decisiones.iva && l.resuelto.iva ? <Done txt={`IVA ${l.iva} % · confirmado por ti`} onUndo={() => onChange((x) => ({ ...x, iva: null, resuelto: { ...x.resuelto, iva: false } }))} /> : null}

      {editing ? (
        <div className="stack-sm">
          <div className="ln-edit">
            <div className="fld"><label>Cantidad</label><NumInput className="inp inp-sm" value={l.cantidad} onValue={(n) => onChange((x) => ({ ...x, cantidad: n, resuelto: { ...x.resuelto, cantidad: n != null && n > 0 } }))} /></div>
            <div className="fld"><label>Precio (sin IVA)</label><NumInput className="inp inp-sm" decimals={4} value={l.precio} onValue={(n) => onChange((x) => ({ ...x, precio: n }))} /></div>
            <div className="fld"><label>Descuento %</label><NumInput className="inp inp-sm" decimals={2} value={l.descuento} onValue={(n) => onChange((x) => ({ ...x, descuento: Math.max(0, Math.min(100, n ?? 0)) }))} /></div>
            <div className="fld"><label>Unidades gratis</label><NumInput className="inp inp-sm" value={l.bonificadas} onValue={(n) => onChange((x) => ({ ...x, bonificadas: Math.max(0, n ?? 0) }))} /></div>
            <div className="fld"><label>Unidad de compra</label><input className="inp inp-sm" value={l.unidadCompra} onChange={(e) => onChange((x) => ({ ...x, unidadCompra: e.target.value }))} /></div>
            <div className="fld"><label>{unit ? `${unit} por unidad` : "Factor"}</label><NumInput className="inp inp-sm" value={l.factor} onValue={(n) => onChange((x) => ({ ...x, factor: n, factorFuente: "usuario", resuelto: { ...x.resuelto, unidad: n != null && n > 0 } }))} /></div>
            <div className="fld"><label>IVA</label><select className="inp inp-sm" value={l.iva ?? ""} onChange={(e) => onChange((x) => ({ ...x, iva: e.target.value === "" ? null : Number(e.target.value), resuelto: { ...x.resuelto, iva: e.target.value !== "" } }))}>
              <option value="">—</option>{[0, 4, 5, 10, 21].map((r) => <option key={r} value={r}>{r} %</option>)}</select></div>
            <div className="fld"><label>Artículo</label><button type="button" className="btn btn-2 btn-sm" onClick={onFind}>Cambiar</button></div>
          </div>
          <div className="row-wrap"><button type="button" className="btn btn-3 btn-sm" onClick={onRemove}><Icon name="trash" size={18} /> Quitar la línea</button><button type="button" className="btn btn-2 btn-sm" onClick={() => setEditing(false)}>Hecho</button></div>
        </div>
      ) : null}
    </article>
  );
}
function guessUnit(texto: string, uc: string): BaseUnit {
  const t = (texto + " " + uc).toUpperCase();
  if (/\b\d+(?:[.,]\d+)?\s?(L|LT|ML|CL)\b|LITRO|GARRAFA|BOTELLA|BARRIL/.test(t)) return "L";
  if (/\b\d+(?:[.,]\d+)?\s?(KG|G|GR)\b|KILO|BANDEJA|SACO/.test(t)) return "kg";
  if (/\bUD|UNID|CAJA|EST/.test(t)) return "ud";
  return "kg";
}
