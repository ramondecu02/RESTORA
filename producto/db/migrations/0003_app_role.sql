-- Rol sin privilegios con el que se ejecuta cada transacción de negocio (SET LOCAL ROLE).
-- Así las políticas RLS se aplican siempre, aunque el usuario de conexión sea el propietario
-- de las tablas o tenga BYPASSRLS (como el rol por defecto de Neon).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'restora_app') then
    create role restora_app nologin nosuperuser nobypassrls noinherit;
  end if;
end $$;

grant restora_app to current_user;
grant usage on schema public to restora_app;
grant select, insert, update, delete on all tables in schema public to restora_app;
grant usage, select on all sequences in schema public to restora_app;
alter default privileges in schema public grant select, insert, update, delete on tables to restora_app;
alter default privileges in schema public grant usage, select on sequences to restora_app;
