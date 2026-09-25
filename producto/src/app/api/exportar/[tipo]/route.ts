// Exportación de los datos del negocio en CSV para Excel (separador «;», coma decimal y BOM UTF-8).
import { NextResponse, type NextRequest } from "next/server";
import { getAppCtx } from "@/server/ctx";
import { all, withTenant } from "@/server/db";
import { can, type Perm } from "@/server/rbac";
import { getCatalog } from "@/server/queries/catalog";
import { dishStats } from "@/server/domain/carta";
import { loadArticulos, toArtCost } from "@/server/domain/costs";
import { costeBase, foodCost, recetaCost } from "@/lib/costing";
import { isoDate } from "@/lib/format";
import { cell, csv, type Cell } from "@/lib/csv-export";

const TIPOS: Record<string, Perm> = { articulos: "compras", proveedores: "compras", compras: "compras", escandallos: "escandallos", ventas: "ventas" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const ctx = await getAppCtx();
  if (!ctx) return NextResponse.json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, { status: 401 });
  const { tipo } = await params;
  // Solo claves propias: «constructor» o «toString» no son exportaciones
  const perm = Object.hasOwn(TIPOS, tipo) ? TIPOS[tipo] : undefined;
  if (!perm) return NextResponse.json({ error: "No existe esa exportación." }, { status: 404 });
  if (!can(ctx.role, perm)) return NextResponse.json({ error: "Tu rol no permite exportar estos datos." }, { status: 403 });
  const L = ctx.local.id;
  const { cats } = await getCatalog();
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  const rows = await withTenant(ctx.tenantId, async (c): Promise<Cell[][]> => {
    if (tipo === "articulos") {
      const a = await loadArticulos(c, L);
      const provs = new Map((await all<{ id: string; name: string }>(c, "select id, name from proveedores where local_id = $1", [L])).map((p) => [p.id, p.name]));
      return [["Artículo", "Tipo", "Unidad", "Precio (€/unidad, sin IVA)", "Precio medio ponderado", "Último precio", "Última compra", "Proveedor", "IVA %", "Aprovechable %", "Stock", "Mínimo", "Consumo semanal"],
        ...a.map((x) => [x.name, catName.get(x.category_id) ?? "", x.unit, costeBase(toArtCost(x)), x.pmp, x.last_price, x.last_purchase_at ? isoDate(new Date(x.last_purchase_at)) : "",
          provs.get(x.proveedor_pref_id ?? x.last_proveedor_id ?? "") ?? "", x.iva, x.rend, x.stock, x.stock_min, x.consumo_semanal])];
    }
    if (tipo === "proveedores") {
      const p = await all<Record<string, string>>(c, "select name, empresa, cif, tipo, responsable, phone, email, direccion, entrega, notas from proveedores where local_id = $1 and not archived order by name", [L]);
      return [["Proveedor", "Empresa", "CIF", "Qué vende", "Contacto", "Teléfono", "Email", "Dirección", "Entrega", "Notas"],
        ...p.map((x) => [x.name, x.empresa, x.cif, x.tipo, x.responsable, x.phone, x.email, x.direccion, x.entrega, x.notas])];
    }
    if (tipo === "compras") {
      const l = await all<{ fecha: string; proveedor: string | null; numero: string | null; kind: string; articulo: string | null; texto: string; cantidad: number; unidad_compra: string; factor: number; precio: number; descuento: number; importe: number; iva: number | null; coste_unit: number | null; unit: string | null }>(c, `
        select d.fecha, p.name as proveedor, d.numero, d.kind, a.name as articulo, cl.texto, cl.cantidad, cl.unidad_compra, cl.factor, cl.precio, cl.descuento, cl.importe, cl.iva, cl.coste_unit, a.unit
        from compra_lineas cl join documentos d on d.id = cl.documento_id left join proveedores p on p.id = d.proveedor_id left join articulos a on a.id = cl.articulo_id
        where d.local_id = $1 and d.status = 'guardado' order by d.fecha desc, d.numero, cl.idx`, [L]);
      return [["Fecha", "Proveedor", "Número", "Documento", "Artículo", "Texto del albarán", "Cantidad", "Unidad de compra", "Unidades por compra", "Precio (sin IVA)", "Descuento %", "Importe (sin IVA)", "IVA %", "Coste por unidad", "Unidad"],
        ...l.map((x) => [x.fecha, x.proveedor, x.numero, x.kind === "factura" ? "Factura" : "Albarán", x.articulo, x.texto, x.cantidad, x.unidad_compra, x.factor, x.precio, x.descuento, x.importe, x.iva, x.coste_unit, x.unit])];
    }
    if (tipo === "escandallos") {
      const { stats, ctx: cc } = await dishStats(c, ctx.local);
      const st = new Map(stats.map((s) => [s.id, s]));
      const r = await all<{ id: string; name: string; tipo: string; familia: string; raciones: number; rinde: number; rinde_unit: string; ingrediente: string | null; cantidad: number | null; unidad: string | null }>(c, `
        select r.id, r.name, r.tipo, r.familia, r.raciones, r.rinde, r.rinde_unit, coalesce(a.name, s.name) as ingrediente, l.cantidad, l.unidad
        from recetas r left join receta_lineas l on l.receta_id = r.id left join articulos a on a.id = l.articulo_id left join recetas s on s.id = l.subreceta_id
        where r.local_id = $1 and not r.archived order by r.tipo, r.name, l.idx`, [L]);
      return [["Receta", "Tipo", "Familia", "Raciones o rinde", "PVP (con IVA)", "Coste por ración (o por kg/L/ud de elaboración)", "Food cost %", "Ingrediente", "Cantidad", "Unidad"],
        ...r.map((x) => {
          const s = st.get(x.id);
          const fc = s ? foodCost(s.coste, s.pvp, ctx.local.iva_venta) : null;
          const elab = x.tipo === "elaboracion";
          return [x.name, elab ? "Elaboración" : x.tipo === "menu" ? "Menú" : "Plato", x.familia, elab ? `${cell(x.rinde)} ${x.rinde_unit}` : x.raciones,
            s?.pvp ?? null, elab ? recetaCost(x.id, cc).perUnit : s?.coste ?? null, fc != null ? fc * 100 : null, x.ingrediente, x.cantidad, x.unidad];
        })];
    }
    const v = await all<{ fecha: string; nombre: string; receta: string | null; unidades: number; importe: number; neto: number; coste_total: number | null }>(c, `
      select v.fecha, v.nombre, r.name as receta, v.unidades, v.importe, v.neto, v.coste_total from ventas_lineas v left join recetas r on r.id = v.receta_id
      where v.local_id = $1 order by v.fecha desc, v.nombre`, [L]);
    return [["Fecha", "Producto en el TPV", "Plato", "Unidades", "Importe (con IVA)", "Neto (sin IVA)", "Coste"],
      ...v.map((x) => [x.fecha, x.nombre, x.receta, x.unidades, x.importe, x.neto, x.coste_total])];
  });

  const name = `restora-${tipo}-${isoDate()}.csv`;
  return new NextResponse(csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
