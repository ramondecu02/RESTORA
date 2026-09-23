-- RESTORA · esquema base
-- Tablas globales (sin RLS): usuarios, sesiones, negocios, membresías, catálogo base, capa anónima.
-- Tablas de negocio (con RLS por tenant_id): todo lo que pertenece a un negocio.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  password_hash text not null,
  email_verified_at timestamptz,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_uq on users (lower(email));

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  briefing jsonb not null default '{}'::jsonb,
  onboarding_done_at timestamptz,
  plan_status text not null default 'trial' check (plan_status in ('trial','active','past_due','canceled')),
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('propietario','cocina','costes')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists memberships_user_idx on memberships (user_id);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text not null default ''
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null check (purpose in ('verify','reset')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_codes_user_idx on email_codes (user_id, purpose);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('propietario','cocina','costes')),
  token_hash text not null unique,
  invited_by uuid references users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invitations_org_idx on invitations (org_id);

create table if not exists rate_limits (
  key text primary key,
  count int not null,
  window_start timestamptz not null
);

create table if not exists outbox_emails (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body_text text not null,
  body_html text not null default '',
  provider text not null,
  status text not null,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- Catálogo base del sector (compartido, sin datos de clientes)
create table if not exists catalog_categories (
  id text primary key,
  name text not null,
  singular text not null,
  iva int not null,
  kind text not null default 'cocina' check (kind in ('cocina','bebida','otros')),
  orden int not null default 0
);
create table if not exists catalog_items (
  id text primary key,
  name text not null,
  category_id text not null references catalog_categories(id),
  unit text not null check (unit in ('kg','L','ud')),
  rend numeric(5,2) not null default 100,
  aliases text[] not null default '{}'
);

-- Capa de agregación anónima (k-anonimato). Sin tenant_id: el contribuyente es un HMAC no reversible.
create table if not exists bench_price_obs (
  id bigserial primary key,
  catalog_item_id text not null references catalog_items(id),
  unit text not null,
  price_per_unit numeric(14,4) not null,
  week date not null,
  region text not null default '',
  contributor text not null,
  created_at timestamptz not null default now()
);
create index if not exists bench_obs_item_week on bench_price_obs (catalog_item_id, week);
create or replace view bench_price_k as
  select catalog_item_id, unit, week, region,
         count(*) as n_obs,
         count(distinct contributor) as n_contrib,
         percentile_cont(0.25) within group (order by price_per_unit) as p25,
         percentile_cont(0.5) within group (order by price_per_unit) as p50,
         percentile_cont(0.75) within group (order by price_per_unit) as p75
  from bench_price_obs
  group by catalog_item_id, unit, week, region
  having count(distinct contributor) >= 5;

-- ================= Tablas de negocio (RLS) =================
create table if not exists locales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text not null default '',
  postal_code text not null default '',
  iva_venta int not null default 10,
  currency text not null default 'EUR',
  fc_objetivo numeric(5,2) not null default 30,
  ciudad text not null default '',
  lema text not null default '',
  comensales_dia int,
  created_at timestamptz not null default now()
);
create index if not exists locales_tenant_idx on locales (tenant_id);

create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  name text not null,
  empresa text not null default '',
  tipo text not null default '',
  cif text not null default '',
  responsable text not null default '',
  phone text not null default '',
  email text not null default '',
  direccion text not null default '',
  entrega text not null default '',
  notas text not null default '',
  origen text not null default 'manual' check (origen in ('alta','manual','albaran')),
  demo boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists proveedores_local_idx on proveedores (tenant_id, local_id);
create unique index if not exists proveedores_name_uq on proveedores (local_id, lower(name)) where not archived;

create table if not exists articulos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  name text not null,
  category_id text not null references catalog_categories(id),
  catalog_item_id text references catalog_items(id),
  unit text not null check (unit in ('kg','L','ud')),
  rend numeric(5,2) not null default 100 check (rend > 0 and rend <= 100),
  iva int not null,
  stock_min numeric(14,3),
  consumo_semanal numeric(14,3),
  track_stock boolean not null default true,
  stock numeric(14,3) not null default 0,
  pmp numeric(14,6),
  last_price numeric(14,6),
  last_proveedor_id uuid references proveedores(id) on delete set null,
  last_purchase_at timestamptz,
  precio_manual numeric(14,6),
  precio_manual_at timestamptz,
  proveedor_pref_id uuid references proveedores(id) on delete set null,
  aliases text[] not null default '{}',
  foto_key text,
  demo boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articulos_local_idx on articulos (tenant_id, local_id);
create unique index if not exists articulos_name_uq on articulos (local_id, lower(name)) where not archived;

create table if not exists articulo_proveedor (
  tenant_id uuid not null references organizations(id) on delete cascade,
  articulo_id uuid not null references articulos(id) on delete cascade,
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  unidad_compra text not null default '',
  factor numeric(14,6) not null default 1,
  precio numeric(14,6),
  precio_unit numeric(14,6),
  fecha date,
  documento_id uuid,
  origen text not null default 'albaran' check (origen in ('albaran','cotizacion')),
  nota text not null default '',
  primary key (articulo_id, proveedor_id)
);

create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  kind text not null check (kind in ('albaran','factura','carta','ventas')),
  status text not null check (status in ('subido','leyendo','revisar','guardado','error','descartado')),
  source text not null default 'ocr' check (source in ('ocr','manual')),
  proveedor_id uuid references proveedores(id) on delete set null,
  numero text,
  fecha date,
  base numeric(14,2),
  cuota numeric(14,2),
  total numeric(14,2),
  draft jsonb,
  ocr jsonb,
  ocr_model text,
  ocr_input_tokens int,
  ocr_output_tokens int,
  ocr_cost_usd numeric(10,5),
  ocr_ms int,
  ocr_error text,
  pages int not null default 0,
  demo boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  saved_at timestamptz
);
create index if not exists documentos_local_idx on documentos (tenant_id, local_id, created_at desc);

create table if not exists documento_archivos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  documento_id uuid not null references documentos(id) on delete cascade,
  idx int not null,
  storage_key text not null,
  mime text not null,
  bytes int not null,
  name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists documento_archivos_doc_idx on documento_archivos (documento_id);

create table if not exists compra_lineas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  documento_id uuid not null references documentos(id) on delete cascade,
  idx int not null,
  texto text not null default '',
  articulo_id uuid not null references articulos(id),
  cantidad numeric(14,3) not null,
  unidad_compra text not null,
  factor numeric(14,6) not null,
  precio numeric(14,6) not null,
  descuento numeric(6,3) not null default 0,
  bonificadas numeric(14,3) not null default 0,
  importe numeric(14,4) not null,
  iva int not null,
  coste_unit numeric(14,6) not null
);
create index if not exists compra_lineas_doc_idx on compra_lineas (documento_id);
create index if not exists compra_lineas_art_idx on compra_lineas (articulo_id);

create table if not exists stock_movimientos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  articulo_id uuid not null references articulos(id) on delete cascade,
  tipo text not null check (tipo in ('inicial','compra','venta','merma','desecho','devolucion','perdida','invitacion','ajuste')),
  cantidad numeric(14,3) not null,
  coste_unit numeric(14,6),
  ref_tipo text,
  ref_id uuid,
  nota text not null default '',
  fecha timestamptz not null default now(),
  created_by uuid references users(id) on delete set null
);
create index if not exists stock_mov_art_idx on stock_movimientos (articulo_id, fecha);
create index if not exists stock_mov_ref_idx on stock_movimientos (ref_id);

create table if not exists precio_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  articulo_id uuid not null references articulos(id) on delete cascade,
  proveedor_id uuid references proveedores(id) on delete set null,
  documento_id uuid references documentos(id) on delete cascade,
  precio_anterior numeric(14,6) not null,
  precio_nuevo numeric(14,6) not null,
  variacion numeric(10,5) not null,
  fecha date not null,
  created_at timestamptz not null default now()
);
create index if not exists precio_eventos_idx on precio_eventos (tenant_id, fecha desc);

create table if not exists recetas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  tipo text not null check (tipo in ('elaboracion','plato','menu')),
  name text not null,
  familia text not null default '',
  raciones numeric(10,3) not null default 1 check (raciones > 0),
  rinde numeric(14,3) not null default 1 check (rinde > 0),
  rinde_unit text not null default 'kg' check (rinde_unit in ('kg','L','ud')),
  fc_objetivo numeric(5,2),
  pvp numeric(10,2),
  reventa boolean not null default false,
  coste_manual numeric(14,6),
  margen_objetivo numeric(5,2),
  ventas_mes numeric(12,2) not null default 0,
  en_carta boolean not null default true,
  orden int not null default 0,
  estado text not null default 'borrador' check (estado in ('borrador','activo')),
  foto_key text,
  descripcion text not null default '',
  notas text not null default '',
  coste_cache numeric(14,6),
  demo boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recetas_local_idx on recetas (tenant_id, local_id, tipo);

create table if not exists receta_lineas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  receta_id uuid not null references recetas(id) on delete cascade,
  idx int not null,
  articulo_id uuid references articulos(id),
  subreceta_id uuid references recetas(id),
  cantidad numeric(14,4) not null check (cantidad >= 0),
  unidad text not null default 'kg' check (unidad in ('g','kg','ml','L','ud')),
  check ((articulo_id is null) <> (subreceta_id is null))
);
create index if not exists receta_lineas_receta_idx on receta_lineas (receta_id);
create index if not exists receta_lineas_art_idx on receta_lineas (articulo_id);
create index if not exists receta_lineas_sub_idx on receta_lineas (subreceta_id);

create table if not exists ventas_importes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  fuente text not null default '',
  filename text not null default '',
  desde date,
  hasta date,
  filas int not null default 0,
  total numeric(14,2) not null default 0,
  comensales int,
  demo boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists ventas_alias (
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  nombre_norm text not null,
  receta_id uuid not null references recetas(id) on delete cascade,
  primary key (local_id, nombre_norm)
);

create table if not exists ventas_lineas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  import_id uuid not null references ventas_importes(id) on delete cascade,
  fecha date not null,
  nombre text not null,
  receta_id uuid references recetas(id) on delete set null,
  unidades numeric(12,3) not null,
  importe numeric(14,2) not null,
  neto numeric(14,4) not null,
  coste_unit numeric(14,6),
  coste_total numeric(14,4)
);
create index if not exists ventas_lineas_idx on ventas_lineas (tenant_id, local_id, fecha);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  local_id uuid not null references locales(id) on delete cascade,
  proveedor_id uuid references proveedores(id) on delete set null,
  estado text not null default 'borrador' check (estado in ('borrador','enviado','recibido','cancelado')),
  notas text not null default '',
  demo boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  enviado_at timestamptz,
  recibido_at timestamptz
);
create table if not exists pedido_lineas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references organizations(id) on delete cascade,
  pedido_id uuid not null references pedidos(id) on delete cascade,
  articulo_id uuid not null references articulos(id) on delete cascade,
  cantidad numeric(14,3) not null,
  unidad text not null,
  precio_estimado numeric(14,6)
);

create table if not exists audit_log (
  id bigserial primary key,
  tenant_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_idx on audit_log (tenant_id, created_at desc);

-- ================= Seguridad por fila =================
do $$
declare t text;
begin
  foreach t in array array['locales','proveedores','articulos','articulo_proveedor','documentos','documento_archivos',
    'compra_lineas','stock_movimientos','precio_eventos','recetas','receta_lineas',
    'ventas_importes','ventas_alias','ventas_lineas','pedidos','pedido_lineas','audit_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_isolation on %I', t);
    execute format($p$create policy tenant_isolation on %I
      using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
      with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  end loop;
end $$;
