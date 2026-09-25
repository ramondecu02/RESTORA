-- Compras e inventario: recuentos como valor absoluto, capa anónima ligada a su albarán, cotizaciones que un albarán
-- sustituye, lo que aprende cada albarán (para deshacerlo al borrarlo) y quién lo guardó. Se puede aplicar más de una vez.

-- Recuento de inventario: su cantidad es lo contado (valor absoluto), no la diferencia con el stock que había.
alter table stock_movimientos drop constraint if exists stock_movimientos_tipo_check;
alter table stock_movimientos add constraint stock_movimientos_tipo_check
  check (tipo in ('inicial','compra','venta','merma','desecho','devolucion','perdida','invitacion','ajuste','recuento'));

-- Referencia opaca (HMAC) al albarán que aportó cada observación de la capa anónima, para retirarla si se borra.
alter table bench_price_obs add column if not exists documento_ref text;
create index if not exists bench_obs_ref on bench_price_obs (documento_ref) where documento_ref is not null;

-- Cotización que un albarán ha sustituido para ese artículo y proveedor: vuelve si se borran sus albaranes.
alter table articulo_proveedor add column if not exists cotizacion_previa jsonb;

-- Alias e IVA que aprendió cada albarán al guardarse, y quién lo guardó.
alter table documentos add column if not exists aprendido jsonb;
alter table documentos add column if not exists saved_by uuid references users(id) on delete set null;

-- La capa anónima solo recoge precios de albaranes reales leídos del documento: fuera los de ejemplo, los de prueba y
-- los apuntados a mano que ya entraron. Se guardaron en la misma transacción que el albarán (created_at = saved_at).
delete from bench_price_obs b using documentos d
where b.documento_ref is null and d.status = 'guardado' and b.created_at = d.saved_at
  and (d.demo or d.source = 'manual' or d.ocr_model in ('ejemplo', 'mock'))
  and b.catalog_item_id in (select a.catalog_item_id from compra_lineas cl join articulos a on a.id = cl.articulo_id where cl.documento_id = d.id);

-- Última compra de cada artículo: se calculaba sin contar el albarán que se estaba guardando (se quedaba uno atrás).
update articulos a set last_price = x.coste_unit, last_proveedor_id = x.proveedor_id, last_purchase_at = (x.fecha + time '12:00') at time zone 'UTC'
from (
  select distinct on (cl.articulo_id) cl.articulo_id, cl.coste_unit, d.proveedor_id, d.fecha
  from compra_lineas cl join documentos d on d.id = cl.documento_id
  where d.status = 'guardado'
  order by cl.articulo_id, d.fecha desc nulls last, d.saved_at desc, cl.idx
) x
where a.id = x.articulo_id and (a.last_price is distinct from x.coste_unit or a.last_proveedor_id is distinct from x.proveedor_id
  or a.last_purchase_at is distinct from (x.fecha + time '12:00') at time zone 'UTC');
