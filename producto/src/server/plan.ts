// Reglas del plan. La prueba gratuita dura TRIAL_DAYS (14 por defecto). Al terminar sin suscripción, la app se bloquea:
// solo quedan la facturación (para suscribirse), la cuenta (exportar los datos, borrar el negocio) y salir.
export type PlanOrg = { planStatus: string; trialEndsAt: string | null; pastDueSince?: string | null };

/** Días de impago que se aguantan antes de bloquear (decidido por el propietario el 5/10/2026). Stripe reintenta el cobro durante ese tiempo. */
export const DIAS_DE_GRACIA = 5;

/** ¿Está bloqueado el negocio? Sí con la prueba terminada, con la suscripción cancelada o con 5 días de impago. Un cobro fallido
 *  reciente no bloquea: mientras tanto se avisa arriba con los días que quedan. */
export function bloqueado(org: PlanOrg, now = Date.now()): boolean {
  if (org.planStatus === "canceled") return true;
  if (org.planStatus === "past_due") return !!org.pastDueSince && new Date(org.pastDueSince).getTime() + DIAS_DE_GRACIA * 864e5 <= now;
  return org.planStatus === "trial" && !!org.trialEndsAt && new Date(org.trialEndsAt).getTime() <= now;
}

/** Días que quedan para actualizar el pago antes del bloqueo, redondeando hacia arriba (el último día cuenta como 1).
 *  null si no hay impago o no se sabe desde cuándo. */
export function diasDeGracia(org: PlanOrg, now = Date.now()): number | null {
  if (org.planStatus !== "past_due" || !org.pastDueSince) return null;
  return Math.max(0, Math.ceil((new Date(org.pastDueSince).getTime() + DIAS_DE_GRACIA * 864e5 - now) / 864e5));
}

/** Días de prueba que quedan, redondeando hacia arriba (el último día cuenta como 1). null si no está en prueba. */
export function diasDePrueba(org: PlanOrg, now = Date.now()): number | null {
  if (org.planStatus !== "trial" || !org.trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - now) / 864e5));
}

/** Aviso para la barra superior: solo cuando hay que hacer algo pronto. Con la prueba terminada no hay barra: la app está bloqueada. */
export function avisoPlan(org: PlanOrg, now = Date.now()): string | null {
  if (org.planStatus === "past_due") {
    const g = diasDeGracia(org, now);
    if (g == null || g === 0) return "No hemos podido cobrar tu suscripción.";
    return g === 1 ? "No hemos podido cobrar tu suscripción. Hoy es el último día para actualizar el pago antes de que se bloquee el acceso."
      : `No hemos podido cobrar tu suscripción. Tienes ${g} días para actualizar el pago antes de que se bloquee el acceso.`;
  }
  const d = diasDePrueba(org, now);
  if (d == null || d === 0 || d > 3) return null;
  return d === 1 ? "Hoy es el último día de tu prueba gratuita." : `Te quedan ${d} días de prueba gratuita.`;
}

/** Cómo se cuenta el plan en las pantallas (Mi local, Más): un título, una frase corta para la etiqueta, el tono y, si cuenta días, los que quedan. */
export type EstadoPlan = {
  clave: "prueba" | "terminada" | "activa" | "impago" | "cancelada";
  titulo: string;
  corto: string;
  tono: "ok" | "warn" | "bad" | null;
  /** Días de prueba que quedan (en prueba) o de plazo para actualizar el pago (con un cobro fallido). */
  dias: number | null;
};

const diasTxt = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function estadoPlan(org: PlanOrg, now = Date.now()): EstadoPlan {
  if (org.planStatus === "trial") {
    const d = diasDePrueba(org, now);
    if (d == null || d > 0) return { clave: "prueba", titulo: "Prueba gratuita", corto: d == null ? "Prueba gratuita" : `Prueba · ${diasTxt(d)}`, tono: d != null && d <= 3 ? "warn" : null, dias: d };
    return { clave: "terminada", titulo: "Prueba gratuita", corto: "Prueba terminada", tono: "bad", dias: 0 };
  }
  if (org.planStatus === "past_due") {
    const g = diasDeGracia(org, now);
    return { clave: "impago", titulo: "Pago pendiente", corto: g ? `Pago pendiente · ${diasTxt(g)}` : "Pago pendiente", tono: "bad", dias: g };
  }
  if (org.planStatus === "canceled") return { clave: "cancelada", titulo: "Suscripción", corto: "Suscripción cancelada", tono: "bad", dias: null };
  return { clave: "activa", titulo: "Suscripción", corto: "Suscripción activa", tono: "ok", dias: null };
}
