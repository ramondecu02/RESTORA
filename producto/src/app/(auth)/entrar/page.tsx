import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { EntrarForm } from "../forms";
import { safeNext } from "@/lib/nav";

export const metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s?.verified) redirect(safeNext(sp.next));
  return (
    <>
      <div className="auth-head"><h1>Entra en tu cocina</h1><p>Con el email y la contraseña de tu cuenta.</p></div>
      <EntrarForm next={sp.next} email={sp.email} />
      <Link className="linkbtn" href="/recuperar">¿Has olvidado la contraseña?</Link>
      <p className="auth-alt"><span>¿Nuevo en RESTORA?</span><Link className="link" href="/registro">Crea tu cuenta</Link></p>
    </>
  );
}
