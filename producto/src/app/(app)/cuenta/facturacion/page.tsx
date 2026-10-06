import { redirect } from "next/navigation";
import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { requireApp, hasPerm } from "@/server/ctx";
import { stripeOn } from "@/server/billing";
import { diasDeGracia } from "@/server/plan";
import { env } from "@/server/env";
import { fecha, num } from "@/lib/format";
import { CONTACTO_EMAIL, CONTACTO_TEL, CONTACTO_WHATSAPP } from "@/lib/contacto";
import { Pagar } from "./pagar";

export const metadata = { title: "Facturación" };
const diasHasta = (d: string | Date | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 864e5) : null);
const ESTADO: Record<string, [string, string]> = { trial: ["Prueba gratuita", "tag-warn"], active: ["Suscripción activa", "tag-ok"], past_due: ["Pago pendiente", "tag-bad"], canceled: ["Suscripción cancelada", "tag-bad"] };

export default async function Facturacion({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const ctx = await requireApp({ permitirBloqueo: true });
  if (!hasPerm(ctx, "facturacion")) redirect("/cuenta");
  const sp = await searchParams;
  const st = ctx.org.planStatus;
  const dias = diasHasta(ctx.org.trialEndsAt);
  const gracia = diasDeGracia(ctx.org);
  const [label, cls] = ESTADO[st] ?? [st, "tag"];
  // Lo que de verdad se aplica: el tope mensual de lecturas con IA (MAX_LECTURAS_MES). Los límites por plan llegarán con los planes (D1)
  const tope = env.maxLecturasMes;
  return (
    <Screen title="Facturación" sub="Tu plan y tus pagos" back="/cuenta">
      {sp.ok ? <div className="note note-ok"><Icon name="check" /><p>¡Gracias! Tu suscripción está en marcha. Puede tardar unos segundos en aparecer como activa.</p></div> : null}
      <section className="card">
        <div className="card-h"><h2 className="h3">Tu plan</h2><span className={`tag ${cls}`}>{label}</span></div>
        {st === "trial" ? <p>{dias != null && dias > 0 ? `Te quedan ${dias} días de prueba (hasta el ${fecha(ctx.org.trialEndsAt, { day: "numeric", month: "long" })}). Tienes acceso completo durante la prueba.` : "Tu prueba ha terminado. Suscríbete para seguir usando RESTORA: tus datos siguen guardados."}</p> : null}
        {st === "active" ? <p>Todo en orden. Puedes cambiar la tarjeta, descargar facturas o cancelar desde el portal de pagos.</p> : null}
        {st === "past_due" ? <p>No hemos podido cobrar el último recibo. {gracia != null && gracia > 0 ? `Tienes ${gracia} ${gracia === 1 ? "día" : "días"} para actualizar la tarjeta antes de que se bloquee el acceso.` : "Actualiza la tarjeta para no perder el acceso."}</p> : null}
        {st === "canceled" ? <p>Tu suscripción está cancelada. Tus datos siguen aquí: suscríbete de nuevo cuando quieras.</p> : null}
        {stripeOn() ? <Pagar activo={st === "active" || st === "past_due"} tieneCliente={!!ctx.org.stripeCustomerId} />
          : <div className="note"><Icon name="info" /><p>Para activar tu suscripción, escríbenos por <a className="link" href={CONTACTO_WHATSAPP} target="_blank" rel="noopener">WhatsApp al {CONTACTO_TEL}</a> o a <a className="link" href={`mailto:${CONTACTO_EMAIL}`}>{CONTACTO_EMAIL}</a> y la dejamos lista en el día.</p></div>}
      </section>
      <section className="card">
        <div className="card-h"><h2 className="h3">Qué incluye</h2></div>
        <ul className="stack-sm small">
          <li className="row"><Icon name="check" size={18} /> {tope > 0 ? `Lectura automática de albaranes y facturas, hasta ${num(tope, 0)} al mes` : "Lectura automática de albaranes y facturas: ahora mismo desactivada"}</li>
          <li className="row"><Icon name="check" size={18} /> Escandallos, carta, inventario, ventas y avisos</li>
          <li className="row"><Icon name="check" size={18} /> Todo el equipo del local, con sus roles</li>
          <li className="row"><Icon name="check" size={18} /> Tus datos se pueden exportar y borrar cuando quieras</li>
        </ul>
      </section>
    </Screen>
  );
}
