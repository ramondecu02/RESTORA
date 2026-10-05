import { describe, expect, it } from "vitest";
import { avisoPlan, bloqueado, diasDePrueba } from "@/server/plan";

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
