import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { RestablecerForm } from "../forms";

export const metadata = { title: "Contraseña nueva" };

export default async function Restablecer({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const sp = await searchParams;
  if (!sp.email) redirect("/recuperar");
  return (
    <>
      <Link className="linkbtn" href="/entrar"><Icon name="back" /> Volver</Link>
      <div className="auth-head"><h1>Crea una contraseña nueva</h1><p>Si <b>{sp.email}</b> tiene cuenta en RESTORA, le hemos enviado un código de 6 cifras. Caduca en 30 minutos.</p></div>
      <RestablecerForm email={sp.email} />
    </>
  );
}
