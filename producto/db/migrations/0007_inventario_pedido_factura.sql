-- «Registrar como factura» desde un pedido: el pedido queda enlazado a la compra que se abre con sus líneas.
-- No se cierra al abrirla: cuenta como recibido cuando esa compra se guarda (el stock lo suma la compra, una sola vez).
-- Si la compra se descarta o se borra, el enlace se anula solo y el pedido vuelve a estar abierto.
alter table pedidos add column if not exists documento_id uuid references documentos(id) on delete set null;
create index if not exists pedidos_documento_idx on pedidos (documento_id) where documento_id is not null;
