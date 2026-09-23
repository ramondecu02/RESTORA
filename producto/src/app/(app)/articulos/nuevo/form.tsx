"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { toastError } from "@/components/ui/toast";
import { bestMatches } from "@/lib/fuzzy";
import type { BaseUnit } from "@/lib/units";
import { crearArticuloAction } from "../actions";

type CatItem = { id: string; name: string; unit: BaseUnit; categoryId: string; rend: number; aliases: string[] };

export function NuevoArticulo({ cats, catalog }: { cats: { id: string; name: string; iva: number }[]; catalog: CatItem[] }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", categoryId: "verdura", unit: "kg" as BaseUnit, rend: 100, precio: null as number | null, catalogId: null as string | null, stockMin: null as number | null, consumo: null as number | null, stock: null as number | null });
  const [pending, start] = useTransition();
  const sug = useMemo(() => (f.name.trim().length >= 3 && !f.catalogId ? bestMatches(f.name, catalog, (c) => [c.name, ...c.aliases], 0.5, 4) : []), [f.name, f.catalogId, catalog]);
  const save = () => start(async () => {
    const r = await crearArticuloAction(f);
    if (r.ok) router.push(`/articulos/${r.data!.id}`); else toastError(r.error);
  });
  return (
    <div className="stack narrow-col">
      <div className="fld">
        <label htmlFor="n-name">Nombre</label>
        <input id="n-name" className="inp" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, catalogId: null })} placeholder="Ej.: Aceite de oliva virgen extra" />
        {sug.length ? <div className="stack-xs"><span className="hint">¿Es alguno de estos del catálogo? Así ya sabemos su tipo, unidad y merma habitual:</span>
          <div className="tags">{sug.map((s) => <button key={s.item.id} type="button" className="chip" onClick={() => setF({ ...f, name: s.item.name, catalogId: s.item.id, categoryId: s.item.categoryId, unit: s.item.unit, rend: s.item.rend })}>{s.item.name}</button>)}</div></div> : null}
        {f.catalogId ? <span className="tag tag-ok"><Icon name="check" size={14} sw={3} /> Del catálogo del sector</span> : null}
      </div>
      <div className="fgrid fgrid-2">
        <div className="fld"><label htmlFor="n-cat">Tipo</label><select id="n-cat" className="inp" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name} · IVA {c.iva} %</option>)}</select></div>
        <div className="fld"><label htmlFor="n-u">Se mide en</label><select id="n-u" className="inp" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as BaseUnit })}><option value="kg">kg (peso)</option><option value="L">L (volumen)</option><option value="ud">ud (unidades)</option></select></div>
        <div className="fld"><label htmlFor="n-r">Aprovechable (%)</label><NumInput id="n-r" decimals={1} value={f.rend} onValue={(n) => setF({ ...f, rend: Math.min(100, Math.max(1, n ?? 100)) })} /><p className="hint">100 − merma. Lubina entera: ~80 %.</p></div>
        <div className="fld"><label htmlFor="n-p">Precio (€/{f.unit}, sin IVA)</label><NumInput id="n-p" decimals={4} value={f.precio} onValue={(n) => setF({ ...f, precio: n })} placeholder="Opcional" /><p className="hint">Si no lo pones, llegará con el primer albarán.</p></div>
      </div>
      <details className="desg">
        <summary><Icon name="chevD" size={18} /> Inventario (opcional)</summary>
        <div className="fgrid fgrid-3" style={{ paddingTop: 8 }}>
          <div className="fld"><label htmlFor="n-s">Stock actual</label><NumInput id="n-s" value={f.stock} onValue={(n) => setF({ ...f, stock: n })} /></div>
          <div className="fld"><label htmlFor="n-m">Stock mínimo</label><NumInput id="n-m" value={f.stockMin} onValue={(n) => setF({ ...f, stockMin: n })} /></div>
          <div className="fld"><label htmlFor="n-c">Consumo semanal</label><NumInput id="n-c" value={f.consumo} onValue={(n) => setF({ ...f, consumo: n })} /></div>
        </div>
      </details>
      <button type="button" className="btn" disabled={pending || f.name.trim().length < 2} onClick={save}>{pending ? <span className="spin" /> : null}Crear artículo</button>
    </div>
  );
}
