-- Defensa en profundidad: dentro de una transacción de negocio (rol restora_app) solo se accede a las
-- tablas del negocio, protegidas por RLS. Las tablas globales (cuentas, sesiones, códigos, invitaciones,
-- pagos) se usan únicamente fuera de ese rol. De los usuarios solo se puede leer el nombre, para mostrar
-- quién registró cada albarán.
revoke all on users, sessions, email_codes, invitations, memberships, organizations, outbox_emails,
  rate_limits, stripe_events, schema_migrations from restora_app;
grant select (id, name) on users to restora_app;
