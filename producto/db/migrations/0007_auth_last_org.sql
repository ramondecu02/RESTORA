-- Último negocio elegido por cada usuario (al aceptar una invitación, crear un negocio o cambiar de negocio
-- en Más). Al entrar se abre ese si sigue siendo miembro; si no, aquel al que se unió más recientemente.
alter table users add column if not exists last_org_id uuid references organizations(id) on delete set null;
