import { TaskScreen } from "@/components/shell/task-screen";
import { requireApp, hasPerm } from "@/server/ctx";
import { withTenant } from "@/server/db";
import { plantillasConCoste } from "@/server/queries/plantillas";
import { NuevaReceta } from "./form";

export const metadata = { title: "Nuevo" };

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ tipo?: string; plantilla?: string; nombre?: string; familia?: string; pvp?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const tpls = await withTenant(ctx.tenantId, (c) => plantillasConCoste(c, ctx.local.id));
  const tipo = sp.tipo === "elaboracion" ? "elaboracion" : sp.tipo === "reventa" ? "reventa" : sp.tipo === "menu" ? "menu" : "plato";
  return (
    <TaskScreen title={tipo === "elaboracion" ? "Nueva elaboración" : "Nuevo producto"} back={tipo === "elaboracion" ? "/escandallos/elaboraciones" : "/escandallos"}>
      <NuevaReceta tipoInicial={tipo} plantilla={sp.plantilla ?? null} tpls={tpls} iva={ctx.local.iva_venta} canPrecios={hasPerm(ctx, "carta:precios")}
        nombre={sp.nombre ?? ""} familia={sp.familia ?? ""} pvp={sp.pvp ? Number(sp.pvp) : null} />
    </TaskScreen>
  );
}
