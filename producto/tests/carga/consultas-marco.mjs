// Lo que hace cada petición de la app antes de pintar nada (requireApp(), src/server/ctx.ts): buscar la sesión (getSession(), src/server/session.ts) y el
// negocio del usuario (getOrg(), src/server/ctx.ts), dos transacciones sobre las tablas globales. Ni una ni otra se pueden llamar desde fuera de Next
// (leen la cookie de la petición), así que aquí van sus consultas copiadas tal cual. tests/unit/carga-copias.test.ts comprueba que siguen idénticas en
// su archivo: si alguien las cambia, esa prueba falla y esta copia se actualiza.
export const SESION = `select s.id, s.org_id, s.last_seen_at, u.id as user_id, u.name, u.email, u.email_verified_at, u.prefs, u.created_at
          from sessions s join users u on u.id = s.user_id
          where s.token_hash = $1 and s.expires_at > now()`;
export const ORG = `select o.id, o.name, m.role, o.briefing, o.onboarding_done_at, o.plan_status, o.trial_ends_at, o.past_due_since, o.stripe_customer_id, o.plan_tier, o.plan_interval
         from memberships m join organizations o on o.id = m.org_id
         where m.user_id = $1 order by (o.id = $2) desc, m.created_at asc limit 1`;
/** Dónde está cada consulta (para la prueba que vigila las copias). */
export const COPIAS = [{ archivo: "src/server/session.ts", fragmentos: [SESION] }, { archivo: "src/server/ctx.ts", fragmentos: [ORG] }];

/** Los dos viajes de cada petición. Con una sesión que no existe: busca el hash por su índice igual que con una real (solo cambia que no encuentra fila). */
export async function marcoDePeticion(ctx, { sys, one }) {
  await sys((c) => one(c, SESION, ["0".repeat(64)]));
  await sys((c) => one(c, ORG, [ctx.userId, ctx.tenantId]));
}
