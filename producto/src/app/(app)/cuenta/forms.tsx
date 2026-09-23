"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { Confirm } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { cambiarTema } from "../prefs-actions";
import { cambiarPassword, cerrarOtrasSesiones, demo, eliminarNegocio, guardarLocal, guardarPerfil } from "./actions";

type L = { name: string; address: string; postal_code: string; ciudad: string; lema: string; iva_venta: number; fc_objetivo: number; comensales_dia: number | null };
const done = (r: { ok: boolean; error?: string; msg?: string }) => (r.ok ? toast(r.msg ?? "Guardado") : toastError(r.error ?? "Error"));

export function LocalForm({ l, canEdit }: { l: L; canEdit: boolean }) {
  const [f, setF] = useState(l);
  const [pending, start] = useTransition();
  const t = (k: keyof L, label: string, extra: Record<string, string> = {}) => (
    <div className="fld"><label htmlFor={`lc-${k}`}>{label}</label><input id={`lc-${k}`} className="inp" value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} /></div>
  );
  return (
    <section className="card" aria-labelledby="h-local">
      <div className="card-h"><h2 className="h3" id="h-local">Datos del local</h2>{!canEdit ? <span className="tag">Solo lectura</span> : null}</div>
      <fieldset disabled={!canEdit} className="stack-sm" style={{ border: 0, margin: 0, padding: 0 }}>
        <div className="fgrid fgrid-2">{t("name", "Nombre")}{t("ciudad", "Ciudad")}{t("address", "Dirección")}{t("postal_code", "Código postal", { inputMode: "numeric" })}</div>
        {t("lema", "Lema (aparece en la carta imprimible)", { placeholder: "Ej.: Cocina de mercado" })}
        <div className="fgrid fgrid-3">
          <div className="fld"><label htmlFor="lc-iva">IVA de venta</label><select id="lc-iva" className="inp" value={f.iva_venta} onChange={(e) => setF({ ...f, iva_venta: Number(e.target.value) })}><option value={10}>10 %</option><option value={21}>21 %</option></select></div>
          <div className="fld"><label htmlFor="lc-fc">Food cost objetivo (%)</label><NumInput id="lc-fc" decimals={1} value={f.fc_objetivo} onValue={(n) => setF({ ...f, fc_objetivo: n ?? 30 })} /></div>
          <div className="fld"><label htmlFor="lc-com">Comensales al día</label><NumInput id="lc-com" decimals={0} value={f.comensales_dia} onValue={(n) => setF({ ...f, comensales_dia: n })} /></div>
        </div>
        {canEdit ? <button type="button" className="btn btn-sm" disabled={pending || JSON.stringify(f) === JSON.stringify(l)} onClick={() => start(async () => done(await guardarLocal(f)))}>Guardar</button> : <p className="hint">Solo el propietario cambia estos datos.</p>}
      </fieldset>
    </section>
  );
}

export function PerfilForm({ name, email }: { name: string; email: string }) {
  const [n, setN] = useState(name);
  const [pending, start] = useTransition();
  return (
    <section className="card" aria-labelledby="h-perfil">
      <div className="card-h"><h2 className="h3" id="h-perfil">Tu perfil</h2></div>
      <div className="fld"><label htmlFor="pf-n">Nombre</label><input id="pf-n" className="inp" value={n} onChange={(e) => setN(e.target.value)} autoComplete="name" /></div>
      <div className="fld"><label htmlFor="pf-e">Email</label><input id="pf-e" className="inp" value={email} readOnly /></div>
      <button type="button" className="btn btn-sm" disabled={pending || n === name} onClick={() => start(async () => done(await guardarPerfil(n)))}>Guardar</button>
    </section>
  );
}

export function PasswordForm() {
  const [a, setA] = useState(""), [b, setB] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="card" aria-labelledby="h-pw">
      <div className="card-h"><h2 className="h3" id="h-pw">Contraseña</h2></div>
      <div className="fgrid fgrid-2">
        <div className="fld"><label htmlFor="pw-a">Actual</label><input id="pw-a" type="password" className="inp" value={a} onChange={(e) => setA(e.target.value)} autoComplete="current-password" /></div>
        <div className="fld"><label htmlFor="pw-b">Nueva</label><input id="pw-b" type="password" className="inp" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></div>
      </div>
      <button type="button" className="btn btn-2 btn-sm" disabled={pending || !a || b.length < 8} onClick={() => start(async () => { const r = await cambiarPassword(a, b); done(r); if (r.ok) { setA(""); setB(""); } })}>Cambiar contraseña</button>
    </section>
  );
}

export function TemaForm({ actual }: { actual: "light" | "dark" | "system" }) {
  const [t, setT] = useState(actual);
  const router = useRouter();
  const set = async (v: "light" | "dark" | "system") => {
    setT(v);
    if (v === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", v);
    await cambiarTema(v);
    router.refresh();
  };
  return (
    <section className="card" aria-labelledby="h-tema">
      <div className="card-h"><h2 className="h3" id="h-tema">Apariencia</h2></div>
      <div className="seg" role="radiogroup" aria-labelledby="h-tema">
        {([["light", "Claro", "sun"], ["dark", "Oscuro", "moon"], ["system", "Como el sistema", "settings"]] as const).map(([v, l, ic]) => (
          <button key={v} type="button" role="radio" aria-checked={t === v} className={t === v ? "is-on" : ""} onClick={() => set(v)}><Icon name={ic} size={16} /> {l}</button>))}
      </div>
    </section>
  );
}

export function DemoCard({ cargado }: { cargado: boolean }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  return (
    <section className="card" aria-labelledby="h-demo">
      <div className="card-h"><h2 className="h3" id="h-demo">Datos de ejemplo</h2>{cargado ? <span className="tag tag-warn">Cargados</span> : null}</div>
      <p className="muted small">{cargado ? "Tienes cargado el restaurante de ejemplo (Casa Pujol). Quítalo cuando quieras: lo que hayas creado tú se queda." : "Carga un restaurante de ejemplo con seis meses de compras, platos con fotos, inventario y ventas para explorar todo sin esperar a tus datos."}</p>
      <button type="button" className={`btn btn-sm ${cargado ? "btn-2" : ""}`} disabled={pending} onClick={() => (cargado ? setAsk(true) : start(async () => done(await demo("cargar"))))}>
        {pending ? <span className="spin" /> : <Icon name="flask" size={18} />} {cargado ? "Quitar datos de ejemplo" : "Cargar datos de ejemplo"}
      </button>
      <Confirm open={ask} onClose={() => setAsk(false)} title="¿Quitar los datos de ejemplo?" confirm="Quitar" busy={pending}
        text="Se borran los proveedores, artículos, albaranes, platos y ventas de ejemplo. Si has usado alguno en tus propios datos, se queda como tuyo."
        onConfirm={() => start(async () => { done(await demo("quitar")); setAsk(false); })} />
    </section>
  );
}

export function OtrasSesiones() {
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-3 btn-sm" disabled={pending} onClick={() => start(async () => done(await cerrarOtrasSesiones()))}>Cerrar sesión en otros dispositivos</button>;
}

export function EliminarNegocio({ nombre }: { nombre: string }) {
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="card card-bad" aria-labelledby="h-del">
      <div className="card-h"><h2 className="h3" id="h-del">Eliminar el negocio</h2></div>
      <p className="muted small">Borra para siempre todos los datos de {nombre}: albaranes, archivos, artículos, escandallos y ventas. No se puede deshacer.</p>
      {!open ? <button type="button" className="btn btn-3 btn-sm" onClick={() => setOpen(true)}><Icon name="trash" size={18} /> Eliminar negocio…</button> : (
        <div className="stack-sm">
          <div className="fld"><label htmlFor="del-n">Escribe «{nombre}» para confirmar</label><input id="del-n" className="inp" value={txt} onChange={(e) => setTxt(e.target.value)} /></div>
          <div className="row-wrap"><button type="button" className="btn btn-danger btn-sm" disabled={pending || txt.trim().toLowerCase() !== nombre.trim().toLowerCase()} onClick={() => start(async () => { const r = await eliminarNegocio(txt); if (r && !r.ok) toastError(r.error); })}>Eliminar para siempre</button>
            <button type="button" className="btn btn-3 btn-sm" onClick={() => setOpen(false)}>Cancelar</button></div>
        </div>
      )}
    </section>
  );
}
