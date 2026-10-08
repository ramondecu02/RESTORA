// Planes de pago de RESTORA (decididos por el propietario el 8/10/2026). Precios SIN IVA: el IVA se añade aparte.
// Los límites de albaranes y de locales son los que él aprobó; los de usuarios y funciones no se limitan por plan todavía.
import { CONTACTO_EMAIL } from "./contacto";
import { num } from "./format";

export type Tier = "premium" | "pro" | "max";
export type Intervalo = "month" | "year";
export const TIERS: Tier[] = ["premium", "pro", "max"];

export type Plan = {
  tier: Tier; nombre: string; resumen: string;
  /** €/mes sin IVA */ mensual: number;
  /** €/año sin IVA */ anual: number;
  /** Lecturas con IA (albaranes, facturas y cartas) al mes, compartidas por todos los locales del plan */ albaranes: number;
  /** Locales que incluye el plan */ locales: number;
};

export const PLANES: Record<Tier, Plan> = {
  premium: { tier: "premium", nombre: "Premium", resumen: "Para un solo local", mensual: 49.9, anual: 490.9, albaranes: 80, locales: 1 },
  pro: { tier: "pro", nombre: "Pro", resumen: "Para el restaurante que crece", mensual: 89.9, anual: 839.9, albaranes: 250, locales: 2 },
  max: { tier: "max", nombre: "Max", resumen: "Para grupos más grandes", mensual: 149.9, anual: 1390.9, albaranes: 450, locales: 5 },
};

/** Lecturas con IA durante la prueba gratuita de 14 días: acota el coste (≈ 8 céntimos cada una) sin estorbar a quien prueba con sus albaranes. */
export const LECTURAS_PRUEBA = 100;
/** A partir de este porcentaje del cupo se avisa de que se está acabando. */
export const AVISO_CUPO = 0.8;

export const esTier = (x: unknown): x is Tier => typeof x === "string" && (TIERS as string[]).includes(x);
export const esIntervalo = (x: unknown): x is Intervalo => x === "month" || x === "year";

/** Lo que paga el cliente por periodo (sin IVA). */
export const precioDe = (tier: Tier, intervalo: Intervalo) => (intervalo === "year" ? PLANES[tier].anual : PLANES[tier].mensual);
/** Cuánto ahorra con el plan anual frente a pagar doce meses, y a cuántos meses gratis equivale. */
export function ahorroAnual(tier: Tier) {
  const p = PLANES[tier], ahorro = Math.round((p.mensual * 12 - p.anual) * 100) / 100;
  return { ahorro, meses: Math.round((ahorro / p.mensual) * 10) / 10 };
}

export type OrgPlan = { planStatus: string; planTier?: Tier | null };
/**
 * Plan que se aplica a un negocio. En prueba (o con la prueba terminada) no hay plan: manda el cupo de la prueba. Con suscripción
 * viva sin plan guardado (activada a mano antes de existir los planes) se trata como Premium: el límite más bajo, para no regalar nada.
 */
export function planDe(org: OrgPlan): Plan | null {
  if (org.planStatus === "trial") return null;
  return PLANES[org.planTier && esTier(org.planTier) ? org.planTier : "premium"];
}
/** Lecturas con IA que permite el plan del negocio este mes. */
export const cupoLecturas = (org: OrgPlan) => planDe(org)?.albaranes ?? LECTURAS_PRUEBA;
export const localesDe = (org: OrgPlan) => planDe(org)?.locales ?? 1;
export const nombrePlan = (org: OrgPlan) => planDe(org)?.nombre ?? "Prueba gratuita";

/** Mensaje al llegar al cupo del plan: qué pasa, que apuntar a mano sigue funcionando y qué hacer. */
export function mensajeCupoPlan(org: OrgPlan, max: number): string {
  const sinPlan = planDe(org) == null;
  return `Has llegado al cupo de lecturas automáticas ${sinPlan ? "de la prueba gratuita" : `de tu plan ${nombrePlan(org)}`} (${num(max, 0)}). Puedes seguir apuntando a mano tus albaranes y tus platos. ${sinPlan ? "Elige un plan en Facturación para seguir leyendo documentos con IA" : "Cambia de plan en Facturación para tener más lecturas"}, o escribe a ${CONTACTO_EMAIL}. El contador vuelve a cero el día 1 de cada mes.`;
}
/** Texto del aviso previo, cuando ya se ha usado el 80 % del cupo. */
export const avisoCupo = (usadas: number, max: number) => `Llevas ${num(usadas, 0)} de ${num(max, 0)} lecturas automáticas este mes. Al llegar al cupo podrás seguir apuntando a mano.`;
