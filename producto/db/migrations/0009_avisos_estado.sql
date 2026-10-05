-- Avisos de precio: los que se han dado por resueltos o se ha decidido ignorar.
-- Un aviso es el último cambio de precio de un artículo (precio_eventos): si el precio vuelve a cambiar es otro evento
-- y el aviso vuelve a estar abierto. Si se borra el albarán que lo originó, el evento y su estado desaparecen con él.
create table if not exists avisos_estado (
  evento_id uuid primary key references precio_eventos(id) on delete cascade,
  tenant_id uuid not null references organizations(id) on delete cascade,
  estado text not null check (estado in ('resuelto', 'ignorado')),
  user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists avisos_estado_tenant_idx on avisos_estado (tenant_id);

alter table avisos_estado enable row level security;
alter table avisos_estado force row level security;
drop policy if exists tenant_isolation on avisos_estado;
create policy tenant_isolation on avisos_estado
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
