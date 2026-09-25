"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { OnbFoot, OnbShell } from "@/components/onb-shell";
import { toastError } from "@/components/ui/toast";
import { PROV_TIPOS } from "@/lib/briefing";
import { altaProveedor, quitarProveedorAlta, terminarAlta } from "../../actions";

type P = { id: string; name: string; tipo: string };

export function ProveedoresAlta({ initial }: { initial: P[] }) {
  const [list, setList] = useState(initial);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const [finishing, startFinish] = useTransition();
  const add = () => start(async () => {
    setErr("");
    const r = await altaProveedor(nombre, tipo);
    if (!r.ok) { setErr(r.error); return; }
    setList((l) => [...l, r.data!]); setNombre(""); setTipo("");
  });
  const quitar = (id: string) => start(async () => {
    const r = await quitarProveedorAlta(id);
    if (!r.ok) toastError(r.error); else setList((l) => l.filter((x) => x.id !== id));
  });
  const finish = () => startFinish(async () => { const r = await terminarAlta(); if (r && !r.ok) toastError(r.error); });
  return (
    <OnbShell step="prov" back="/alta/local" foot={
      <OnbFoot back={<Link className="btn btn-3 btn-sm" href="/alta/local"><Icon name="back" /> Atrás</Link>}>
        <button type="button" className="btn btn-3" onClick={finish} disabled={finishing}>Saltar</button>
        <button type="button" className="btn" onClick={finish} disabled={finishing}>{finishing ? <span className="spin" /> : null}Ir a mi cocina</button>
      </OnbFoot>}>
      <div className="onb-h"><h1>¿A quién le compras?</h1><p>Añade los que recuerdes. Los demás aparecerán solos en tus albaranes y te pediremos confirmarlos.</p></div>
      <form className="stack-sm" noValidate onSubmit={(e) => { e.preventDefault(); add(); }}>
        <div className="fgrid fgrid-2">
          <div className="fld">
            <label htmlFor="p-nombre">Nombre del proveedor</label>
            <input className="inp" id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Distribuciones Martínez" autoComplete="off" aria-invalid={err ? true : undefined} />
            {err ? <p className="ferr">{err}</p> : null}
          </div>
          <div className="fld">
            <label htmlFor="p-tipo">Qué te vende (opcional)</label>
            <select className="inp" id="p-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Sin especificar</option>{PROV_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
        </div>
        <button className="btn btn-2 btn-block" type="submit" disabled={pending}><Icon name="plus" size={18} /> Añadir proveedor</button>
      </form>
      <section className="card" aria-labelledby="h-provs">
        <div className="card-h"><h2 className="h3" id="h-provs">Tus proveedores</h2><span className="tag">{list.length}</span></div>
        {list.length ? (
          <div className="list">{list.map((p) => (
            <div className="li" key={p.id}>
              <span className="li-ic"><Icon name="truck" /></span>
              <div className="li-main"><b>{p.name}</b><small>{p.tipo || "Sin especificar"}</small></div>
              <button type="button" className="iconbtn iconbtn-danger" onClick={() => quitar(p.id)} aria-label={`Quitar ${p.name}`}><Icon name="trash" size={18} /></button>
            </div>
          ))}</div>
        ) : <p className="muted">Aún no has añadido ninguno. Puedes saltar este paso.</p>}
      </section>
    </OnbShell>
  );
}
