-- Desde cuándo el cobro de la suscripción está fallido. A los 5 días de impago la app se bloquea (src/server/plan.ts);
-- el aviso empieza el primer día. Es null mientras no haya impago (y en los negocios que ya estaban en impago antes de esta migración).
alter table organizations add column if not exists past_due_since timestamptz;
