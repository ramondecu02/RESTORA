"use client";
// Ficha de escandallo con borrador: se edita libremente, se valora el cambio y solo se aplica con «Aceptar cambios».
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { ArticlePicker, type Picked } from "@/components/pickers";
import { PhotoButton } from "@/components/photo-button";
import { TaskScreen } from "@/components/shell/task-screen";
import { NumInput } from "@/components/ui/num-input";
import { Confirm } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { costeBase, estadoFC, foodCost, neto, pvpParaFc, recetaCost, type ArtCost, type CostContext, type RecetaNode } from "@/lib/costing";
import { eur, lista, pct, plural, qty } from "@/lib/format";
import { FAMILIAS } from "@/lib/briefing";
import { borradorAlRefrescar, borradorGuardado, convertirCantidad, editarBorrador, margenDesdePvp, pvpDesdeMargen, vistaBorrador, type Borrador } from "@/lib/receta-edit";
import { defaultLineUnit, lineUnitsFor, toBase, type BaseUnit, type LineUnit } from "@/lib/units";
import { archivarReceta, duplicarReceta, guardarReceta } from "../actions";

export type FichaArt = ArtCost & { categoryId: string; aliases: string[]; catalogId: string | null };
export type FichaRec = RecetaNode & { familia: string };
/** catalogId: ingrediente del catálogo que aún no está en tus artículos; se crea al aceptar, junto con la receta. */
type Line = { key: string; articuloId: string | null; subrecetaId: string | null; catalogId: string | null; cantidad: number; unidad: LineUnit };
/** Solo lo que el usuario cambia del artículo; el resto se queda como está. */
type Precio = { precio?: number; rend?: number };
type D = {
  name: string; familia: string; raciones: number; rinde: number; rindeUnit: BaseUnit; pvp: number | null; fcObjetivo: number | null; ventasMes: number;
  enCarta: boolean; estado: "borrador" | "activo"; descripcion: string; notas: string; costeManual: number | null; margenObjetivo: number | null;
  lineas: Line[]; precios: Record<string, Precio>;
};

const defQty = (u: LineUnit) => (u === "g" ? 100 : u === "ml" ? 50 : u === "ud" ? 1 : 0.1);
let seq = 0;
const k = () => "k" + ++seq;
/** Clave del artículo de una línea en d.precios: su id o, si aún es del catálogo, «cat:» + id del catálogo. */
const ref = (l: { articuloId: string | null; catalogId: string | null }) => l.articuloId ?? (l.catalogId ? "cat:" + l.catalogId : null);
const strip = (x: D) => JSON.stringify({ ...x, lineas: x.lineas.map(({ key: _k, ...r }) => r) });
const igual = (a: D, b: D) => strip(a) === strip(b);
const sinPrecios = (x: D): D => ({ ...x, precios: {} });

export function Ficha({ id, tipo, reventa, initial, fotoUrl, arts, recetas, catalog, cats, iva, fcLocal, canPrecios, canArts, canVentas }: {
  id: string; tipo: "plato" | "elaboracion" | "menu"; reventa: boolean; initial: Omit<D, "precios" | "lineas"> & { lineas: Omit<Line, "key" | "catalogId">[] }; fotoUrl: string | null;
  arts: FichaArt[]; recetas: FichaRec[]; catalog: { id: string; name: string; unit: BaseUnit; rend: number; categoryId: string; aliases: string[] }[];
  cats: { id: string; name: string }[]; iva: number; fcLocal: number; canPrecios: boolean; canArts: boolean; canVentas: boolean;
}) {
  const router = useRouter();
  const base = useMemo<D>(() => ({ ...initial, lineas: initial.lineas.map((l) => ({ ...l, catalogId: null, key: k() })), precios: {} }), [initial]);
  // Sin cambios, la ficha sigue a los datos del servidor (al guardar, al subir la foto…). Un borrador con cambios se conserva.
  const [draft, setDraft] = useState<Borrador<D> | null>(null);
  const [prevBase, setPrevBase] = useState(base);
  if (prevBase !== base) { setPrevBase(base); if (borradorAlRefrescar(draft) !== draft) setDraft(null); }
  const { d, orig, dirty } = vistaBorrador(draft, base, igual);
  const [picker, setPicker] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [ask, setAsk] = useState<"borrar" | null>(null);
  const [pending, start] = useTransition();
  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const catById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const artById = useMemo(() => new Map(arts.map((a) => [a.id, a])), [arts]);
  const recById = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);

  useEffect(() => {
    if (!dirty) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);

  /** Ingrediente del catálogo aún sin crear: se valora como un artículo sin precio (o con el que le pongas). */
  const catArt = (cid: string): FichaArt | null => {
    const c = catById.get(cid);
    return c ? { id: "cat:" + cid, name: c.name, unit: c.unit, rend: c.rend, pmp: null, lastPrice: null, lastPurchaseAt: null, precioManual: null, precioManualAt: null, categoryId: c.categoryId, aliases: [], catalogId: cid } : null;
  };
  const artOf = (l: Line) => (l.articuloId ? artById.get(l.articuloId) ?? null : l.catalogId ? catArt(l.catalogId) : null);
  /** Contexto de costes con el borrador aplicado (líneas nuevas y precios/mermas simulados). */
  const ctxFor = (x: D, withPrices: boolean): CostContext => {
    const a2 = new Map<string, ArtCost>();
    const overrides = new Map<string, number>();
    const nuevos = x.lineas.flatMap((l) => (!l.articuloId && l.catalogId ? [catArt(l.catalogId)] : [])).filter((a): a is FichaArt => !!a);
    for (const a of [...arts, ...nuevos]) {
      const p = withPrices ? x.precios[a.id] : undefined;
      a2.set(a.id, p?.rend != null ? { ...a, rend: p.rend } : a);
      if (p?.precio != null) overrides.set(a.id, p.precio);
    }
    const r2 = new Map<string, RecetaNode>(recetas.map((r) => [r.id, r]));
    r2.set(id, { id, tipo, name: x.name, raciones: x.raciones, rinde: x.rinde, rindeUnit: x.rindeUnit, reventa, costeManual: x.costeManual,
      lineas: x.lineas.map((l) => ({ articuloId: ref(l), subrecetaId: l.subrecetaId, cantidad: toBase(l.cantidad, l.unidad), unidad: l.unidad })) });
    return { arts: a2, recetas: r2, overrides };
  };
  const cNow = recetaCost(id, ctxFor(d, true));
  const cBase = recetaCost(id, ctxFor(orig, false));
  const coste = cNow.perUnit;
  const fcObj = d.fcObjetivo ?? (reventa && d.margenObjetivo != null ? 100 - d.margenObjetivo : fcLocal);
  const fc = foodCost(coste, d.pvp, iva);
  const est = estadoFC(fc, fcObj);
  const obj = pvpParaFc(coste, fcObj, iva);
  /** Aplica un cambio al borrador; si no había cambios pendientes, parte de lo último que llegó del servidor. */
  const setD = (f: (x: D) => D) => setDraft((s) => editarBorrador(s, base, igual, f, sinPrecios));
  const set = <K extends keyof D>(key: K, v: D[K]) => setD((x) => ({ ...x, [key]: v }));
  const setLine = (key: string, patch: Partial<Line>) => setD((x) => ({ ...x, lineas: x.lineas.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  const setPr = (r: string, p: Precio) => setD((x) => {
    const n: Precio = { ...x.precios[r], ...p };
    if (n.precio == null) delete n.precio;
    if (n.rend == null) delete n.rend;
    const precios = { ...x.precios };
    if (n.precio == null && n.rend == null) delete precios[r]; else precios[r] = n;
    return { ...x, precios };
  });
  const lineUnitBase = (l: Line): BaseUnit => (l.articuloId || l.catalogId ? artOf(l)?.unit ?? "kg" : recById.get(l.subrecetaId!)?.tipo === "elaboracion" ? recById.get(l.subrecetaId!)!.rindeUnit : "ud");
  const usadaEn = tipo === "elaboracion" ? recetas.filter((r) => r.id !== id && r.lineas.some((l) => l.subrecetaId === id)) : [];

  const onPick = (p: Picked) => {
    let artId: string | null = null, subId: string | null = null, catId: string | null = null, unit: BaseUnit = p.unit;
    if (p.tipo === "catalogo") {
      // No se crea nada hasta «Aceptar cambios»: si descartas, tu lista de artículos se queda como estaba.
      const own = arts.find((a) => a.catalogId === p.id);
      if (own) { artId = own.id; unit = own.unit; } else catId = p.id;
    } else if (p.tipo === "tuyo") artId = p.id;
    else subId = p.id;
    const lu: LineUnit = subId && recById.get(subId)?.tipo !== "elaboracion" ? "ud" : defaultLineUnit(unit);
    const key = k();
    setD((x) => ({ ...x, lineas: [...x.lineas, { key, articuloId: artId, subrecetaId: subId, catalogId: catId, cantidad: defQty(lu), unidad: lu }] }));
    setPicker(false);
  };

  const accept = () => {
    const sent = d;
    // Solo precios de artículos que siguen en la receta
    const refs = new Set(d.lineas.map(ref));
    const precios = Object.entries(d.precios).filter(([r]) => refs.has(r)).map(([r, v]) => (r.startsWith("cat:") ? { catalogId: r.slice(4), ...v } : { articuloId: r, ...v }));
    const { precios: _p, lineas: ol, ...of } = orig;
    start(async () => {
      const r = await guardarReceta(id, { ...d, lineas: d.lineas.map(({ key: _k, ...l }) => l), precios, orig: { ...of, lineas: ol.map(({ key: _k, ...l }) => l) } });
      if (!r.ok) { toastError(r.error); return; }
      // Lo guardado sigue a la vista hasta que llegan los datos nuevos; lo escrito mientras tanto sigue como cambio pendiente.
      setDraft((s) => borradorGuardado(s, sent));
      toast(r.msg ?? "Guardado");
      router.refresh();
    });
  };
  const discard = () => { setDraft(null); toast("Cambios descartados"); };

  // Valoración del cambio (antes → después)
  const pvpNetB = orig.pvp ? neto(orig.pvp, iva) : null, pvpNetD = d.pvp ? neto(d.pvp, iva) : null;
  const mB = pvpNetB != null ? pvpNetB - cBase.perUnit : null, mD = pvpNetD != null ? pvpNetD - coste : null;
  const fcB = foodCost(cBase.perUnit, orig.pvp, iva);
  let valor: { cls: string; txt: string } | null = null;
  if (tipo !== "elaboracion") {
    if (!dirty) {
      valor = mD != null ? { cls: "fcr-none", txt: `Sin cambios. Margen de ${eur(mD)} por ${reventa ? "unidad" : "ración"}${d.ventasMes ? ` y ${eur(mD * d.ventasMes)} al mes` : ""}.` } : null;
    } else if (mB != null && mD != null) {
      const dm = mD - mB;
      const extra = fcB != null && fc != null ? (fcB <= fcObj / 100 && fc > fcObj / 100 ? " Además, se sale del objetivo de food cost." : fcB > fcObj / 100 && fc <= fcObj / 100 ? " Y vuelve a entrar en el objetivo de food cost." : "") : "";
      valor = dm > 0.001 ? { cls: "fcr-ok", txt: `Te sale a cuenta: el margen sube ${eur(dm)} por ${reventa ? "unidad" : "plato"}${d.ventasMes ? ` y ${eur(dm * d.ventasMes)} al mes` : ""}.${extra}` }
        : dm < -0.001 ? { cls: "fcr-bad", txt: `Pierdes margen: ${eur(-dm)} menos por ${reventa ? "unidad" : "plato"}${d.ventasMes ? ` y ${eur(-dm * d.ventasMes)} al mes` : ""}. Sube el PVP o ajusta la receta.${extra}` }
        : { cls: "fcr-warn", txt: `El margen queda igual; cambian los ingredientes pero no el resultado.${extra}` };
    } else valor = { cls: "fcr-none", txt: "Pon el precio de carta para valorar el cambio." };
  }
  const breakdown = cNow.lines.filter((l) => l.cost != null).sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  const div = tipo === "elaboracion" ? d.rinde : d.raciones;
  const kind = tipo === "elaboracion" ? "elaboración" : tipo === "menu" ? "menú" : reventa ? "producto" : "plato";
  const pickerRecs = recetas.filter((r) => r.id !== id && (tipo === "menu" ? r.tipo !== "menu" : r.tipo === "elaboracion"))
    .map((r) => ({ id: r.id, name: r.name, unit: (r.tipo === "elaboracion" ? r.rindeUnit : "ud") as BaseUnit, categoryId: "", sub: r.tipo === "elaboracion" ? "Elaboración" : r.reventa ? "Reventa" : "Plato" }));

  const lineRow = (l: Line) => {
    const art = artOf(l);
    const nuevo = !l.articuloId && !!l.catalogId;
    const sub = l.subrecetaId ? recById.get(l.subrecetaId) : null;
    const lc = cNow.lines.find((x) => x.idx === d.lineas.indexOf(l));
    const units = lineUnitsFor(lineUnitBase(l));
    const r = ref(l);
    const pr = r ? d.precios[r] : undefined;
    const precioCompra = art ? (pr?.precio ?? costeBase(art)) : null;
    const name = art?.name ?? sub?.name ?? "Ingrediente borrado";
    const subC = sub ? recetaCost(sub.id, ctxFor(d, true)) : null;
    return (
      <div className="er" key={l.key}>
        <div className="er-n">
          <b>{name}{sub ? <span className="tag tag-line">{sub.tipo === "elaboracion" ? "Elaboración" : "Plato"}</span> : null}{nuevo ? <span className="tag tag-line">Nuevo</span> : null}</b>
          <small>{art ? (lc?.unitCost != null ? `${eur(lc.unitCost)}/${art.unit} neto${(pr?.rend ?? art.rend) < 100 ? ` · aprovechable ${qty(pr?.rend ?? art.rend)} %` : ""}` : nuevo ? "Se añadirá a tus artículos al aceptar. Sin precio todavía: pónselo aquí o sube un albarán." : "Sin precio: sube un albarán que lo incluya o pon un precio a mano")
            : sub ? `${eur(subC?.perUnit)}/${sub.tipo === "elaboracion" ? sub.rindeUnit : "ración"}` : ""}</small>
          {art ? <button type="button" className="er-toggle" aria-expanded={!!open[l.key]} onClick={() => setOpen((o) => ({ ...o, [l.key]: !o[l.key] }))}>{open[l.key] ? "Ocultar" : "Precio y merma"} <Icon name="chevD" size={16} /></button> : null}
          {sub ? <button type="button" className="er-toggle" aria-expanded={!!open[l.key]} onClick={() => setOpen((o) => ({ ...o, [l.key]: !o[l.key] }))}>{open[l.key] ? "Ocultar" : "Ver"} su receta <Icon name="chevD" size={16} /></button> : null}
        </div>
        <div className="er-q">
          <NumInput className="inp" decimals={4} value={l.cantidad} onValue={(n) => setLine(l.key, { cantidad: n ?? 0 })} aria-label={`Cantidad de ${name}`} />
          {units.length > 1 ? <select className="inp" value={l.unidad} aria-label="Unidad" onChange={(e) => {
            const nu = e.target.value as LineUnit;
            setLine(l.key, { unidad: nu, cantidad: convertirCantidad(l.cantidad, l.unidad, nu) });
          }}>{units.map((u) => <option key={u}>{u}</option>)}</select> : <span>{units[0]}</span>}
        </div>
        <div className="er-c">{eur(lc?.cost ?? null)}</div>
        <button type="button" className="iconbtn er-x" aria-label={`Quitar ${name}`} onClick={() => setD((x) => {
          // Si ya no queda ninguna línea con ese artículo, su precio o merma probados tampoco se aplican.
          const lineas = x.lineas.filter((y) => y.key !== l.key), precios = { ...x.precios };
          if (r && !lineas.some((y) => ref(y) === r)) delete precios[r];
          return { ...x, lineas, precios };
        })}><Icon name="close" /></button>
        {art && r && open[l.key] ? (
          <div className="er-price">
            <label className="row">Compra <NumInput className="inp" decimals={4} value={precioCompra} disabled={!canArts} onValue={(n) => setPr(r, { precio: n ?? undefined })} aria-label={`Precio de compra de ${name}`} /> €/{art.unit}</label>
            <label className="row">Aprovechable <NumInput className="inp" decimals={1} value={pr?.rend ?? art.rend} disabled={!canArts} onValue={(n) => { const v = Math.min(100, Math.max(1, n ?? 100)); setPr(r, { rend: v === art.rend ? undefined : v }); }} aria-label={`Aprovechable de ${name}`} /> %</label>
            {pr && !nuevo ? <span className="tag tag-warn">Cambia en todas tus recetas al aceptar</span> : null}
          </div>
        ) : null}
        {sub && open[l.key] && subC ? (
          <div className="er-sub">
            <div className="er-sub-h"><span>{sub.name} · {sub.tipo === "elaboracion" ? `rinde ${qty(sub.rinde)} ${sub.rindeUnit}` : `${qty(sub.raciones)} raciones`}</span><span>{eur(subC.perUnit)}/{sub.tipo === "elaboracion" ? sub.rindeUnit : "ración"}</span></div>
            {subC.lines.map((x, i) => <div key={i}><span>{x.name} · {qty(x.cantidad)} {x.kind === "articulo" ? artById.get(x.refId)?.unit : ""}</span><span>{eur(x.cost)}</span></div>)}
            <p className="hint">Es una subreceta: si cambia el precio de un ingrediente, cambia su coste y el de todos los platos que la usan.</p>
          </div>
        ) : null}
      </div>
    );
  };

  const revCoste = d.lineas.length ? coste : d.costeManual ?? 0;
  const foot = (
    <div className="foot-in">
      <div className="foot-note"><span className="mini-sum only-narrow" style={{ gap: 14 }}><span>Coste <b>{eur(coste)}</b></span><span>FC <b>{pct(fc)}</b></span></span>
        {dirty ? <span className="tag tag-warn only-wide">Cambios sin guardar</span> : <span className="tag only-wide">Sin cambios</span>}</div>
      <div className="foot-btns">
        <button type="button" className="btn btn-3" disabled={!dirty || pending} onClick={discard}>Descartar</button>
        <button type="button" className="btn" disabled={!dirty || pending} onClick={accept}>{pending ? <span className="spin" /> : null}Aceptar cambios</button>
      </div>
    </div>
  );

  return (
    <TaskScreen title={d.name || "Sin nombre"} sub={`${tipo === "elaboracion" ? "Elaboración" : tipo === "menu" ? "Menú" : reventa ? "Reventa" : "Escandallo"}${d.familia ? ` · ${d.familia}` : ""}${tipo !== "elaboracion" ? ` · ${qty(d.ventasMes, 0)} uds/mes` : ""}`}
      back={tipo === "elaboracion" ? "/escandallos/elaboraciones" : reventa ? "/carta" : "/escandallos"} foot={foot}>
      <div className="esc-grid">
        <div className="esc-col">
          <section className="card" aria-label={`Datos del ${kind}`}>
            <div className="photo-row">
              {tipo !== "elaboracion" ? <div className="photo">{fotoUrl ? <img src={fotoUrl} alt="" /> : (d.name[0] ?? "?").toUpperCase()}</div> : null}
              <div className="stack-xs grow">
                <div className="fld"><label htmlFor="r-n">Nombre</label><input id="r-n" className="inp" value={d.name} onChange={(e) => set("name", e.target.value)} /></div>
                {tipo !== "elaboracion" ? <PhotoButton recetaId={id} label={fotoUrl ? "Cambiar foto" : "Añadir foto"}><Icon name="camera" size={16} /> {fotoUrl ? "Cambiar foto" : "Añadir foto"}</PhotoButton> : null}
              </div>
            </div>
            <div className="esc-meta">
              <div className="fld"><label htmlFor="r-f">{tipo === "elaboracion" ? "Tipo de elaboración" : "Familia en la carta"}</label>
                <input id="r-f" className="inp" list="familias" value={d.familia} onChange={(e) => set("familia", e.target.value)} placeholder={tipo === "elaboracion" ? "Salsas, fondos, masas…" : "Entrantes, Pescados…"} />
                <datalist id="familias">{FAMILIAS.map((f) => <option key={f} value={f} />)}</datalist></div>
              {tipo === "elaboracion" ? (
                <div className="fld"><label htmlFor="r-ri">Rinde</label><div className="inp-unit"><NumInput id="r-ri" className="inp" value={d.rinde} onValue={(n) => set("rinde", n && n > 0 ? n : 1)} />
                  <select className="inp" style={{ width: 80 }} value={d.rindeUnit} disabled={usadaEn.length > 0} onChange={(e) => set("rindeUnit", e.target.value as BaseUnit)} aria-label="Unidad de rinde"><option>kg</option><option>L</option><option>ud</option></select></div>
                  {usadaEn.length ? <p className="hint">La usa{usadaEn.length > 1 ? "n" : ""} {lista(usadaEn.map((r) => r.name))}: para cambiar la unidad, quítala antes de ahí.</p> : null}</div>
              ) : !reventa ? (
                <div className="fld"><label htmlFor="r-rac">Raciones</label><div className="stepper-n">
                  <button type="button" className="iconbtn" aria-label="Una ración menos" onClick={() => set("raciones", Math.max(1, d.raciones - 1))}><Icon name="minus" size={18} /></button>
                  <NumInput id="r-rac" className="inp" decimals={2} value={d.raciones} onValue={(n) => set("raciones", n && n > 0 ? n : 1)} />
                  <button type="button" className="iconbtn" aria-label="Una ración más" onClick={() => set("raciones", d.raciones + 1)}><Icon name="plus" size={18} /></button>
                </div></div>
              ) : null}
              {tipo !== "elaboracion" ? <label className="switch" style={{ alignSelf: "end", minHeight: 48 }}><input type="checkbox" checked={d.enCarta} onChange={(e) => set("enCarta", e.target.checked)} /> En la carta</label> : null}
            </div>
          </section>

          {reventa ? (
            <section className="card" aria-labelledby="h-rev">
              <div className="card-h"><h2 className="h3" id="h-rev">Precio de compra y margen</h2></div>
              <p className="muted small">Para bebidas y productos que vendes tal cual. El margen se mide sobre el precio de venta sin IVA (no es un recargo).</p>
              <div className="fgrid fgrid-3">
                <div className="fld"><label htmlFor="rv-c">Precio de compra (€)</label>
                  <NumInput id="rv-c" decimals={4} value={d.lineas.length ? coste : d.costeManual} disabled={!!d.lineas.length || !canPrecios}
                    onValue={(n) => setD((x) => ({ ...x, costeManual: n, pvp: n != null && x.margenObjetivo != null ? pvpDesdeMargen(n, x.margenObjetivo, iva) : x.pvp }))} />
                  {d.lineas.length ? <p className="hint">Calculado con el artículo de abajo.</p> : null}</div>
                <div className="fld"><label htmlFor="rv-m">Margen deseado (%)</label>
                  <NumInput id="rv-m" decimals={1} value={d.margenObjetivo} disabled={!canPrecios}
                    onValue={(n) => setD((x) => { const m = n == null ? null : Math.min(99, Math.max(0, n)); return { ...x, margenObjetivo: m, pvp: m != null ? pvpDesdeMargen(revCoste, m, iva) : x.pvp }; })} /></div>
                <div className="fld"><label htmlFor="rv-p">Precio de venta (€, con IVA)</label>
                  <NumInput id="rv-p" decimals={2} value={d.pvp} disabled={!canPrecios}
                    onValue={(n) => setD((x) => ({ ...x, pvp: n, margenObjetivo: n ? margenDesdePvp(revCoste, n, iva) : x.margenObjetivo }))} /></div>
              </div>
              {d.pvp && revCoste ? <p className="hint">Multiplicas el coste por {qty(d.pvp / revCoste, 2)} · ganas {eur(neto(d.pvp, iva) - revCoste)} por unidad sin IVA.</p> : null}
            </section>
          ) : null}

          <section className="card" aria-labelledby="h-ing">
            <div className="card-h"><h2 className="h3" id="h-ing">{reventa ? "Sale de este artículo (opcional)" : tipo === "menu" ? "Platos del menú" : "Ingredientes"}</h2><span className="hint">{reventa ? "Ej.: 0,2 L de cerveza de barril por caña" : "Precios de tus albaranes"}</span></div>
            <div className="ers">{d.lineas.length ? d.lineas.map(lineRow) : <p className="muted">{reventa ? "Si lo enlazas a un artículo, el coste se actualiza solo con cada albarán." : "Añade el primer ingrediente."}</p>}</div>
            {cNow.missing ? <p className="ferr">{plural(cNow.missing, "ingrediente sin precio", "ingredientes sin precio")}: el coste está incompleto.</p> : null}
            <button type="button" className="linkbtn" onClick={() => setPicker(true)} disabled={pending}><Icon name="plus" size={18} /> Añadir {tipo === "menu" ? "plato, elaboración o artículo" : "ingrediente o elaboración"}</button>
          </section>

          <section className="card" aria-labelledby="h-mas">
            <div className="card-h"><h2 className="h3" id="h-mas">Notas</h2></div>
            {tipo !== "elaboracion" ? <div className="fld"><label htmlFor="r-de">Descripción para la carta</label><input id="r-de" className="inp" value={d.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Opcional: aparece en la carta imprimible" /></div> : null}
            <div className="fld"><label htmlFor="r-no">Elaboración y notas de cocina</label><textarea id="r-no" className="inp" value={d.notas} onChange={(e) => set("notas", e.target.value)} /></div>
            <div className="row-wrap">
              <button type="button" className="btn btn-3 btn-sm" disabled={pending} onClick={() => start(async () => { const r = await duplicarReceta(id); if (!r.ok) toastError(r.error); })}><Icon name="copy" size={18} /> Duplicar</button>
              <button type="button" className="btn btn-3 btn-sm" disabled={pending} onClick={() => setAsk("borrar")}><Icon name="trash" size={18} /> Borrar</button>
            </div>
          </section>
        </div>

        <aside className="esc-col esc-side">
          <section className="card sum" aria-labelledby="h-sum">
            <h2 className="h3" id="h-sum">Coste y precio</h2>
            <div className="sum-row"><span>Coste de la receta</span><b>{eur(cNow.total || (reventa ? revCoste : 0))}</b></div>
            <div className="sum-row"><span>{tipo === "elaboracion" ? "Rinde" : "Raciones"}</span><b>{qty(div)}{tipo === "elaboracion" ? ` ${d.rindeUnit}` : ""}</b></div>
            <div className="sum-big"><span>Coste por {tipo === "elaboracion" ? d.rindeUnit : reventa ? "unidad" : "ración"}</span><b>{eur(coste)}</b></div>
            {tipo !== "elaboracion" ? <>
              {!reventa ? <div className="fld"><span className="lbl" id="l-fc">Food cost objetivo</span>
                <div className="pills pills-5" role="radiogroup" aria-labelledby="l-fc">{[25, 28, 30, 33, 35].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={fcObj === v} className={`pill ${fcObj === v ? "is-on" : ""}`} disabled={!canPrecios} onClick={() => set("fcObjetivo", v === fcLocal ? null : v)}>{v} %</button>))}</div></div> : null}
              {!reventa ? <div className="pvp"><span className="eyebrow">PVP para un food cost del {qty(fcObj, 1)} %</span><b>{eur(obj.gross)}</b><small>{eur(obj.net)} + IVA {iva} %</small></div> : null}
              {!reventa ? <div className="fld"><label htmlFor="r-pvp">Tu precio en carta, con IVA</label><div className="inp-unit"><NumInput id="r-pvp" decimals={2} value={d.pvp} disabled={!canPrecios} onValue={(n) => set("pvp", n)} placeholder="0,00" /><span>€</span></div>
                {!canPrecios ? <p className="hint">Tu rol no cambia precios de carta.</p> : null}</div> : null}
              <div className={`fcr fcr-${est.estado === "none" ? "none" : est.estado === "crit" ? "bad" : est.estado}`}>
                <Icon name={est.estado === "ok" ? "check" : est.estado === "none" ? "info" : "alert"} />
                <span>{est.estado === "none" ? "Escribe tu precio de carta y te decimos el food cost real y el margen." :
                  <>Food cost del <b>{pct(fc)}</b>{est.estado === "ok" ? `: dentro de tu objetivo del ${qty(fcObj, 1)} %.` : `: por encima de tu objetivo del ${qty(fcObj, 1)} %.`} {d.pvp && d.pvp >= obj.gross ? `Te sobran ${eur(d.pvp - obj.gross)} sobre el PVP objetivo.` : d.pvp ? `Para cumplirlo, el PVP debería ser ${eur(obj.gross)} (${eur(obj.gross - d.pvp)} más).` : ""}</>}</span>
              </div>
              <div className="fld"><label htmlFor="r-v">Unidades vendidas al mes</label><NumInput id="r-v" decimals={0} value={d.ventasMes} disabled={!canVentas} onValue={(n) => set("ventasMes", Math.max(0, Math.round(n ?? 0)))} /><p className="hint">Se actualiza al importar ventas; también puedes ponerlo a mano.</p></div>
            </> : null}
          </section>
          {valor ? (
            <section className="card" aria-labelledby="h-val">
              <div className="card-h"><h2 className="h3" id="h-val">Valoración del cambio</h2><span className={`tag ${dirty ? "tag-warn" : ""}`}>{dirty ? "Cambios sin guardar" : "Sin cambios"}</span></div>
              {dirty && mB != null && mD != null ? <dl className="cfg">
                <div><dt>Coste</dt><dd>{eur(cBase.perUnit)} → {eur(coste)}</dd></div>
                <div><dt>Margen por {reventa ? "unidad" : "ración"}</dt><dd>{eur(mB)} → {eur(mD)}</dd></div>
                <div><dt>Food cost</dt><dd>{pct(fcB)} → {pct(fc)}</dd></div>
                {d.ventasMes ? <div><dt>Aporta al mes</dt><dd>{eur(mB * orig.ventasMes)} → {eur(mD * d.ventasMes)}</dd></div> : null}
              </dl> : null}
              <div className={`fcr ${valor.cls}`}><Icon name={valor.cls === "fcr-ok" ? "check" : valor.cls === "fcr-bad" ? "alert" : "info"} /><span>{valor.txt}</span></div>
              <div className="row-wrap"><button type="button" className="btn btn-sm" disabled={!dirty || pending} onClick={accept}>Aceptar cambios</button><button type="button" className="btn btn-2 btn-sm" disabled={!dirty || pending} onClick={discard}>Descartar</button></div>
            </section>
          ) : null}
          {breakdown.length ? (
            <section className="card" aria-labelledby="h-brk">
              <div className="card-h"><h2 className="h3" id="h-brk">De dónde sale el coste</h2></div>
              <div className="brk">{breakdown.map((l, i) => {
                const w = cNow.total > 0 ? ((l.cost ?? 0) / cNow.total) * 100 : 0;
                return (<div className="brk-i" key={i}><b>{l.name}</b><span>{eur((l.cost ?? 0) / (div || 1))} · {qty(w, 0)} %</span><div className="bar"><i style={{ width: `${w}%`, opacity: 0.35 + (w / 100) * 0.65 }} /></div></div>);
              })}</div>
              <p className="hint">Por {tipo === "elaboracion" ? d.rindeUnit : "ración"}, de mayor a menor peso en el coste.</p>
            </section>
          ) : null}
        </aside>
      </div>
      <ArticlePicker open={picker} onClose={() => setPicker(false)} onPick={onPick} title={tipo === "menu" ? "Añadir al menú" : "Añadir ingrediente"}
        arts={arts.map((a) => ({ id: a.id, name: a.name, unit: a.unit, categoryId: a.categoryId, aliases: a.aliases }))}
        catalog={catalog} recetas={pickerRecs} cats={catName} />
      <Confirm open={ask === "borrar"} onClose={() => setAsk(null)} title={`¿Borrar ${d.name}?`} danger confirm="Borrar" busy={pending}
        text={`Desaparece de escandallos y de la carta. ${tipo === "elaboracion" ? "Si la usa algún plato, antes tendrás que quitarla de él." : ""}`}
        onConfirm={() => start(async () => { const r = await archivarReceta(id); if (r && !r.ok) { toastError(r.error); setAsk(null); } })} />
    </TaskScreen>
  );
}
