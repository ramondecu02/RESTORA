-- Las referencias a artículos y sub-recetas que no se borran en cascada se comprueban al final de la
-- transacción. Así, borrar de golpe un conjunto que se referencia entre sí (quitar los datos de ejemplo,
-- eliminar el negocio) no falla por el orden en que PostgreSQL ejecuta las cascadas; borrar algo que
-- sigue en uso fuera de ese conjunto sigue estando prohibido.
alter table receta_lineas alter constraint receta_lineas_subreceta_id_fkey deferrable initially deferred;
alter table receta_lineas alter constraint receta_lineas_articulo_id_fkey deferrable initially deferred;
alter table compra_lineas alter constraint compra_lineas_articulo_id_fkey deferrable initially deferred;
