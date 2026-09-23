-- IVA de compra de los refrescos: desde el 1/1/2021 las bebidas refrescantes, zumos y gaseosas con azúcares
-- o edulcorantes añadidos tributan al 21 % (Ley 11/2020). El agua y los zumos sin azúcar añadido siguen al 10 %.
insert into catalog_categories (id, name, singular, iva, kind, orden) values
  ('refresco', 'Refrescos y bebidas con azúcar o edulcorantes', 'refresco', 21, 'bebida', 20)
on conflict (id) do update set name = excluded.name, singular = excluded.singular, iva = excluded.iva, kind = excluded.kind, orden = excluded.orden;
update catalog_categories set name = 'Aguas y zumos', singular = 'agua o zumo' where id = 'bebida';
update catalog_items set category_id = 'refresco' where id in ('refresco-cola', 'refresco-naranja', 'refresco-limon', 'tonica');
