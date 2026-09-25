-- Corrige datos que dejaron dos errores del motor de costes. Idempotente: una segunda ejecución no cambia nada.
-- Recorre los negocios fijando app.tenant_id para que funcione también si el rol de migración está sujeto a RLS.
do $$
declare o record;
begin
  for o in select id from organizations loop
    perform set_config('app.tenant_id', o.id::text, true);

    -- 1) Precio puesto a mano frente a compras. Antes se comparaba la hora en que se puso con la fecha del albarán
    --    a las 12:00 UTC; ahora el precio manual manda mientras exista y lo borra la compra que se registra después
    --    (confirmarAlbaran). Se borran los precios manuales que ya tienen una compra registrada después.
    update articulos a set precio_manual = null, precio_manual_at = null
    where a.tenant_id = o.id and a.precio_manual is not null and exists (
      select 1 from compra_lineas cl join documentos d on d.id = cl.documento_id
      where cl.articulo_id = a.id and d.status = 'guardado'
        and (a.precio_manual_at is null or coalesce(d.saved_at, d.created_at) > a.precio_manual_at));

    -- 2) La plantilla de gazpacho añadía 30 g de pan de barra, un artículo que va por unidades: esa línea no se
    --    podía volver a guardar. 30 g son 0,12 barras de 250 g.
    update receta_lineas l set cantidad = round(l.cantidad * (case l.unidad when 'kg' then 1 else 0.001 end) / 0.25, 4), unidad = 'ud'
    from articulos a
    where l.tenant_id = o.id and a.id = l.articulo_id and a.catalog_item_id = 'pan-barra' and a.unit = 'ud' and l.unidad in ('g', 'kg');
  end loop;
  perform set_config('app.tenant_id', '', true);
end $$;
