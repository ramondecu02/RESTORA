import { describe, expect, it } from "vitest";
import { ahorroAnual, AVISO_CUPO, cupoLecturas, LECTURAS_PRUEBA, localesDe, mensajeCupoPlan, nombrePlan, planDe, PLANES, precioDe } from "@/lib/planes";

describe("planes Premium, Pro y Max", () => {
  it("precios y límites decididos por el propietario (sin IVA)", () => {
    expect(PLANES.premium).toMatchObject({ mensual: 49.9, anual: 490.9, albaranes: 80, locales: 1 });
    expect(PLANES.pro).toMatchObject({ mensual: 89.9, anual: 839.9, albaranes: 250, locales: 2 });
    expect(PLANES.max).toMatchObject({ mensual: 149.9, anual: 1390.9, albaranes: 450, locales: 5 });
    expect(precioDe("pro", "month")).toBe(89.9);
    expect(precioDe("pro", "year")).toBe(839.9);
  });
  it("el plan anual sale más barato que doce meses en los tres planes", () => {
    for (const t of ["premium", "pro", "max"] as const) expect(ahorroAnual(t).ahorro).toBeGreaterThan(0);
    expect(ahorroAnual("premium")).toEqual({ ahorro: 107.9, meses: 2.2 });
    expect(ahorroAnual("pro")).toEqual({ ahorro: 238.9, meses: 2.7 });
    expect(ahorroAnual("max")).toEqual({ ahorro: 407.9, meses: 2.7 });
  });
  it("en prueba manda el cupo de la prueba; con suscripción, el del plan; sin plan guardado se trata como Premium", () => {
    expect(planDe({ planStatus: "trial" })).toBeNull();
    expect(cupoLecturas({ planStatus: "trial" })).toBe(LECTURAS_PRUEBA);
    expect(cupoLecturas({ planStatus: "active", planTier: "pro" })).toBe(250);
    expect(cupoLecturas({ planStatus: "past_due", planTier: "max" })).toBe(450);
    expect(cupoLecturas({ planStatus: "active", planTier: null })).toBe(80);
    expect(localesDe({ planStatus: "active", planTier: "max" })).toBe(5);
    expect(localesDe({ planStatus: "trial" })).toBe(1);
    expect(nombrePlan({ planStatus: "active", planTier: "pro" })).toBe("Pro");
    expect(nombrePlan({ planStatus: "trial" })).toBe("Prueba gratuita");
  });
  it("el mensaje del cupo explica qué pasa y qué hacer, sin cortar lo manual", () => {
    const m = mensajeCupoPlan({ planStatus: "active", planTier: "premium" }, 80);
    expect(m).toContain("plan Premium");
    expect(m).toContain("(80)");
    expect(m).toMatch(/apuntando a mano/);
    expect(m).toMatch(/Facturación/);
    expect(mensajeCupoPlan({ planStatus: "trial" }, 100)).toContain("de la prueba gratuita");
  });
  it("se avisa al 80 %", () => { expect(AVISO_CUPO).toBe(0.8); });
});
