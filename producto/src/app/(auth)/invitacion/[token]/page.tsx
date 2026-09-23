import Link from "next/link";
import { Icon } from "@/components/icons";
import { getSession } from "@/server/session";
import { one, sys } from "@/server/db";
import { ROLE_LABEL, isRole } from "@/server/rbac";
import { aceptarInvitacion } from "../actions";
import { findInvitation } from "@/server/queries/invitations";
import { InvitacionNuevoForm } from "./form";
import { salir } from "../../actions";

export const metadata = { title: "Invitación" };

export default async function Invitacion({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await findInvitation(token);
  if (!inv) {
    return (
      <>
        <span className="mailic"><Icon name="alert" size={28} /></span>
        <div className="auth-head"><h1>Esta invitación ya no es válida</h1><p>Puede que haya caducado o que ya se haya usado. Pide a quien te invitó que te envíe una nueva.</p></div>
        <Link className="btn btn-block" href="/entrar">Ir a entrar</Link>
      </>
    );
  }
  const role = isRole(inv.role) ? ROLE_LABEL[inv.role] : inv.role;
  const s = await getSession();
  const head = <div className="auth-head"><h1>Únete a {inv.org_name}</h1><p>Te han invitado con el rol «{role}».</p></div>;
  if (s) {
    if (s.email.toLowerCase() === inv.email.toLowerCase()) {
      return (
        <>
          {head}
          <form action={aceptarInvitacion.bind(null, token)}><button className="btn btn-block" type="submit">Aceptar e ir a {inv.org_name}</button></form>
        </>
      );
    }
    return (
      <>
        {head}
        <div className="note note-warn"><Icon name="alert" /><p>Has entrado como <b>{s.email}</b>, pero la invitación es para <b>{inv.email}</b>.</p></div>
        <form action={salir}><button className="btn btn-2 btn-block" type="submit">Salir y entrar con {inv.email}</button></form>
      </>
    );
  }
  const exists = await sys((c) => one(c, "select 1 from users where lower(email) = lower($1)", [inv.email]));
  if (exists) {
    return (
      <>
        {head}
        <p className="muted">Ya tienes cuenta con <b>{inv.email}</b>. Entra para aceptar la invitación.</p>
        <Link className="btn btn-block" href={`/entrar?next=${encodeURIComponent("/invitacion/" + token)}&email=${encodeURIComponent(inv.email)}`}>Entrar y aceptar</Link>
      </>
    );
  }
  return (
    <>
      {head}
      <InvitacionNuevoForm token={token} email={inv.email} />
    </>
  );
}
