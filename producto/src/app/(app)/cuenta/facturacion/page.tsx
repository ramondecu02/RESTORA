import { redirect } from "next/navigation";
import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { requireApp, hasPerm } from "@/server/ctx";
import { stripeOn } from "@/server/billing";
import { fecha } from "@/lib/format";
import { Pagar } from "./pagar";

export const metadata = { title: "Facturación" };
const diasHasta = (d: string | Date | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 864e5) : null);
const ESTADO: Record<string, [string, string]> = { trial: ["Prueba gratuita", "tag-warn"], active: ["Suscripción activa", "tag-ok"], past_due: ["Pago pendiente", "tag-bad"], canceled: ["Suscripción cancelada", "tag-bad"] };

export default async function Facturacion({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "facturacion")) redirect("/cuenta");
  const sp = await searchParams;
  const st = ctx.org.planStatus;
  const dias = diasHasta(ctx.org.trialEndsAt);
  const [label, cls] = ESTADO[st] ?? [st, "tag"];
  return (
    <Screen title="Facturación" sub="Tu plan y tus pagos" back="/cuenta">
      {sp.ok ? <div className="note note-ok"><Icon name="check" /><p>¡Gracias! Tu suscripción está en marcha. Puede tardar unos segundos en aparecer como activa.</p></div> : null}
      <section className="card">
        <div className="card-h"><h2 className="h3">Tu plan</h2><span className={`tag ${cls}`}>{label}</span></div>
        {st === "trial" ? <p>{dias != null && dias > 0 ? `Te quedan ${dias} días de prueba (hasta el ${fecha(ctx.org.trialEndsAt, { day: "numeric", month: "long" })}).` : "Tu prueba ha terminado. Suscríbete para seguir subiendo albaranes."} Tienes acceso completo durante la prueba.</p> : null}
        {st === "active" ? <p>Todo en orden. Puedes cambiar la tarjeta, descargar facturas o cancelar desde el portal de pagos.</p> : null}
        {st === "past_due" ? <p>No hemos podido cobrar el último recibo. Actualiza la tarjeta para no perder el acceso.</p> : null}
        {st === "canceled" ? <p>Tu suscripción está cancelada. Tus datos siguen aquí: suscríbete de nuevo cuando quieras.</p> : null}
        {stripeOn() ? <Pagar activo={st === "active" || st === "past_due"} tieneCliente={!!ctx.org.stripeCustomerId} />
          : <div className="note"><Icon name="info" /><p>Los pagos todavía no están activados en esta instalación. Quien la administre debe configurar STRIPE_SECRET_KEY, STRIPE_PRICE_ID y STRIPE_WEBHOOK_SECRET (ver la guía de despliegue).</p></div>}
      </section>
      <section className="card">
        <div className="card-h"><h2 className="h3">Qué incluye</h2></div>
        <ul className="stack-sm small">
          <li className="row"><Icon name="check" size={18} /> Lectura automática de albaranes y facturas, sin límite razonable de uso</li>
          <li className="row"><Icon name="check" size={18} /> Escandallos, carta, inventario, ventas y avisos</li>
          <li className="row"><Icon name="check" size={18} /> Todo el equipo del local, con sus roles</li>
          <li className="row"><Icon name="check" size={18} /> Tus datos se pueden exportar y borrar cuando quieras</li>
        </ul>
      </section>
    </Screen>
  );
}
