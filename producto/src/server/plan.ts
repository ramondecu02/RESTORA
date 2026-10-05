// Reglas del plan. La prueba gratuita dura TRIAL_DAYS (14 por defecto). Al terminar sin suscripción, la app se bloquea:
// solo quedan la facturación (para suscribirse), la cuenta (exportar los datos, borrar el negocio) y salir.
export type PlanOrg = { planStatus: string; trialEndsAt: string | null };

/** ¿Está bloqueado el negocio? Sí con la prueba terminada o con la suscripción cancelada. Un cobro fallido (past_due) no
 *  bloquea: Stripe reintenta el pago durante unos días y mientras tanto se avisa arriba. */
export function bloqueado(org: PlanOrg, now = Date.now()): boolean {
  if (org.planStatus === "canceled") return true;
  return org.planStatus === "trial" && !!org.trialEndsAt && new Date(org.trialEndsAt).getTime() <= now;
}

/** Días de prueba que quedan, redondeando hacia arriba (el último día cuenta como 1). null si no está en prueba. */
export function diasDePrueba(org: PlanOrg, now = Date.now()): number | null {
  if (org.planStatus !== "trial" || !org.trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - now) / 864e5));
}

/** Aviso para la barra superior: solo cuando hay que hacer algo pronto. Con la prueba terminada no hay barra: la app está bloqueada. */
export function avisoPlan(org: PlanOrg, now = Date.now()): string | null {
  if (org.planStatus === "past_due") return "No hemos podido cobrar tu suscripción.";
  const d = diasDePrueba(org, now);
  if (d == null || d === 0 || d > 3) return null;
  return d === 1 ? "Hoy es el último día de tu prueba gratuita." : `Te quedan ${d} días de prueba gratuita.`;
}
