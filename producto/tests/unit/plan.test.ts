import { describe, expect, it } from "vitest";
import { avisoPlan, bloqueado, DIAS_DE_GRACIA, diasDeGracia, diasDePrueba } from "@/server/plan";

const NOW = Date.UTC(2026, 9, 5, 12);
const en = (dias: number) => new Date(NOW + dias * 864e5).toISOString();

describe("plan: prueba gratuita y bloqueo", () => {
  it("durante la prueba no bloquea; al terminar, sí", () => {
    expect(bloqueado({ planStatus: "trial", trialEndsAt: en(5) }, NOW)).toBe(false);
    expect(bloqueado({ planStatus: "trial", trialEndsAt: en(0) }, NOW)).toBe(true);
    expect(bloqueado({ planStatus: "trial", trialEndsAt: en(-3) }, NOW)).toBe(true);
  });

  it("con suscripción activa o con un cobro pendiente no bloquea; cancelada, sí", () => {
    expect(bloqueado({ planStatus: "active", trialEndsAt: en(-30) }, NOW)).toBe(false);
    expect(bloqueado({ planStatus: "past_due", trialEndsAt: en(-30) }, NOW)).toBe(false);
    expect(bloqueado({ planStatus: "canceled", trialEndsAt: en(30) }, NOW)).toBe(true);
  });

  it("un negocio sin fecha de fin de prueba no se bloquea", () => {
    expect(bloqueado({ planStatus: "trial", trialEndsAt: null }, NOW)).toBe(false);
  });

  it("cuenta los días que quedan redondeando hacia arriba", () => {
    expect(diasDePrueba({ planStatus: "trial", trialEndsAt: en(14) }, NOW)).toBe(14);
    expect(diasDePrueba({ planStatus: "trial", trialEndsAt: en(0.2) }, NOW)).toBe(1);
    expect(diasDePrueba({ planStatus: "trial", trialEndsAt: en(-1) }, NOW)).toBe(0);
    expect(diasDePrueba({ planStatus: "active", trialEndsAt: en(5) }, NOW)).toBeNull();
  });

  it("avisa arriba solo los tres últimos días de prueba y con un cobro fallido", () => {
    expect(avisoPlan({ planStatus: "trial", trialEndsAt: en(10) }, NOW)).toBeNull();
    expect(avisoPlan({ planStatus: "trial", trialEndsAt: en(3) }, NOW)).toBe("Te quedan 3 días de prueba gratuita.");
    expect(avisoPlan({ planStatus: "trial", trialEndsAt: en(0.5) }, NOW)).toBe("Hoy es el último día de tu prueba gratuita.");
    expect(avisoPlan({ planStatus: "trial", trialEndsAt: en(-1) }, NOW)).toBeNull();
    expect(avisoPlan({ planStatus: "past_due", trialEndsAt: null }, NOW)).toBe("No hemos podido cobrar tu suscripción.");
    expect(avisoPlan({ planStatus: "active", trialEndsAt: en(-20) }, NOW)).toBeNull();
  });
});

describe("plan: impago con 5 días de gracia (decidido el 5/10/2026)", () => {
  const impago = (hace: number) => ({ planStatus: "past_due", trialEndsAt: null, pastDueSince: en(-hace) });

  it("la gracia es de 5 días", () => {
    expect(DIAS_DE_GRACIA).toBe(5);
  });

  it("el día del impago y hasta el cuarto día no bloquea; a los 5 días, sí", () => {
    expect(bloqueado(impago(0), NOW)).toBe(false);
    expect(bloqueado(impago(2), NOW)).toBe(false);
    expect(bloqueado(impago(4.9), NOW)).toBe(false);
    expect(bloqueado(impago(5), NOW)).toBe(true);
    expect(bloqueado(impago(9), NOW)).toBe(true);
  });

  it("sin saber desde cuándo (negocios en impago anteriores a la migración) no se bloquea", () => {
    expect(bloqueado({ planStatus: "past_due", trialEndsAt: null }, NOW)).toBe(false);
    expect(bloqueado({ planStatus: "past_due", trialEndsAt: null, pastDueSince: null }, NOW)).toBe(false);
  });

  it("al pagar (active) o con la prueba vigente, una fecha de impago antigua no cuenta", () => {
    expect(bloqueado({ planStatus: "active", trialEndsAt: null, pastDueSince: en(-30) }, NOW)).toBe(false);
  });

  it("cuenta los días que quedan para actualizar el pago, redondeando hacia arriba", () => {
    expect(diasDeGracia(impago(0), NOW)).toBe(5);
    expect(diasDeGracia(impago(1), NOW)).toBe(4);
    expect(diasDeGracia(impago(4.5), NOW)).toBe(1);
    expect(diasDeGracia(impago(5), NOW)).toBe(0);
    expect(diasDeGracia(impago(8), NOW)).toBe(0);
    expect(diasDeGracia({ planStatus: "active", trialEndsAt: null, pastDueSince: en(-1) }, NOW)).toBeNull();
    expect(diasDeGracia({ planStatus: "past_due", trialEndsAt: null }, NOW)).toBeNull();
  });

  it("el aviso de arriba dice cuántos días quedan y el último día lo dice claro", () => {
    expect(avisoPlan(impago(0), NOW)).toBe("No hemos podido cobrar tu suscripción. Tienes 5 días para actualizar el pago antes de que se bloquee el acceso.");
    expect(avisoPlan(impago(2), NOW)).toContain("Tienes 3 días");
    expect(avisoPlan(impago(4.5), NOW)).toBe("No hemos podido cobrar tu suscripción. Hoy es el último día para actualizar el pago antes de que se bloquee el acceso.");
    expect(avisoPlan({ planStatus: "past_due", trialEndsAt: null }, NOW)).toBe("No hemos podido cobrar tu suscripción.");
  });
});
