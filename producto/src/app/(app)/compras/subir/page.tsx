import Link from "next/link";
import { Icon } from "@/components/icons";
import { avisoCupo } from "@/lib/planes";
import { redirect } from "next/navigation";
import { TopeLecturas } from "@/components/tope-lecturas";
import { Uploader } from "@/components/uploader";
import { TaskScreen } from "@/components/shell/task-screen";
import { requireApp, hasPerm } from "@/server/ctx";
import { topeDeLecturas } from "@/server/ratelimit";

export const metadata = { title: "Subir albarán" };

export default async function Subir() {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "compras")) redirect("/compras");
  // Con el tope mensual de lecturas alcanzado no se ofrece subir nada (la API tampoco lo aceptaría): se puede seguir apuntando a mano
  const tope = await topeDeLecturas(ctx.tenantId, ctx.org);
  if (tope.agotado) return <TaskScreen title="Subir albarán" back="/compras"><TopeLecturas mensaje={tope.mensaje} alternativa={{ href: "/compras/nueva", texto: "Apuntar una compra a mano" }} cambiarPlan /></TaskScreen>;
  return (
    <TaskScreen title="Subir albarán" back="/compras">
      {tope.casi ? <div className="note note-warn" role="status"><Icon name="alert" /><p>{avisoCupo(tope.usadas, tope.max)} <Link className="link" href="/cuenta/facturacion">Ver planes</Link></p></div> : null}
      <Uploader kind="albaran" cta="Leer albarán" sample={[
        { url: "/demo/albaran-ejemplo.jpg", name: "albaran-ejemplo.jpg", title: "Probar con un albarán de ejemplo", sub: "Distribuciones Martínez · 12 líneas" },
        { url: "/demo/albaran-gil.jpg", name: "albaran-gil.jpg", title: "Otro de ejemplo, de otro proveedor", sub: "Frutas Hermanos Gil · 5 líneas" },
      ]} />
    </TaskScreen>
  );
}
