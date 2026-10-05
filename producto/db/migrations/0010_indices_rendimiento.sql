-- Índices que faltaban, medidos con tests/carga/indices.mjs sobre 50 negocios sintéticos (docs/RENDIMIENTO.md, apartado 4).
-- Aditiva e idempotente: solo crea índices, no toca datos ni políticas. Sin «concurrently» porque migrate.mjs envuelve cada migración en una
-- transacción; con las tablas de hoy el bloqueo de escrituras dura milisegundos. Si alguna llegara a pesar millones de filas, créese antes a mano
-- con «create index concurrently if not exists …» y esta migración lo dará por hecho.
--
-- 1. Claves foráneas de tablas que crecen con el uso y se borran en cascada. Sin un índice que empiece por la columna, cada fila que se borra
--    del padre (una importación de ventas, un albarán, un artículo, un proveedor, un plato, un pedido) hace que Postgres recorra ENTERA la tabla
--    de los hijos —la de todos los negocios— para comprobar la clave. Esa comprobación no pasa por RLS, así que tampoco sirve un índice por
--    tenant_id. Borrar un negocio entero con datos de tamaño medio tardaba unos 10 s, casi todos en estas comprobaciones.
create index if not exists ventas_lineas_import_idx on ventas_lineas (import_id);
create index if not exists ventas_lineas_receta_idx on ventas_lineas (receta_id);
create index if not exists precio_eventos_doc_idx on precio_eventos (documento_id, articulo_id);
-- (articulo_id, fecha desc, created_at desc) sirve además a «el último cambio de precio de cada artículo» (lista de Artículos), que ordena así
create index if not exists precio_eventos_art_idx on precio_eventos (articulo_id, fecha desc, created_at desc);
create index if not exists articulo_proveedor_prov_idx on articulo_proveedor (proveedor_id);
create index if not exists pedido_lineas_pedido_idx on pedido_lineas (pedido_id);
create index if not exists pedido_lineas_art_idx on pedido_lineas (articulo_id);

-- 2. Tablas con tenant_id que se leen por negocio sin ningún índice que empiece por tenant_id (como ya tienen documentos, artículos, recetas,
--    proveedores o ventas_lineas). Con un negocio normal el planificador se arregla con los índices por clave; con uno diez veces mayor elegía
--    planes que recorren la tabla ENTERA —la de todos los negocios— y tiran las filas de los demás con el filtro de RLS: cuestan lo que pese la
--    tabla, no lo que pese el negocio. La recursión de los avisos (que lleva el menú de todas las pantallas) leía así 35.000 líneas de escandallo
--    para quedarse con 85, y los precios por proveedor de Hoy, 120.000 filas.
create index if not exists receta_lineas_tenant_sub_idx on receta_lineas (tenant_id, subreceta_id);
create index if not exists articulo_proveedor_tenant_idx on articulo_proveedor (tenant_id, articulo_id);
--    Y las que se leen por negocio y local: Hoy lee ventas_importes en cada visita; Pedidos e Inventario leen pedidos.
create index if not exists ventas_importes_local_idx on ventas_importes (tenant_id, local_id, desde desc nulls last, created_at desc);
create index if not exists pedidos_local_idx on pedidos (tenant_id, local_id, created_at desc);
