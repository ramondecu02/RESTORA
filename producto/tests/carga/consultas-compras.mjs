// Las consultas de la lista de Compras (src/app/(app)/compras/page.tsx, ComprasContenido), copiadas tal cual para poder medirlas sin
// arrancar Next: la pantalla las lleva dentro del componente y no se pueden importar. Con los valores por omisión de la pantalla
// (primera página, todos los estados, sin búsqueda ni proveedor). tests/unit/carga-copias.test.ts comprueba que cada FRAGMENTO sigue
// idéntico en la pantalla y que la pantalla no tiene más consultas que estas: si alguien cambia una consulta de Compras, esa prueba falla y
// esta copia se actualiza.
const PAGE = 20;

export const FRAGMENTOS = [
  `select d.id, d.status, d.kind, d.source, d.numero, d.fecha, d.total, p.name as proveedor, d.created_at,
        (select count(*)::int from compra_lineas cl where cl.documento_id = d.id) as lineas
      from documentos d left join proveedores p on p.id = d.proveedor_id where`,
  `order by (d.status in ('revisar','leyendo','subido','error')) desc, d.fecha desc nulls last, d.created_at desc limit`,
  `select
        coalesce(sum(base) filter (where fecha > current_date - 30), 0)::float as total,
        coalesce(sum(base) filter (where fecha > current_date - 60 and fecha <= current_date - 30), 0)::float as ant,
        (count(*) filter (where fecha > current_date - 30))::int as n,
        (count(distinct proveedor_id) filter (where fecha > current_date - 30))::int as provs,
        (select count(*)::int from documentos where local_id = $1 and kind in ('albaran','factura') and status <> 'descartado') as docs
      from documentos where local_id = $1 and status = 'guardado' and fecha > current_date - 60`,
  `select
        (count(*) filter (where status = 'revisar'))::int as revisar, (count(*) filter (where status = 'error'))::int as error, (count(*) filter (where status = 'guardado'))::int as guardados,
        (array_agg(id order by created_at desc) filter (where status = 'revisar'))[1] as primero
      from documentos where local_id = $1 and kind in ('albaran','factura') and status <> 'descartado'`,
  `select p.name, p.id, sum(d.base)::float as total from documentos d join proveedores p on p.id = d.proveedor_id
      where d.local_id = $1 and d.status = 'guardado' and d.fecha >= current_date - 30 group by p.id, p.name order by total desc limit 8`,
  `select a.id, a.name, a.unit, sum(cl.importe)::float as gasto from compra_lineas cl
      join documentos d on d.id = cl.documento_id join articulos a on a.id = cl.articulo_id
      where d.local_id = $1 and d.status = 'guardado' and d.fecha >= date_trunc('month', current_date) - interval '5 months'
        and d.fecha < date_trunc('month', current_date) + interval '1 month' group by a.id, a.name, a.unit order by gasto desc limit 4`,
  `select cl.articulo_id, to_char(date_trunc('month', d.fecha), 'YYYY-MM') as mes,
      (sum(cl.coste_unit * cl.cantidad * cl.factor) / nullif(sum(cl.cantidad * cl.factor), 0))::float as precio
      from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.articulo_id = any($1::uuid[]) and d.status = 'guardado' and d.fecha >= date_trunc('month', current_date) - interval '5 months'
      group by cl.articulo_id, 2 order by 2`,
  `select id, name from proveedores where local_id = $1 and not archived order by name`,
  // El where de la lista (la pantalla le intercala el filtro de estado, que aquí está vacío: «todos»)
  `d.local_id = $1 and d.kind in ('albaran','factura') and d.status <> 'descartado'`,
  `and ($2::text is null or d.numero ilike $2 or p.name ilike $2) and ($3::uuid is null or d.proveedor_id = $3)`,
];
const [DOCS_ANTES, DOCS_ORDEN, MES, CUENTA, GASTO, TOP, SERIES, PROVS, WHERE_A, WHERE_B] = FRAGMENTOS;

/** Los datos de la pantalla de Compras para un negocio: las mismas consultas, en el mismo orden y dentro de una transacción de negocio. */
export async function comprasContenido(ctx, { withTenant, all, one }) {
  return withTenant(ctx.tenantId, async (c) => {
    const where = `${WHERE_A}\n      ${WHERE_B}`;
    const docs = await all(c, `${DOCS_ANTES} ${where}\n      ${DOCS_ORDEN} ${PAGE + 1} offset 0`, [ctx.local.id, null, null]);
    const mes = await one(c, MES, [ctx.local.id]);
    const cuenta = await one(c, CUENTA, [ctx.local.id]);
    const gasto = await all(c, GASTO, [ctx.local.id]);
    const top = await all(c, TOP, [ctx.local.id]);
    const series = top.length ? await all(c, SERIES, [top.map((t) => t.id)]) : [];
    const provs = await all(c, PROVS, [ctx.local.id]);
    return { docs, mes, cuenta, gasto, top, series, provs };
  });
}
