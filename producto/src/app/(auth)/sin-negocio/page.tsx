import { redirect } from "next/navigation";
import { getOrg } from "@/server/ctx";
import { CrearNegocioForm } from "../forms";
import { salir } from "../actions";

export const metadata = { title: "Sin negocio" };

export default async function SinNegocio() {
  const o = await getOrg();
  if (!o) redirect("/entrar");
  if (o.org) redirect("/hoy");
  return (
    <>
      <div className="auth-head"><h1>No perteneces a ningún negocio</h1><p>Puede que te hayan quitado el acceso. Pide una invitación nueva o crea tu propio negocio.</p></div>
      <CrearNegocioForm />
      <form action={salir} className="auth-alt"><button className="link" type="submit">Salir</button></form>
    </>
  );
}
