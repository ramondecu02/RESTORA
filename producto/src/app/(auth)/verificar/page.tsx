import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { VerificarForm } from "../forms";
import { salir } from "../actions";

export const metadata = { title: "Confirma tu email" };

export default async function Verificar({ searchParams }: { searchParams: Promise<{ cambiado?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/entrar");
  if (s.verified) redirect("/hoy");
  const sp = await searchParams;
  return (
    <>
      <VerificarForm email={s.email} changed={sp.cambiado === "1"} />
      <form action={salir} className="auth-alt"><button className="link" type="submit">Salir y entrar con otra cuenta</button></form>
    </>
  );
}
