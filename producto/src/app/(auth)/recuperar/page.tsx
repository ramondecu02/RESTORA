import Link from "next/link";
import { Icon } from "@/components/icons";
import { RecuperarForm } from "../forms";

export const metadata = { title: "Recuperar contraseña" };

export default async function Recuperar({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <Link className="linkbtn" href="/entrar"><Icon name="back" /> Volver</Link>
      <div className="auth-head"><h1>¿Has olvidado la contraseña?</h1><p>Te enviamos un código de 6 cifras para crear una nueva.</p></div>
      <RecuperarForm email={sp.email} />
    </>
  );
}
