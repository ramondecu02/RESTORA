// Aviso de que el negocio ha llegado a su tope mensual de lecturas con IA (MAX_LECTURAS_MES): lo que pasa, que apuntar a mano sigue
// funcionando y a quién escribir. Sustituye al formulario de subida mientras dure el tope. Válido en servidor y en cliente.
import Link from "next/link";
import { CONTACTO_EMAIL } from "@/lib/contacto";
import { Icon } from "./icons";

export function TopeLecturas({ mensaje, alternativa }: { mensaje: string; alternativa: { href: string; texto: string } }) {
  // El correo del mensaje se convierte en enlace
  const [antes, despues] = mensaje.split(CONTACTO_EMAIL);
  return (
    <div className="stack" data-tope-lecturas>
      <div className="note note-warn" role="status">
        <Icon name="alert" />
        <p>{antes}{despues === undefined ? null : <><a className="link" href={`mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent("Lecturas de documentos")}`}>{CONTACTO_EMAIL}</a>{despues}</>}</p>
      </div>
      <Link className="btn btn-block" href={alternativa.href}>{alternativa.texto}</Link>
    </div>
  );
}
