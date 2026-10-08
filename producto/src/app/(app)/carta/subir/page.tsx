import Link from "next/link";
import { Icon } from "@/components/icons";
import { avisoCupo } from "@/lib/planes";
import { TaskScreen } from "@/components/shell/task-screen";
import { TopeLecturas } from "@/components/tope-lecturas";
import { Uploader } from "@/components/uploader";
import { requireApp } from "@/server/ctx";
import { topeDeLecturas } from "@/server/ratelimit";

export const metadata = { title: "Subir carta" };

export default async function SubirCarta() {
  const ctx = await requireApp();
  // Con el tope mensual de lecturas alcanzado no se ofrece subir nada (la API tampoco lo aceptaría): los platos se pueden crear a mano
  const tope = await topeDeLecturas(ctx.tenantId, ctx.org);
  if (tope.agotado) return <TaskScreen title="Subir la carta" back="/carta"><TopeLecturas mensaje={tope.mensaje} alternativa={{ href: "/escandallos/nuevo", texto: "Crear un plato a mano" }} cambiarPlan /></TaskScreen>;
  return (
    <TaskScreen title="Subir la carta" back="/carta">
      {tope.casi ? <div className="note note-warn" role="status"><Icon name="alert" /><p>{avisoCupo(tope.usadas, tope.max)} <Link className="link" href="/cuenta/facturacion">Ver planes</Link></p></div> : null}
      <Uploader kind="carta" cta="Leer carta" sample={[{ url: "/demo/carta-ejemplo.jpg", name: "carta-ejemplo.jpg", title: "Probar con una carta de ejemplo", sub: "7 platos y bebidas con precio" }]} />
    </TaskScreen>
  );
}
