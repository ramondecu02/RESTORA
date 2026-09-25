import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { safeNext } from "@/lib/nav";
import { VerificarForm } from "../forms";
import { salir } from "../actions";

export const metadata = { title: "Confirma tu email" };

export default async function Verificar({ searchParams }: { searchParams: Promise<{ cambiado?: string; next?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/entrar");
  const sp = await searchParams;
  const next = sp.next ? safeNext(sp.next) : undefined;
  if (s.verified) redirect(next ?? "/hoy");
  return (
    <>
      <VerificarForm email={s.email} changed={sp.cambiado === "1"} next={next} />
      <form action={salir} className="auth-alt"><button className="link" type="submit">Salir y entrar con otra cuenta</button></form>
    </>
  );
}
