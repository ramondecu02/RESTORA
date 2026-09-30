import { afterEach, describe, expect, it } from "vitest";
import { env } from "@/server/env";

// Para publicar basta con AUTH_SECRET y RESEND_API_KEY: el resto tiene un valor por defecto que funciona
const VARS = ["EMAIL_FROM", "TRIAL_DAYS", "EMAIL_PROVIDER", "RESEND_API_KEY"] as const;
const antes = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
afterEach(() => { for (const k of VARS) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } });

describe("configuración por defecto", () => {
  it("sin EMAIL_FROM usa el remitente de pruebas de Resend", () => {
    delete process.env.EMAIL_FROM;
    expect(env.emailFrom).toBe("RESTORA <onboarding@resend.dev>");
    process.env.EMAIL_FROM = "RESTORA <hola@restoraapp.app>";
    expect(env.emailFrom).toBe("RESTORA <hola@restoraapp.app>");
  });

  it("con RESEND_API_KEY el correo sale por Resend aunque no haya EMAIL_PROVIDER", () => {
    delete process.env.EMAIL_PROVIDER;
    process.env.RESEND_API_KEY = "re_prueba";
    expect(env.emailProvider).toBe("resend");
  });

  it("sin TRIAL_DAYS la prueba dura 90 días", () => {
    delete process.env.TRIAL_DAYS;
    expect(env.trialDays).toBe(90);
    process.env.TRIAL_DAYS = "30";
    expect(env.trialDays).toBe(30);
  });
});
