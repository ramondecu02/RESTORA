import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { hasPerm, requireApp } from "@/server/ctx";
import { preciosConfigurados, stripeOn } from "@/server/billing";
import { planDe } from "@/lib/planes";
import { bloqueado, DIAS_DE_GRACIA } from "@/server/plan";
import { CONTACTO_EMAIL, CONTACTO_TEL, CONTACTO_WHATSAPP } from "@/lib/contacto";
import { Pagar } from "../../(app)/cuenta/facturacion/pagar";
import { salir } from "../actions";

export const metadata = { title: "Acceso bloqueado" };

// Adónde llega cualquier pantalla de la app cuando terminó la prueba sin suscripción, se canceló o lleva 5 días de impago: pagar, sacar los datos o salir
export default async function Bloqueado() {
  const ctx = await requireApp({ permitirBloqueo: true });
  if (!bloqueado(ctx.org)) redirect("/hoy");
  const cancelada = ctx.org.planStatus === "canceled";
  const impago = ctx.org.planStatus === "past_due";
  return (
    <>
      <span className="mailic"><Icon name="lock" size={28} /></span>
      <div className="auth-head">
        <h1>{impago ? "No hemos podido cobrar tu suscripción" : cancelada ? "Tu suscripción está cancelada" : "Tu prueba gratuita ha terminado"}</h1>
        <p>{impago
          ? <>Han pasado {DIAS_DE_GRACIA} días sin poder cobrar. Actualiza el pago y recuperas el acceso a <b>{ctx.org.name}</b> al momento. Tus datos siguen guardados: albaranes, precios, escandallos y carta.</>
          : <>Suscríbete para seguir usando RESTORA en <b>{ctx.org.name}</b>. Tus datos siguen guardados: albaranes, precios, escandallos y carta.</>}</p>
      </div>
      {!hasPerm(ctx, "facturacion") ? (
        <div className="note"><Icon name="info" /><p>Avisa a quien lleva la cuenta de {ctx.org.name} para que active la suscripción.</p></div>
      ) : stripeOn() ? (
        <Pagar activo={impago} tieneCliente={!!ctx.org.stripeCustomerId} disponibles={preciosConfigurados()} actual={planDe(ctx.org)?.tier ?? null} intervaloActual={ctx.org.planInterval} />
      ) : (
        <div className="stack-sm">
          <p className="muted small">{impago ? "Para actualizar el pago, escríbenos y lo resolvemos en el día." : "Para activar tu suscripción, escríbenos y la dejamos lista en el día."}</p>
          <a className="btn btn-block" href={CONTACTO_WHATSAPP} target="_blank" rel="noopener"><Icon name="whatsapp" size={18} /> WhatsApp · {CONTACTO_TEL}</a>
          <a className="btn btn-2 btn-block" href={`mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(`Activar suscripción · ${ctx.org.name}`)}`}><Icon name="mail" size={18} /> {CONTACTO_EMAIL}</a>
        </div>
      )}
      <div className="stack-sm center">
        <Link className="linkbtn" href="/cuenta" style={{ justifyContent: "center" }}><Icon name="download" size={18} /> Descargar mis datos</Link>
        <form action={salir}><button className="linkbtn" type="submit" style={{ justifyContent: "center", width: "100%" }}><Icon name="logout" size={18} /> Salir</button></form>
      </div>
    </>
  );
}
