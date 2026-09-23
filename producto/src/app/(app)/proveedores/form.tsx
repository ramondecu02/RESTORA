"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Confirm, Sheet } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { PROV_TIPOS } from "@/lib/briefing";
import { borrarProveedor, guardarProveedor, type ProvInput } from "./actions";

const EMPTY: ProvInput = { name: "", empresa: "", tipo: "", cif: "", responsable: "", phone: "", email: "", direccion: "", entrega: "", notas: "" };

export function ProvFormButton({ id, initial, label, className = "btn btn-2 btn-sm", icon = "plus", goTo }: { id?: string; initial?: Partial<ProvInput>; label: ReactNode; className?: string; icon?: "plus" | "edit"; goTo?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<ProvInput>({ ...EMPTY, ...initial });
  const [pending, start] = useTransition();
  const fld = (k: keyof ProvInput, l: string, extra: Record<string, string> = {}) => (
    <div className="fld"><label htmlFor={`pv-${k}`}>{l}</label><input id={`pv-${k}`} className="inp" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} /></div>
  );
  const save = () => start(async () => {
    const r = await guardarProveedor(id ?? null, f);
    if (!r.ok) { toastError(r.error); return; }
    toast(r.msg ?? "Guardado");
    setOpen(false);
    if (!id) setF({ ...EMPTY });
    if (goTo && !id) router.push(`/proveedores/${r.data!.id}`);
  });
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><Icon name={icon} size={18} /> {label}</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={id ? "Editar proveedor" : "Nuevo proveedor"}
        foot={<><button type="button" className="btn btn-3" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="btn" disabled={pending || f.name.trim().length < 2} onClick={save}>{pending ? <span className="spin" /> : null}Guardar</button></>}>
        <div className="fgrid fgrid-2">
          {fld("name", "Nombre comercial *", { autoComplete: "organization" })}
          {fld("empresa", "Razón social")}
          <div className="fld"><label htmlFor="pv-tipo">Qué te vende</label><select id="pv-tipo" className="inp" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}><option value="">Sin especificar</option>{PROV_TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
          {fld("cif", "CIF")}
          {fld("responsable", "Persona de contacto", { autoComplete: "name" })}
          {fld("phone", "Teléfono", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
          {fld("email", "Correo electrónico", { type: "email", inputMode: "email", autoComplete: "email" })}
          {fld("entrega", "Días de entrega", { placeholder: "Ej.: Mar · Jue · Sáb" })}
        </div>
        {fld("direccion", "Dirección", { autoComplete: "street-address" })}
        <div className="fld"><label htmlFor="pv-notas">Notas y condiciones</label><textarea id="pv-notas" className="inp" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} placeholder="Pedido mínimo, hora límite, forma de pago…" /></div>
      </Sheet>
    </>
  );
}

export function BorrarProveedor({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-3 btn-sm" onClick={() => setOpen(true)}><Icon name="trash" size={18} /> Eliminar</button>
      <Confirm open={open} onClose={() => setOpen(false)} title={`¿Eliminar ${name}?`} danger confirm="Eliminar" busy={pending}
        text="Solo se puede eliminar si no tiene albaranes, productos ni precios guardados."
        onConfirm={() => start(async () => { const r = await borrarProveedor(id); if (r && !r.ok) { toastError(r.error); setOpen(false); } })} />
    </>
  );
}
