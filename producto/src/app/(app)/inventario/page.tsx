import Link from "next/link";
import { Screen } from "@/components/shell/screen";
import { ComprasNav } from "@/components/subnav";
import { Icon } from "@/components/icons";
import { all, one, withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { getCatalog, KIND_LABEL } from "@/server/queries/catalog";
import { toArtCost, type ArtRow } from "@/server/domain/costs";
import { costeBase } from "@/lib/costing";
import { norm } from "@/lib/fuzzy";
import { InvTable } from "./table";

export const metadata = { title: "Inventario" };

export default async function Inventario() {
  const ctx = await requireApp();
  const { cats, items } = await getCatalog();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const arts = await all<ArtRow & { proveedor: string | null; proveedor_id: string | null; phone: string; email: string }>(c, `
      select a.id, a.name, a.unit, a.rend, a.pmp, a.last_price, a.last_purchase_at, a.precio_manual, a.precio_manual_at, a.category_id, a.iva, a.stock, a.stock_min,
        a.consumo_semanal, a.track_stock, a.last_proveedor_id, a.proveedor_pref_id, a.catalog_item_id, a.aliases, a.demo, a.foto_key,
        p.name as proveedor, p.id as proveedor_id, coalesce(p.phone, '') as phone, coalesce(p.email, '') as email
      from articulos a left join proveedores p on p.id = coalesce(a.proveedor_pref_id, a.last_proveedor_id)
      where a.local_id = $1 and not a.archived order by a.name`, [ctx.local.id]);
    // Abiertos: los registrados como factura cuentan como recibidos cuando esa factura está guardada
    const pedidos = (await one<{ n: number }>(c, `select count(*)::int as n from pedidos pe left join documentos d on d.id = pe.documento_id
      where pe.local_id = $1 and pe.estado in ('borrador','enviado') and d.status is distinct from 'guardado'`, [ctx.local.id]))?.n ?? 0;
    return { arts, pedidos };
  });
  const catInfo = new Map(cats.map((c) => [c.id, c]));
  const rows = data.arts.filter((a) => a.track_stock).map((a) => ({
    id: a.id, name: a.name, unit: a.unit, stock: a.stock, minimo: a.stock_min, consumo: a.consumo_semanal, precio: costeBase(toArtCost(a)),
    categoryId: a.category_id, categoria: catInfo.get(a.category_id)?.name ?? "Otros", grupo: KIND_LABEL[catInfo.get(a.category_id)?.kind ?? "otros"],
    orden: catInfo.get(a.category_id)?.orden ?? 99, proveedor: a.proveedor, proveedorId: a.proveedor_id, phone: a.phone, email: a.email,
  }));
  const untracked = data.arts.filter((a) => !a.track_stock).map((a) => ({ id: a.id, name: a.name, unit: a.unit, categoryId: a.category_id, aliases: a.aliases, stock: a.stock, minimo: a.stock_min, consumo: a.consumo_semanal }));
  // Del catálogo solo lo que aún no es un artículo tuyo (por enlace o por nombre): lo que ya tienes sale en «Tus artículos» o ya está en el almacén
  const ligados = new Set(data.arts.map((a) => a.catalog_item_id).filter(Boolean));
  const nombres = new Set(data.arts.map((a) => norm(a.name)));
  const catalog = items.filter((i) => !ligados.has(i.id) && !nombres.has(norm(i.name)));
  return (
    <Screen title="Inventario" sub="Stock, consumo y días de cobertura" fab
      actions={<Link className="btn btn-2 btn-sm only-wide" href="/inventario/pedidos"><Icon name="cart" size={18} /> Pedidos{data.pedidos ? ` (${data.pedidos})` : ""}</Link>}>
      <ComprasNav cur="inventario" />
      <InvTable rows={rows} untracked={untracked} local={ctx.local.name}
        catalog={catalog.map((i) => ({ id: i.id, name: i.name, unit: i.unit, categoryId: i.category_id, aliases: i.aliases }))}
        cats={cats.map((c) => ({ id: c.id, name: c.name }))} pedidos={data.pedidos} />
    </Screen>
  );
}
