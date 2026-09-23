"use client";
// Buscador de artículos: primero los tuyos, luego el catálogo base del sector.
import { useMemo, useState } from "react";
import { Icon } from "./icons";
import { Sheet } from "./ui/sheet";
import { bestMatches, norm } from "@/lib/fuzzy";
import type { BaseUnit } from "@/lib/units";

export type PickArt = { id: string; name: string; unit: BaseUnit; categoryId: string; aliases?: string[]; sub?: string };
export type PickCat = { id: string; name: string; unit: BaseUnit; categoryId: string; aliases?: string[] };
export type Picked = { tipo: "tuyo" | "catalogo" | "receta"; id: string; name: string; unit: BaseUnit };

export function ArticlePicker({ open, onClose, onPick, onCreate, arts, catalog, recetas, cats, title = "Elegir artículo", initial = "" }: {
  open: boolean; onClose: () => void; onPick: (p: Picked) => void; onCreate?: (name: string) => void;
  arts: PickArt[]; catalog?: PickCat[]; recetas?: PickArt[]; cats: Map<string, string>; title?: string; initial?: string;
}) {
  const [q, setQ] = useState(initial);
  const res = useMemo(() => {
    const t = q.trim();
    const filt = <T extends { name: string; aliases?: string[] }>(list: T[], n: number) => {
      if (!t) return list.slice(0, n);
      const sub = list.filter((x) => norm(x.name).includes(norm(t)) || (x.aliases ?? []).some((a) => norm(a).includes(norm(t))));
      const fz = bestMatches(t, list, (x) => [x.name, ...(x.aliases ?? [])], 0.45, n).map((c) => c.item);
      return [...new Set([...sub, ...fz])].slice(0, n);
    };
    const ownNames = new Set(arts.map((a) => norm(a.name)));
    return {
      recetas: recetas ? filt(recetas, 8) : [],
      arts: filt(arts, 30),
      cat: catalog ? filt(catalog.filter((c) => !ownNames.has(norm(c.name))), 20) : [],
    };
  }, [q, arts, catalog, recetas]);
  return (
    <Sheet open={open} onClose={onClose} title={title} drawer>
      <div className="searchbox"><Icon name="search" size={18} /><input className="inp" type="search" autoFocus placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar artículo" /></div>
      {res.recetas.length ? <section className="stack-sm"><p className="eyebrow">Elaboraciones y platos</p><div className="pick-list">
        {res.recetas.map((r) => <button type="button" key={r.id} className="pick" onClick={() => onPick({ tipo: "receta", id: r.id, name: r.name, unit: r.unit })}><span className="li-ic"><Icon name="layers" /></span><span><b>{r.name}</b><small>{r.sub ?? "Elaboración"} · por {r.unit}</small></span><Icon name="chevR" size={18} /></button>)}
      </div></section> : null}
      <section className="stack-sm"><p className="eyebrow">Tus artículos</p>
        {res.arts.length ? <div className="pick-list">
          {res.arts.map((a) => <button type="button" key={a.id} className="pick" onClick={() => onPick({ tipo: "tuyo", id: a.id, name: a.name, unit: a.unit })}><span className="li-ic"><Icon name="box" /></span><span><b>{a.name}</b><small>{a.sub ?? cats.get(a.categoryId) ?? ""} · {a.unit}</small></span><Icon name="chevR" size={18} /></button>)}
        </div> : <p className="muted small">{q ? "Ninguno de tus artículos coincide." : "Aún no tienes artículos."}</p>}
      </section>
      {catalog ? <section className="stack-sm"><p className="eyebrow">Catálogo del sector</p>
        {res.cat.length ? <div className="pick-list">
          {res.cat.map((c) => <button type="button" key={c.id} className="pick" onClick={() => onPick({ tipo: "catalogo", id: c.id, name: c.name, unit: c.unit })}><span className="li-ic"><Icon name="tag" /></span><span><b>{c.name}</b><small>{cats.get(c.categoryId) ?? ""} · {c.unit} · se añadirá a tu lista</small></span><Icon name="plus" size={18} /></button>)}
        </div> : <p className="muted small">Sin coincidencias en el catálogo.</p>}
      </section> : null}
      {onCreate && q.trim().length >= 2 ? <button type="button" className="btn btn-2 btn-block" onClick={() => onCreate(q.trim())}><Icon name="plus" size={18} /> Crear «{q.trim()}» como artículo nuevo</button> : null}
    </Sheet>
  );
}
