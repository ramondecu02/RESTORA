import { redirect } from "next/navigation";
import { TaskScreen } from "@/components/shell/task-screen";
import { all, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { NuevaManual } from "./form";

export const metadata = { title: "Compra a mano" };

export default async function Nueva() {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "compras")) redirect("/compras");
  const provs = await withTenant(ctx.tenantId, (c) => all<{ id: string; name: string }>(c, "select id, name from proveedores where local_id = $1 and not archived order by name", [ctx.local.id]));
  return (
    <TaskScreen title="Apuntar una compra a mano" back="/compras">
      <NuevaManual provs={provs} />
    </TaskScreen>
  );
}
