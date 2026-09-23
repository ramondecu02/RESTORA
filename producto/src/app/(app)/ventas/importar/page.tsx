import { redirect } from "next/navigation";
import { TaskScreen } from "@/components/shell/task-screen";
import { all, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { Importador } from "./wizard";

export const metadata = { title: "Importar ventas" };

export default async function Importar() {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "ventas")) redirect("/hoy");
  const data = await withTenant(ctx.tenantId, async (c) => ({
    recetas: await all<{ id: string; name: string; pvp: number | null; familia: string }>(c, "select id, name, pvp, familia from recetas where local_id = $1 and not archived and tipo <> 'elaboracion' order by name", [ctx.local.id]),
    alias: await all<{ nombre_norm: string; receta_id: string }>(c, "select nombre_norm, receta_id from ventas_alias where local_id = $1", [ctx.local.id]),
    tracked: (await all<{ n: number }>(c, "select count(*)::int as n from articulos where local_id = $1 and track_stock", [ctx.local.id]))[0]?.n ?? 0,
  }));
  return (
    <TaskScreen title="Importar ventas" back="/ventas">
      <Importador recetas={data.recetas} alias={Object.fromEntries(data.alias.map((a) => [a.nombre_norm, a.receta_id]))} tracked={data.tracked > 0} />
    </TaskScreen>
  );
}
