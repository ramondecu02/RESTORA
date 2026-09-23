// Carga y retirada de los datos de ejemplo en el negocio del usuario (todo marcado con demo = true).
import { all, one, withTenant, type Db } from "../db";
import { UserError, type AppCtx } from "../ctx";
import { audit } from "../audit";
import { getCatalog } from "../queries/catalog";
import { rebuildArticulo } from "../domain/articulos";
import { loadCostContext, recomputeCosts } from "../domain/costs";
import { recetaCost } from "@/lib/costing";
import { isoDate } from "@/lib/format";
import { ALTERNATIVAS, ARTS, COMENSALES, COMPRA_MES, ELABS, INVENTARIO, MENU, PLATOS, PROVS, REVENTA } from "./data";

const monthDate = (monthsAgo: number, day: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const today = new Date();
  let dd = Math.min(day, last);
  if (monthsAgo === 0) dd = Math.max(1, Math.min(dd, today.getDate() - 1 || 1));
  d.setDate(dd);
  return isoDate(d);
};

export async function cargarDemo(ctx: AppCtx) {
  const { cats } = await getCatalog();
  const ivaCat = new Map(cats.map((c) => [c.id, c.iva]));
  return withTenant(ctx.tenantId, async (c) => {
    const ya = await one(c, "select 1 from proveedores where local_id = $1 and demo limit 1", [ctx.local.id]);
    if (ya) throw new UserError("Ya tienes cargados los datos de ejemplo.");
    await c.query(`update locales set ciudad = case when ciudad = '' then 'Tarragona' else ciudad end, lema = case when lema = '' then 'Cocina de mercado' else lema end,
      comensales_dia = coalesce(comensales_dia, 62), postal_code = case when postal_code = '' then '43003' else postal_code end where id = $1`, [ctx.local.id]);
    // Proveedores
    const prov = new Map<string, string>();
    for (const p of PROVS) {
      const ex = await one<{ id: string }>(c, "select id from proveedores where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, p.name]);
      const id = ex?.id ?? (await one<{ id: string }>(c, `insert into proveedores (tenant_id, local_id, name, empresa, tipo, cif, responsable, phone, email, direccion, entrega, notas, origen, demo)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual',true) returning id`,
        [ctx.tenantId, ctx.local.id, p.name, p.empresa, p.tipo, p.cif, p.responsable, p.phone, p.email, p.direccion, p.entrega, p.notas]))!.id;
      prov.set(p.key, id);
    }
    // Artículos
    const art = new Map<string, string>();
    for (const a of ARTS) {
      const ex = await one<{ id: string }>(c, "select id from articulos where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, a.name]);
      const inv = INVENTARIO[a.key];
      const id = ex?.id ?? (await one<{ id: string }>(c, `insert into articulos (tenant_id, local_id, name, category_id, catalog_item_id, unit, rend, iva, aliases, track_stock, stock_min, consumo_semanal, demo)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) returning id`,
        [ctx.tenantId, ctx.local.id, a.name, a.cat, a.catalog, a.unit, a.rend, ivaCat.get(a.cat) ?? 10, a.aliases ?? [], !!inv, inv?.[2] ?? null, inv?.[1] ?? null]))!.id;
      art.set(a.key, id);
    }
    // Seis meses de albaranes, con consumo entre compras para que el precio medio siga a los precios recientes
    const stock = new Map<string, number>();
    let num = 4100;
    for (let m = 5; m >= 0; m--) {
      for (let pi = 0; pi < PROVS.length; pi++) {
        const p = PROVS[pi];
        const items = ARTS.filter((a) => a.prov === p.key);
        if (!items.length) continue;
        const fecha = monthDate(m, 4 + pi * 3);
        const fechaTs = new Date(fecha + "T12:00:00Z");
        const doc = (await one<{ id: string }>(c, `insert into documentos (tenant_id, local_id, kind, status, source, proveedor_id, numero, fecha, demo, saved_at, created_by)
          values ($1,$2,'albaran','guardado','manual',$3,$4,$5,true,$6,$7) returning id`,
          [ctx.tenantId, ctx.local.id, prov.get(p.key), `${p.key.slice(0, 2).toUpperCase()}-${num++}`, fecha, fechaTs, ctx.userId]))!.id;
        let base = 0, cuota = 0, idx = 0;
        for (const a of items) {
          const aid = art.get(a.key)!;
          const precioUd = a.hist[5 - m];
          const [ucompra, factor] = a.compra ?? [a.unit, 1];
          const cantidad = Math.max(1, Math.round((COMPRA_MES[a.key] ?? 5) / factor));
          const unidades = cantidad * factor;
          const precio = Math.round(precioUd * factor * 10000) / 10000;
          const importe = Math.round(cantidad * precio * 100) / 100;
          const iva = ivaCat.get(a.cat) ?? 10;
          base += importe; cuota += importe * iva / 100;
          const s0 = stock.get(aid) ?? 0;
          if (s0 > 0) {
            await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, ref_tipo, nota, fecha) values ($1,$2,$3,'venta',$4,'demo','Consumo',$5)",
              [ctx.tenantId, ctx.local.id, aid, -Math.round(s0 * 0.85 * 1000) / 1000, new Date(fechaTs.getTime() - 864e5)]);
          }
          stock.set(aid, s0 * 0.15 + unidades);
          await c.query(`insert into compra_lineas (tenant_id, documento_id, idx, texto, articulo_id, cantidad, unidad_compra, factor, precio, descuento, bonificadas, importe, iva, coste_unit)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,0,$10,$11,$12)`, [ctx.tenantId, doc, idx++, a.name.toUpperCase(), aid, cantidad, ucompra, factor, precio, importe, iva, precioUd]);
          await c.query(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, ref_tipo, ref_id, fecha) values ($1,$2,$3,'compra',$4,$5,'documento',$6,$7)`,
            [ctx.tenantId, ctx.local.id, aid, unidades, precioUd, doc, fechaTs]);
          const prev = m < 5 ? a.hist[4 - m] : null;
          if (prev != null && Math.abs(precioUd - prev) / prev >= 0.005) {
            await c.query(`insert into precio_eventos (tenant_id, articulo_id, proveedor_id, documento_id, precio_anterior, precio_nuevo, variacion, fecha) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [ctx.tenantId, aid, prov.get(p.key), doc, prev, precioUd, (precioUd - prev) / prev, fecha]);
          }
          await c.query(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, documento_id, origen)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'albaran') on conflict (articulo_id, proveedor_id) do update set unidad_compra = excluded.unidad_compra, factor = excluded.factor,
            precio = excluded.precio, precio_unit = excluded.precio_unit, fecha = excluded.fecha, documento_id = excluded.documento_id, origen = 'albaran'`,
            [ctx.tenantId, aid, prov.get(p.key), ucompra, factor, precio, precioUd, fecha, doc]);
        }
        await c.query("update documentos set base = $2, cuota = $3, total = $4 where id = $1", [doc, Math.round(base * 100) / 100, Math.round(cuota * 100) / 100, Math.round((base + cuota) * 100) / 100]);
      }
    }
    // Stock actual como en el prototipo
    for (const a of ARTS) {
      const aid = art.get(a.key)!;
      const inv = INVENTARIO[a.key];
      const s = stock.get(aid) ?? 0;
      const target = inv ? inv[0] : 0;
      if (Math.abs(target - s) > 0.0005) {
        await c.query("insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, ref_tipo, nota, fecha) values ($1,$2,$3,'ajuste',$4,'demo','Recuento',now())",
          [ctx.tenantId, ctx.local.id, aid, Math.round((target - s) * 1000) / 1000]);
      }
    }
    for (const aid of art.values()) await rebuildArticulo(c, aid);
    for (const [k, pk, precio, nota] of ALTERNATIVAS) {
      await c.query(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, origen, nota)
        values ($1,$2,$3,'',1,$4,$4,current_date,'cotizacion',$5) on conflict (articulo_id, proveedor_id) do nothing`, [ctx.tenantId, art.get(k), prov.get(pk), precio, nota]);
    }
    // Elaboraciones, platos, reventa y menú
    const rec = new Map<string, string>();
    const addLines = async (rid: string, lineas: [string, number, string][]) => {
      let i = 0;
      for (const [ref, q, u] of lineas) {
        const sub = ref.startsWith("@") ? rec.get(ref.slice(1)) : null;
        await c.query("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, subreceta_id, cantidad, unidad) values ($1,$2,$3,$4,$5,$6,$7)",
          [ctx.tenantId, rid, i++, sub ? null : art.get(ref), sub, q, u]);
      }
    };
    for (const e of ELABS) {
      const id = (await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, rinde, rinde_unit, estado, en_carta, demo) values ($1,$2,'elaboracion',$3,$4,$5,$6,'activo',false,true) returning id`,
        [ctx.tenantId, ctx.local.id, e.name, e.familia, e.rinde, e.unit]))!.id;
      rec.set(e.key, id);
      await addLines(id, e.lineas);
    }
    let orden = 0;
    for (const p of PLATOS) {
      const id = (await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, pvp, ventas_mes, foto_key, descripcion, estado, en_carta, orden, demo)
        values ($1,$2,'plato',$3,$4,$5,$6,$7,$8,'activo',true,$9,true) returning id`,
        [ctx.tenantId, ctx.local.id, p.name, p.familia, p.pvp, p.ventas, p.foto ? `demo/${p.foto}.webp` : null, p.desc ?? "", orden++]))!.id;
      rec.set(p.key, id);
      await addLines(id, p.lineas);
    }
    for (const r of REVENTA) {
      const id = (await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, pvp, ventas_mes, reventa, coste_manual, margen_objetivo, estado, en_carta, orden, demo)
        values ($1,$2,'plato',$3,$4,$5,$6,true,$7,$8,'activo',true,$9,true) returning id`, [ctx.tenantId, ctx.local.id, r.name, r.familia, r.pvp, r.ventas, r.coste, r.margen, orden++]))!.id;
      rec.set(r.key, id);
    }
    const menu = (await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, pvp, ventas_mes, estado, en_carta, orden, demo, descripcion)
      values ($1,$2,'menu',$3,$4,$5,$6,'activo',true,$7,true,'Entrante, principal y postre. Pan y bebida aparte.') returning id`, [ctx.tenantId, ctx.local.id, MENU.name, MENU.familia, MENU.pvp, MENU.ventas, orden++]))!.id;
    await addLines(menu, MENU.lineas.map((k) => ["@" + k, 1, "ud"] as [string, number, string]));
    await recomputeCosts(c, ctx.local.id);
    // Cinco meses de ventas (histórico para los gráficos de Hoy)
    const { ctx: cc } = await loadCostContext(c, ctx.local.id);
    const dishes = [...PLATOS.map((p) => ({ key: p.key, name: p.name, pvp: p.pvp, ventas: p.ventas })), ...REVENTA.map((r) => ({ key: r.key, name: r.name, pvp: r.pvp, ventas: r.ventas })), { key: "menu", name: MENU.name, pvp: MENU.pvp, ventas: MENU.ventas }];
    rec.set("menu", menu);
    for (let m = 5; m >= 1; m--) {
      const k = COMENSALES[5 - m] / 62;
      const desde = monthDate(m, 1), hasta = monthDate(m, 31);
      const dias = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 864e5) + 1;
      const imp = (await one<{ id: string }>(c, `insert into ventas_importes (tenant_id, local_id, fuente, filename, desde, hasta, filas, total, comensales, demo) values ($1,$2,'demo',$3,$4,$5,0,0,$6,true) returning id`,
        [ctx.tenantId, ctx.local.id, `ventas-${desde.slice(0, 7)}.csv`, desde, hasta, Math.round(COMENSALES[5 - m] * dias)]))!.id;
      let total = 0, filas = 0;
      for (const d of dishes) {
        const rid = rec.get(d.key)!;
        const uds = Math.round(d.ventas * k * (0.94 + ((d.key.length * 7 + m * 3) % 10) / 80));
        const importe = Math.round(uds * d.pvp * 100) / 100;
        const cu = recetaCost(rid, cc).perUnit * (1 - 0.012 * m);
        await c.query(`insert into ventas_lineas (tenant_id, local_id, import_id, fecha, nombre, receta_id, unidades, importe, neto, coste_unit, coste_total) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [ctx.tenantId, ctx.local.id, imp, monthDate(m, 15), d.name, rid, uds, importe, importe / (1 + ctx.local.iva_venta / 100), cu, cu * uds]);
        total += importe; filas++;
        await c.query("insert into ventas_alias (tenant_id, local_id, nombre_norm, receta_id) values ($1,$2,$3,$4) on conflict do nothing", [ctx.tenantId, ctx.local.id, d.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(), rid]);
      }
      await c.query("update ventas_importes set filas = $2, total = $3 where id = $1", [imp, filas, Math.round(total * 100) / 100]);
    }
    await audit(c, ctx.tenantId, ctx.userId, "cargar", "demo", null, {});
    return { articulos: art.size, platos: PLATOS.length + REVENTA.length + 1 };
  });
}

export async function quitarDemo(ctx: AppCtx) {
  return withTenant(ctx.tenantId, async (c: Db) => {
    const L = ctx.local.id;
    const docs = (await all<{ id: string }>(c, "select id from documentos where local_id = $1 and demo", [L])).map((d) => d.id);
    const imps = (await all<{ id: string }>(c, "select id from ventas_importes where local_id = $1 and demo", [L])).map((d) => d.id);
    await c.query("delete from stock_movimientos where local_id = $1 and (ref_id = any($2::uuid[]) or ref_tipo = 'demo')", [L, [...docs, ...imps]]);
    await c.query("delete from documentos where id = any($1::uuid[])", [docs]);
    await c.query("delete from ventas_importes where id = any($1::uuid[])", [imps]);
    await c.query("delete from pedidos where local_id = $1 and demo", [L]);
    // Recetas de ejemplo que alguna receta tuya usa: se quedan como tuyas
    await c.query(`update recetas set demo = false where local_id = $1 and demo and id in (
      select rl.subreceta_id from receta_lineas rl join recetas r on r.id = rl.receta_id where not r.demo and rl.subreceta_id is not null)`, [L]);
    await c.query("delete from recetas where local_id = $1 and demo", [L]);
    // Artículos: se borran salvo que los uses en compras, recetas o pedidos tuyos
    await c.query(`update articulos set demo = false where local_id = $1 and demo and (
      id in (select articulo_id from compra_lineas) or id in (select articulo_id from receta_lineas where articulo_id is not null) or id in (select articulo_id from pedido_lineas))`, [L]);
    const kept = (await all<{ id: string }>(c, "select id from articulos where local_id = $1 and not demo", [L])).map((a) => a.id);
    await c.query("delete from articulos where local_id = $1 and demo", [L]);
    await c.query(`update proveedores set demo = false where local_id = $1 and demo and (
      id in (select proveedor_id from documentos where proveedor_id is not null) or id in (select proveedor_id from articulo_proveedor)
      or id in (select last_proveedor_id from articulos where last_proveedor_id is not null) or id in (select proveedor_pref_id from articulos where proveedor_pref_id is not null))`, [L]);
    await c.query("delete from proveedores where local_id = $1 and demo", [L]);
    for (const a of kept) await rebuildArticulo(c, a);
    await recomputeCosts(c, L);
    await audit(c, ctx.tenantId, ctx.userId, "quitar", "demo", null, {});
  });
}
