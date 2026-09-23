"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { Confirm } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import type { BaseUnit } from "@/lib/units";
import { archivarArticulo, guardarArticulo } from "../actions";

type A = { id: string; name: string; categoryId: string; unit: BaseUnit; rend: number; iva: number; precioManual: number | null; stockMin: number | null; consumo: number | null; trackStock: boolean; aliases: string[] };

export function ArtForm({ a, cats, canEdit, unitLocked }: { a: A; cats: { id: string; name: string; iva: number }[]; canEdit: boolean; unitLocked: boolean }) {
  const [f, setF] = useState(a);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(f) !== JSON.stringify(a);
  const set = <K extends keyof A>(k: K, v: A[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => start(async () => {
    const r = await guardarArticulo(a.id, f);
    if (r.ok) toast(r.msg ?? "Guardado"); else toastError(r.error);
  });
  return (
    <section className="card" aria-labelledby="h-datos">
      <div className="card-h"><h2 className="h3" id="h-datos">Datos del artículo</h2>{dirty ? <span className="tag tag-warn">Sin guardar</span> : null}</div>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }} className="stack-sm">
        <div className="fld"><label htmlFor="a-n">Nombre</label><input id="a-n" className="inp inp-sm" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="fgrid fgrid-2">
          <div className="fld"><label htmlFor="a-c">Tipo</label>
            <select id="a-c" className="inp inp-sm" value={f.categoryId} onChange={(e) => { const c = cats.find((x) => x.id === e.target.value); setF((x) => ({ ...x, categoryId: e.target.value, iva: c?.iva ?? x.iva })); }}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div className="fld"><label htmlFor="a-i">IVA de compra</label>
            <select id="a-i" className="inp inp-sm" value={f.iva} onChange={(e) => set("iva", Number(e.target.value))}>{[0, 4, 5, 10, 21].map((r) => <option key={r} value={r}>{r} %</option>)}</select></div>
          <div className="fld"><label htmlFor="a-u">Se mide en</label>
            <select id="a-u" className="inp inp-sm" value={f.unit} disabled={unitLocked} onChange={(e) => set("unit", e.target.value as BaseUnit)}><option value="kg">kg</option><option value="L">L</option><option value="ud">ud</option></select>
            {unitLocked ? <p className="hint">Tiene compras o recetas: la unidad ya no se cambia.</p> : null}</div>
          <div className="fld"><label htmlFor="a-r">Aprovechable (%)</label><NumInput id="a-r" className="inp inp-sm" decimals={1} value={f.rend} onValue={(n) => set("rend", Math.min(100, Math.max(1, n ?? 100)))} />
            <p className="hint">Lo que queda tras limpiar: 100 − merma.</p></div>
        </div>
        <div className="fld"><label htmlFor="a-p">Precio a mano (€/{f.unit}, sin IVA)</label>
          <NumInput id="a-p" className="inp inp-sm" decimals={4} value={f.precioManual} onValue={(n) => set("precioManual", n)} placeholder="Vacío: se usa el de tus compras" />
          <p className="hint">Útil para elaboraciones propias o productos sin albarán. Si llega un albarán más reciente, manda el albarán.</p></div>
        <label className="switch"><input type="checkbox" checked={f.trackStock} onChange={(e) => set("trackStock", e.target.checked)} /> Controlar stock en inventario</label>
        {f.trackStock ? <div className="fgrid fgrid-2">
          <div className="fld"><label htmlFor="a-m">Stock mínimo ({f.unit})</label><NumInput id="a-m" className="inp inp-sm" value={f.stockMin} onValue={(n) => set("stockMin", n)} /></div>
          <div className="fld"><label htmlFor="a-s">Consumo semanal ({f.unit})</label><NumInput id="a-s" className="inp inp-sm" value={f.consumo} onValue={(n) => set("consumo", n)} /></div>
        </div> : null}
        {f.aliases.length ? <div className="fld"><span className="lbl">Así aparece en tus albaranes</span>
          <div className="tags">{f.aliases.map((al) => <span key={al} className="tag tag-line">{al}{canEdit ? <button type="button" aria-label={`Quitar ${al}`} onClick={() => set("aliases", f.aliases.filter((x) => x !== al))} style={{ marginLeft: 4 }}><Icon name="close" size={12} /></button> : null}</span>)}</div>
          <p className="hint">Los aprendemos al guardar albaranes: la próxima vez se reconoce solo.</p></div> : null}
        {canEdit ? <button type="button" className="btn btn-sm" disabled={!dirty || pending} onClick={save}>{pending ? <span className="spin" /> : null}Guardar cambios</button> : <p className="hint">Solo lectura con tu rol.</p>}
      </fieldset>
    </section>
  );
}

export function ArchivarArticulo({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-3 btn-sm" onClick={() => setOpen(true)}><Icon name="trash" size={18} /> Borrar de mi lista</button>
      <Confirm open={open} onClose={() => setOpen(false)} title="¿Borrar este artículo?" danger confirm="Borrar" busy={pending}
        text="Desaparece de tus listas e inventario. Sus compras pasadas se conservan en los albaranes."
        onConfirm={() => start(async () => { const r = await archivarArticulo(id); if (r && !r.ok) { toastError(r.error); setOpen(false); } })} />
    </>
  );
}
