"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast, toastError } from "@/components/ui/toast";
import { initials, fecha } from "@/lib/format";
import { cambiarRol, invitar, quitarMiembro, revocarInvitacion } from "../actions";

type M = { id: string; name: string; email: string; role: string };
export function Equipo({ me, miembros, invit, roles }: { me: string; miembros: M[]; invit: { id: string; email: string; role: string; expires: string }[]; roles: { id: string; label: string; desc: string }[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("cocina");
  const [link, setLink] = useState<{ url: string; enviado: boolean } | null>(null);
  const [pending, start] = useTransition();
  const label = (r: string) => roles.find((x) => x.id === r)?.label ?? r;
  return (
    <div className="two">
      <div className="stack">
        <section className="card" aria-labelledby="h-eq">
          <div className="card-h"><h2 className="h3" id="h-eq">Tu equipo</h2><span className="tag">{miembros.length}</span></div>
          <div className="list">{miembros.map((m) => (
            <div className="member" key={m.id}>
              <span className="avatar" aria-hidden="true">{initials(m.name)}</span>
              <span className="li-main"><b>{m.name}{m.id === me ? " (tú)" : ""}</b><small>{m.email}</small></span>
              <div className="member-acts">
                <select className="inp inp-sm" value={m.role} aria-label={`Rol de ${m.name}`} disabled={pending}
                  onChange={(e) => start(async () => { const r = await cambiarRol(m.id, e.target.value); if (r.ok) toast(r.msg ?? "Hecho"); else toastError(r.error); })}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                {m.id !== me ? <button type="button" className="iconbtn iconbtn-sm iconbtn-danger" aria-label={`Quitar a ${m.name}`} disabled={pending}
                  onClick={() => start(async () => { const r = await quitarMiembro(m.id); if (r.ok) toast(r.msg ?? "Hecho"); else toastError(r.error); })}><Icon name="close" size={16} /></button> : null}
              </div>
            </div>))}</div>
        </section>
        {invit.length ? (
          <section className="card" aria-labelledby="h-inv">
            <div className="card-h"><h2 className="h3" id="h-inv">Invitaciones pendientes</h2></div>
            <div className="list">{invit.map((i) => (
              <div className="li" key={i.id}>
                <span className="li-ic"><Icon name="mail" /></span>
                <span className="li-main"><b>{i.email}</b><small>{label(i.role)} · caduca el {fecha(i.expires)}</small></span>
                <button type="button" className="btn btn-3 btn-xs" onClick={() => start(async () => { await revocarInvitacion(i.id); toast("Invitación anulada"); })}>Anular</button>
              </div>))}</div>
          </section>
        ) : null}
      </div>
      <div className="stack">
        <section className="card" aria-labelledby="h-nueva">
          <div className="card-h"><h2 className="h3" id="h-nueva">Invitar a alguien</h2></div>
          <div className="fld"><label htmlFor="iv-e">Email</label><input id="iv-e" className="inp" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@restaurante.com" /></div>
          <div className="opts" role="radiogroup" aria-label="Rol">
            {roles.map((r) => <button key={r.id} type="button" role="radio" aria-checked={role === r.id} className={`opt ${role === r.id ? "is-on" : ""}`} onClick={() => setRole(r.id)}><span className="opt-r" /><span className="opt-t"><b>{r.label}</b><small>{r.desc}</small></span></button>)}
          </div>
          <button type="button" className="btn btn-sm" disabled={pending || !email.includes("@")} onClick={() => start(async () => {
            const r = await invitar(email, role);
            if (r.ok) { if (r.data!.enviado) toast(r.msg ?? "Enviada"); else toastError(r.msg ?? "No hemos podido enviar el email."); setLink({ url: r.data!.link, enviado: r.data!.enviado }); setEmail(""); } else toastError(r.error);
          })}>{pending ? <span className="spin" /> : <Icon name="mail" size={18} />} Enviar invitación</button>
          {link ? <div className={`note ${link.enviado ? "note-ok" : "note-warn"}`}><Icon name={link.enviado ? "check" : "info"} /><p>{link.enviado ? "Le hemos enviado un email. También puedes pasarle el enlace: " : "No hemos podido enviarle el email. Pásale tú el enlace: "}<button type="button" className="link" onClick={() => navigator.clipboard?.writeText(link.url).then(() => toast("Enlace copiado"))}>copiar enlace</button>. Caduca en 7 días.</p></div> : null}
        </section>
      </div>
    </div>
  );
}
