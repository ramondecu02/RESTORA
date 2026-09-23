import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { RegistroForm } from "../forms";

export const metadata = { title: "Crea tu cuenta" };

export default async function Registro() {
  const s = await getSession();
  if (s) redirect(s.verified ? "/hoy" : "/verificar");
  return (
    <>
      <div className="auth-head"><h1>Crea tu cuenta</h1><p>Tus albaranes, leídos. Tus platos, con su coste real. Sin tarjeta.</p></div>
      <RegistroForm />
      <p className="auth-alt"><span>¿Ya tienes cuenta?</span><Link className="link" href="/entrar">Entrar</Link></p>
    </>
  );
}
