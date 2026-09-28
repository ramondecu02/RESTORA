import { redirect } from "next/navigation";
import { requireApp, hasPerm } from "@/server/ctx";
import { all, withTenant } from "@/server/db";
import type { BaseUnit } from "@/lib/units";
import { NuevoPedido } from "./form";

export const metadata = { title: "Nuevo pedido" };

export default async function NuevoPedidoPage({ searchParams }: { searchParams: Promise<{ prov?: string }> }) {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "inventario")) redirect("/inventario/pedidos");
  const sp = await searchParams;
  const data = await withTenant(ctx.tenantId, async (c) => ({
    provs: await all<{ id: string; name: string }>(c, "select id, name from proveedores where local_id = $1 and not archived order by name", [ctx.local.id]),
    arts: await all<{ id: string; name: string; unit: BaseUnit; stock: number; minimo: number | null; consumo: number | null; precio: number | null; proveedorId: string | null }>(c, `
      select id, name, unit, stock::float as stock, stock_min::float as minimo, consumo_semanal::float as consumo,
        coalesce(pmp, last_price, precio_manual)::float as precio, coalesce(proveedor_pref_id, last_proveedor_id)::text as "proveedorId"
      from articulos where local_id = $1 and not archived order by name`, [ctx.local.id]),
  }));
  return <NuevoPedido provs={data.provs} arts={data.arts} provInicial={sp.prov ?? null} />;
}
