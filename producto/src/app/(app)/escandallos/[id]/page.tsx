import { notFound } from "next/navigation";
import { all, isUuid, one, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { getCatalog } from "@/server/queries/catalog";
import { buildContext, loadArticulos, loadLineas, loadRecetas } from "@/server/domain/costs";
import { fotoUrl } from "@/lib/fotos";
import type { LineUnit } from "@/lib/units";
import { Ficha, type FichaArt, type FichaRec } from "./ficha";

export const metadata = { title: "Escandallo" };

export default async function EscandalloPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApp();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { cats, items } = await getCatalog();
  const data = await withTenant(ctx.tenantId, async (c) => {
    // Secuencial: una sola conexión (transacción) no admite consultas en paralelo
  const arts = await loadArticulos(c, ctx.local.id);
  const recs = await loadRecetas(c, ctx.local.id);
  const lins = await loadLineas(c, ctx.local.id);
    const r = recs.find((x) => x.id === id);
    if (!r) return null;
    const own = await all<{ articulo_id: string | null; subreceta_id: string | null; cantidad: number; unidad: LineUnit }>(c, "select articulo_id, subreceta_id, cantidad, unidad from receta_lineas where receta_id = $1 order by idx", [id]);
    const exists = await one(c, "select 1 from recetas where id = $1 and local_id = $2 and not archived", [id, ctx.local.id]);
    return exists ? { arts, recs, lins, r, own } : null;
  });
  if (!data) notFound();
  const { r } = data;
  const cc = buildContext(data.arts, data.recs, data.lins);
  const arts: FichaArt[] = data.arts.map((a) => ({ ...cc.arts.get(a.id)!, categoryId: a.category_id, aliases: a.aliases, catalogId: a.catalog_item_id }));
  const recetas: FichaRec[] = data.recs.map((x) => ({ ...cc.recetas.get(x.id)!, familia: x.familia }));
  return (
    <Ficha id={r.id} tipo={r.tipo} reventa={r.reventa} fotoUrl={fotoUrl(r.foto_key)} iva={ctx.local.iva_venta} fcLocal={ctx.local.fc_objetivo}
      canPrecios={hasPerm(ctx, "carta:precios")} canArts={hasPerm(ctx, "compras")} canVentas={hasPerm(ctx, "ventas")}
      initial={{
        name: r.name, familia: r.familia, raciones: r.raciones, rinde: r.rinde, rindeUnit: r.rinde_unit, pvp: r.pvp, fcObjetivo: r.fc_objetivo, ventasMes: r.ventas_mes,
        enCarta: r.en_carta, estado: r.estado, descripcion: r.descripcion, notas: r.notas, costeManual: r.coste_manual, margenObjetivo: r.margen_objetivo,
        lineas: data.own.map((l) => ({ articuloId: l.articulo_id, subrecetaId: l.subreceta_id, cantidad: l.cantidad, unidad: l.unidad })),
      }}
      arts={arts} recetas={recetas}
      catalog={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, rend: i.rend, categoryId: i.category_id, aliases: i.aliases }))}
      cats={cats.map((c) => ({ id: c.id, name: c.name }))} />
  );
}
