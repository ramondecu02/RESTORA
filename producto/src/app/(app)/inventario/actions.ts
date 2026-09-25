"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { all, isUuid, one, withTenant, type Db } from "@/server/db";
import { requireApp, requirePerm, UserError, type AppCtx } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { rebuildArticulo, articuloDesdeCatalogo } from "@/server/domain/articulos";
import { crearManual } from "@/server/domain/compras";
import { costeBase } from "@/lib/costing";
import { toArtCost, type ArtRow } from "@/server/domain/costs";

const TIPOS_SALIDA = ["merma", "desecho", "devolucion", "perdida", "invitacion"] as const;

async function art(c: Db, ctx: AppCtx, id: string, lock = false) {
  if (!isUuid(id)) throw new UserError("Artículo no válido.");
  const a = await one<{ id: string; stock: number }>(c, `select id, stock from articulos where id = $1 and local_id = $2 and not archived${lock ? " for no key update" : ""}`, [id, ctx.local.id]);
  if (!a) throw new UserError("Artículo no encontrado.");
  return a;
}

export async function ajustarStock(id: string, nuevo: number): Promise<Result<{ stock: number }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (!Number.isFinite(nuevo) || nuevo < 0 || nuevo > 1e7) throw new UserError("Stock no válido.");
    const stock = await withTenant(ctx.tenantId, async (c) => {
      const a = await art(c, ctx, id, true);
      const contado = Math.round(nuevo * 1000) / 1000;
      if (contado !== Math.round(a.stock * 1000) / 1000) {
        // Se guarda lo contado, no la diferencia: al rehacer el stock, lo anterior a esta fecha ya está incluido en el recuento
        await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, nota, created_by) values ($1,$2,$3,'recuento',$4,'Recuento',$5)", [ctx.tenantId, ctx.local.id, id, contado, ctx.userId]);
        await rebuildArticulo(c, id);
      }
      return (await one<{ stock: number }>(c, "select stock from articulos where id = $1", [id]))!.stock;
    });
    return { ok: true, data: { stock } };
  });
}

export async function guardarParametro(id: string, campo: "stock_min" | "consumo_semanal", valor: number | null): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (campo !== "stock_min" && campo !== "consumo_semanal") throw new UserError("Campo no válido.");
    if (valor != null && (!Number.isFinite(valor) || valor < 0)) throw new UserError("Valor no válido.");
    await withTenant(ctx.tenantId, async (c) => { await art(c, ctx, id); await c.query(`update articulos set ${campo} = $2 where id = $1`, [id, valor]); });
  });
}

export async function dejarDeControlar(id: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    await withTenant(ctx.tenantId, async (c) => { await art(c, ctx, id); await c.query("update articulos set track_stock = false where id = $1", [id]); });
    refresh();
    return { ok: true, msg: "Referencia quitada del inventario" };
  });
}

export async function anadirReferencia(input: { tipo: "tuyo" | "catalogo"; id: string; stock: number | null; minimo: number | null; consumo: number | null }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    await withTenant(ctx.tenantId, async (c) => {
      const id = input.tipo === "catalogo" ? await articuloDesdeCatalogo(c, ctx.tenantId, ctx.local.id, input.id) : (await art(c, ctx, input.id)).id;
      await c.query("update articulos set track_stock = true, stock_min = $2, consumo_semanal = $3 where id = $1", [id, input.minimo, input.consumo]);
      if (input.stock != null) {
        const a = await art(c, ctx, id);
        const diff = input.stock - a.stock;
        if (diff) {
          await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, nota, created_by) values ($1,$2,$3,'inicial',$4,'Stock inicial',$5)", [ctx.tenantId, ctx.local.id, id, diff, ctx.userId]);
          await rebuildArticulo(c, id);
        }
      }
    });
    refresh();
    return { ok: true, msg: "Añadido al inventario" };
  });
}

export async function registrarSalida(input: { id: string; cantidad: number; tipo: string; nota: string }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (!TIPOS_SALIDA.includes(input.tipo as (typeof TIPOS_SALIDA)[number])) throw new UserError("Elige el motivo.");
    if (!(input.cantidad > 0)) throw new UserError("Pon una cantidad mayor que cero.");
    await withTenant(ctx.tenantId, async (c) => {
      await art(c, ctx, input.id);
      await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, nota, created_by) values ($1,$2,$3,$4,$5,$6,$7)",
        [ctx.tenantId, ctx.local.id, input.id, input.tipo, -input.cantidad, input.nota.slice(0, 200), ctx.userId]);
      await rebuildArticulo(c, input.id);
      await audit(c, ctx.tenantId, ctx.userId, "salida", "articulo", input.id, { tipo: input.tipo, cantidad: input.cantidad });
    });
    refresh();
    return { ok: true, msg: "Salida registrada" };
  });
}

type Linea = { articuloId: string; cantidad: number };
async function crearPedidosTx(c: Db, ctx: AppCtx, lineas: Linea[]) {
  const ids = lineas.filter((l) => isUuid(l.articuloId) && l.cantidad > 0);
  if (!ids.length) throw new UserError("El pedido está vacío.");
  const arts = await all<ArtRow>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock, stock_min, consumo_semanal,
    track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key from articulos where id = any($1::uuid[]) and local_id = $2`, [ids.map((l) => l.articuloId), ctx.local.id]);
  const byProv = new Map<string, Linea[]>();
  for (const l of ids) {
    const a = arts.find((x) => x.id === l.articuloId);
    if (!a) continue;
    const k = a.proveedor_pref_id ?? a.last_proveedor_id ?? "";
    byProv.set(k, [...(byProv.get(k) ?? []), l]);
  }
  const out: string[] = [];
  for (const [prov, ls] of byProv) {
    const p = await one<{ id: string }>(c, "insert into pedidos (tenant_id, local_id, proveedor_id, estado, created_by) values ($1,$2,$3,'borrador',$4) returning id", [ctx.tenantId, ctx.local.id, prov || null, ctx.userId]);
    for (const l of ls) {
      const a = arts.find((x) => x.id === l.articuloId)!;
      await c.query("insert into pedido_lineas (tenant_id, pedido_id, articulo_id, cantidad, unidad, precio_estimado) values ($1,$2,$3,$4,$5,$6)",
        [ctx.tenantId, p!.id, a.id, l.cantidad, a.unit, costeBase(toArtCost(a))]);
    }
    out.push(p!.id);
  }
  return out;
}

export async function guardarPedido(lineas: Linea[]): Promise<Result<{ ids: string[] }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    const ids = await withTenant(ctx.tenantId, (c) => crearPedidosTx(c, ctx, lineas));
    refresh();
    return { ok: true, data: { ids }, msg: ids.length > 1 ? `${ids.length} pedidos preparados, uno por proveedor` : "Pedido preparado" };
  });
}

async function recibirTx(c: Db, ctx: AppCtx, pedidoId: string) {
  const p = await one<{ estado: string }>(c, "select estado from pedidos where id = $1 and local_id = $2 for update", [pedidoId, ctx.local.id]);
  if (!p) throw new UserError("Pedido no encontrado.");
  if (p.estado === "recibido" || p.estado === "cancelado") throw new UserError("Este pedido ya está cerrado.");
  const ls = await all<{ articulo_id: string; cantidad: number; precio_estimado: number | null }>(c, "select articulo_id, cantidad, precio_estimado from pedido_lineas where pedido_id = $1", [pedidoId]);
  for (const l of ls) {
    await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, ref_tipo, ref_id, nota, created_by) values ($1,$2,$3,'ajuste',$4,$5,'pedido',$6,'Pedido recibido',$7)",
      [ctx.tenantId, ctx.local.id, l.articulo_id, l.cantidad, l.precio_estimado, pedidoId, ctx.userId]);
    await rebuildArticulo(c, l.articulo_id);
  }
  await c.query("update pedidos set estado = 'recibido', recibido_at = now() where id = $1", [pedidoId]);
}

export async function recibirSugerido(lineas: Linea[]): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    await withTenant(ctx.tenantId, async (c) => { for (const id of await crearPedidosTx(c, ctx, lineas)) await recibirTx(c, ctx, id); });
    refresh();
    return { ok: true, msg: "Pedido recibido · stock actualizado" };
  });
}

export async function recibirPedido(pedidoId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    await withTenant(ctx.tenantId, (c) => recibirTx(c, ctx, pedidoId));
    refresh();
    return { ok: true, msg: "Pedido recibido · stock actualizado" };
  });
}

export async function estadoPedido(pedidoId: string, estado: "enviado" | "cancelado"): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (estado !== "enviado" && estado !== "cancelado") throw new UserError("Estado no válido.");
    await withTenant(ctx.tenantId, (c) => c.query(`update pedidos set estado = $2, enviado_at = case when $2 = 'enviado' then now() else enviado_at end where id = $1 and local_id = $3 and estado in ('borrador','enviado')`, [pedidoId, estado, ctx.local.id]));
    refresh();
  });
}

export async function pedidoAFactura(pedidoId: string | null, lineas?: Linea[]): Promise<void> {
  const ctx = await requireApp();
  requirePerm(ctx, "compras");
  const { ls, prov } = await withTenant(ctx.tenantId, async (c) => {
    if (pedidoId) {
      const p = await one<{ proveedor_id: string | null }>(c, "select proveedor_id from pedidos where id = $1 and local_id = $2", [pedidoId, ctx.local.id]);
      if (!p) throw new Error("Pedido no encontrado");
      const ls = await all<{ articulo_id: string; cantidad: number; precio_estimado: number | null }>(c, "select articulo_id, cantidad, precio_estimado from pedido_lineas where pedido_id = $1", [pedidoId]);
      await c.query("update pedidos set estado = 'recibido', recibido_at = now() where id = $1", [pedidoId]);
      return { ls: ls.map((l) => ({ articuloId: l.articulo_id, cantidad: l.cantidad, precio: l.precio_estimado })), prov: p.proveedor_id };
    }
    const arts = await all<ArtRow>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock, stock_min, consumo_semanal,
      track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key from articulos where id = any($1::uuid[]) and local_id = $2`, [(lineas ?? []).map((l) => l.articuloId), ctx.local.id]);
    return { ls: (lineas ?? []).map((l) => ({ articuloId: l.articuloId, cantidad: l.cantidad, precio: (() => { const a = arts.find((x) => x.id === l.articuloId); return a ? costeBase(toArtCost(a)) : null; })() })), prov: null };
  });
  const id = await crearManual(ctx, ls, prov);
  redirect(`/compras/${id}`);
}
