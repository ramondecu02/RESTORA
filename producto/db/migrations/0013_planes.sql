-- Planes de pago (Premium, Pro, Max) y su periodicidad. Solo añade columnas: los negocios que ya existen quedan sin plan (NULL),
-- que en la prueba significa «prueba gratuita» y, con una suscripción activada a mano, se trata como Premium hasta que Stripe diga otra cosa.
alter table organizations add column if not exists plan_tier text check (plan_tier in ('premium', 'pro', 'max'));
alter table organizations add column if not exists plan_interval text check (plan_interval in ('month', 'year'));
