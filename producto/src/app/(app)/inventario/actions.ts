"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { all, isUuid, one, withTenant, type Db } from "@/server/db";
import { requireApp, requirePerm, UserError, type AppCtx } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { rebuildArticulo, articuloDesdeCatalogo } from "@/server/domain/articulos";
import { borrarDocumento, crearManual } from "@/server/domain/compras";
import { getCatalog } from "@/server/queries/catalog";
import { costeBase } from "@/lib/costing";
import { numValido } from "@/lib/inventory";
import { toArtCost, type ArtRow } from "@/server/domain/costs";

const TIPOS_SALIDA = ["merma", "desecho", "devolucion", "perdida", "invitacion"] as const;

async function art(c: Db, ctx: AppCtx, id: string) {
  if (!isUuid(id)) throw new UserError("Artículo no válido.");
  // Bloquea la fila: dos cambios a la vez sobre el mismo artículo se aplican uno detrás de otro
  const a = await one<{ id: string; stock: number; track_stock: boolean }>(c, "select id, stock, track_stock from articulos where id = $1 and local_id = $2 and not archived for update", [id, ctx.local.id]);
  if (!a) throw new UserError("Artículo no encontrado.");
  return a;
}

/** Recuento. `antes` es el stock que veía quien edita: si ha cambiado desde entonces (albarán, merma, otro usuario), no se pisa. */
export async function ajustarStock(id: string, nuevo: number, antes?: number | null): Promise<Result<{ stock: number }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (!Number.isFinite(nuevo) || nuevo < 0 || nuevo > 1e7) throw new UserError("Stock no válido.");
    const stock = await withTenant(ctx.tenantId, async (c) => {
      const a = await art(c, ctx, id);
      if (antes != null && Math.abs(a.stock - antes) > 0.0005) throw new UserError("El stock ha cambiado mientras lo editabas. Te mostramos el actual: vuelve a contarlo.");
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

/** Mínimo o consumo semanal. `antes` es el valor que veía quien edita: si otro lo ha cambiado desde entonces, no se pisa. */
export async function guardarParametro(id: string, campo: "stock_min" | "consumo_semanal", valor: number | null, antes?: number | null): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (campo !== "stock_min" && campo !== "consumo_semanal") throw new UserError("Campo no válido.");
    if (valor != null && !numValido(valor)) throw new UserError("Valor no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      await art(c, ctx, id);
      if (antes !== undefined) {
        const cur = (await one<{ v: number | null }>(c, `select ${campo} as v from articulos where id = $1`, [id]))!.v;
        if (cur == null ? antes != null : antes == null || Math.abs(cur - antes) > 0.0005) throw new UserError("Otra persona ha cambiado este valor. Te mostramos el actual.");
      }
      await c.query(`update articulos set ${campo} = $2 where id = $1`, [id, valor]);
    });
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

/** Empieza a controlar el stock de un artículo. `stock` null deja el stock que ya tiene (el de sus albaranes). */
export async function anadirReferencia(input: { tipo: "tuyo" | "catalogo"; id: string; stock: number | null; minimo: number | null; consumo: number | null }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (input.tipo !== "tuyo" && input.tipo !== "catalogo") throw new UserError("Elige un artículo.");
    if (typeof input.id !== "string" || !input.id) throw new UserError("Elige un artículo.");
    if (input.tipo === "catalogo" && !(await getCatalog()).items.some((i) => i.id === input.id)) throw new UserError("Ese producto ya no está en el catálogo.");
    for (const v of [input.stock, input.minimo, input.consumo]) if (v != null && !numValido(v)) throw new UserError("Revisa el stock, el mínimo y el consumo: no pueden ser negativos.");
    await withTenant(ctx.tenantId, async (c) => {
      const id = input.tipo === "catalogo" ? await articuloDesdeCatalogo(c, ctx.tenantId, ctx.local.id, input.id) : input.id;
      // Un artículo del catálogo recién creado en esta transacción (created_at = now()) nace controlado; uno que ya existía y se controla no se toca
      const a = await art(c, ctx, id);
      const nuevo = input.tipo === "catalogo" && !!(await one(c, "select 1 from articulos where id = $1 and created_at = now()", [id]));
      if (a.track_stock && !nuevo) throw new UserError("Ya está en tu inventario: cambia su stock, mínimo o consumo en la tabla.");
      await c.query("update articulos set track_stock = true, stock_min = $2, consumo_semanal = $3 where id = $1", [id, input.minimo, input.consumo]);
      if (input.stock != null) {
        const contado = Math.round(input.stock * 1000) / 1000;
        if (contado !== Math.round(a.stock * 1000) / 1000) {
          // Como en un recuento: se guarda lo contado, no la diferencia con lo que había
          await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, nota, created_by) values ($1,$2,$3,'recuento',$4,'Stock inicial',$5)", [ctx.tenantId, ctx.local.id, id, contado, ctx.userId]);
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
    if (!numValido(input.cantidad) || !(input.cantidad > 0)) throw new UserError("Pon una cantidad mayor que cero.");
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
/** Líneas de pedido que llegan del cliente: artículo válido y cantidad finita; las de cantidad 0 se ignoran. */
function lineasValidas(lineas: unknown): Linea[] {
  if (!Array.isArray(lineas) || lineas.length > 500) throw new UserError("El pedido no es válido.");
  const ls = lineas as Linea[];
  if (ls.some((l) => !l || !isUuid(l.articuloId) || !numValido(l.cantidad))) throw new UserError("Revisa las cantidades del pedido.");
  const ok = ls.filter((l) => l.cantidad > 0);
  if (!ok.length) throw new UserError("El pedido está vacío.");
  return ok;
}
async function crearPedidosTx(c: Db, ctx: AppCtx, lineas: Linea[]) {
  const ids = lineasValidas(lineas);
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

/** Bloquea un pedido que sigue abierto. Uno registrado como factura cuenta como recibido cuando esa factura se guarda. */
async function pedidoAbierto(c: Db, ctx: AppCtx, pedidoId: string) {
  if (!isUuid(pedidoId)) throw new UserError("Pedido no válido.");
  const p = await one<{ proveedor_id: string | null; estado: string; documento_id: string | null; doc: string | null }>(c, `select pe.proveedor_id, pe.estado, pe.documento_id, d.status as doc
    from pedidos pe left join documentos d on d.id = pe.documento_id where pe.id = $1 and pe.local_id = $2 for update of pe`, [pedidoId, ctx.local.id]);
  if (!p) throw new UserError("Pedido no encontrado.");
  if (p.doc === "guardado") throw new UserError("Este pedido ya se registró como factura.");
  if (p.estado !== "borrador" && p.estado !== "enviado") throw new UserError("Este pedido ya está cerrado.");
  return { ...p, factura: p.documento_id && p.doc !== "descartado" ? p.documento_id : null };
}

async function recibirTx(c: Db, ctx: AppCtx, pedidoId: string, sumarStock = true) {
  const p = await pedidoAbierto(c, ctx, pedidoId);
  if (p.factura) throw new UserError("Este pedido tiene una factura a medio registrar: guárdala o descártala en Compras.");
  const ls = sumarStock ? await all<{ articulo_id: string; cantidad: number; precio_estimado: number | null }>(c, "select articulo_id, cantidad, precio_estimado from pedido_lineas where pedido_id = $1", [pedidoId]) : [];
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

/** Recibir un pedido. Con `sumarStock` false solo se cierra: el stock lo sumará el albarán de esa entrega, que no se cuenta dos veces. */
export async function recibirPedido(pedidoId: string, sumarStock = true): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (typeof sumarStock !== "boolean") throw new UserError("Opción no válida.");
    await withTenant(ctx.tenantId, (c) => recibirTx(c, ctx, pedidoId, sumarStock));
    refresh();
    return { ok: true, msg: sumarStock ? "Pedido recibido · stock actualizado" : "Pedido cerrado · el stock llegará con su albarán" };
  });
}

export async function estadoPedido(pedidoId: string, estado: "enviado" | "cancelado"): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "inventario");
    if (estado !== "enviado" && estado !== "cancelado") throw new UserError("Estado no válido.");
    if (!isUuid(pedidoId)) throw new UserError("Pedido no válido.");
    // Con una factura enlazada, el pedido lo cierra esa factura (o vuelve a abrirse si se descarta)
    const ok = await withTenant(ctx.tenantId, (c) => one(c, `update pedidos set estado = $2, enviado_at = case when $2 = 'enviado' then now() else enviado_at end
      where id = $1 and local_id = $3 and estado in ('borrador','enviado') and documento_id is null returning id`, [pedidoId, estado, ctx.local.id]));
    if (!ok) throw new UserError("Este pedido ya no se puede cambiar.");
    refresh();
  });
}

/** Abre una compra a mano con las líneas del pedido (o del pedido sugerido) para registrarla con sus precios reales.
 *  El pedido no se cierra aquí: queda enlazado a esa compra y cuenta como recibido cuando se guarda;
 *  si se descarta o se borra, vuelve a estar abierto. */
export async function pedidoAFactura(pedidoId: string | null, lineas?: Linea[]): Promise<Result<{ id: string }>> {
  const r = await run<{ id: string }>(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (pedidoId == null) {
      const ls = lineasValidas(lineas);
      const arts = await withTenant(ctx.tenantId, (c) => all<ArtRow>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock, stock_min, consumo_semanal,
        track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key from articulos where id = any($1::uuid[]) and local_id = $2`, [ls.map((l) => l.articuloId), ctx.local.id]));
      const precio = (id: string) => { const a = arts.find((x) => x.id === id); return a ? costeBase(toArtCost(a)) : null; };
      return { ok: true, data: { id: await crearManual(ctx, ls.map((l) => ({ articuloId: l.articuloId, cantidad: l.cantidad, precio: precio(l.articuloId) }))) } };
    }
    const p = await withTenant(ctx.tenantId, async (c) => {
      const p = await pedidoAbierto(c, ctx, pedidoId);
      if (p.factura) return { factura: p.factura, ls: [], prov: null };
      if (p.documento_id) await c.query("update pedidos set documento_id = null where id = $1", [pedidoId]);
      const ls = await all<{ articulo_id: string; cantidad: number; precio_estimado: number | null }>(c, "select articulo_id, cantidad, precio_estimado from pedido_lineas where pedido_id = $1", [pedidoId]);
      return { factura: null, ls: ls.map((l) => ({ articuloId: l.articulo_id, cantidad: l.cantidad, precio: l.precio_estimado })), prov: p.proveedor_id };
    });
    // Ya tiene una factura a medio registrar: se continúa esa
    if (p.factura) return { ok: true, data: { id: p.factura } };
    const id = await crearManual(ctx, p.ls, p.prov);
    const linked = await withTenant(ctx.tenantId, (c) => one(c, "update pedidos set documento_id = $2 where id = $1 and local_id = $3 and documento_id is null and estado in ('borrador','enviado') returning id", [pedidoId, id, ctx.local.id]));
    if (!linked) { await borrarDocumento(ctx, id); throw new UserError("El pedido ha cambiado mientras tanto. Recarga la página."); }
    return { ok: true, data: { id } };
  });
  if (r.ok) redirect(`/compras/${r.data!.id}`);
  return r;
}
