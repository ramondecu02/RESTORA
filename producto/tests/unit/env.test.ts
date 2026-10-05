import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/server/env";

// Para publicar basta con AUTH_SECRET y RESEND_API_KEY: el resto tiene un valor por defecto que funciona
const VARS = ["EMAIL_FROM", "TRIAL_DAYS", "EMAIL_PROVIDER", "RESEND_API_KEY", "ALLOW_DEV_MAILBOX"] as const;
const antes = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
afterEach(() => { vi.unstubAllEnvs(); for (const k of VARS) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } });

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

  it("sin TRIAL_DAYS la prueba dura 14 días", () => {
    delete process.env.TRIAL_DAYS;
    expect(env.trialDays).toBe(14);
    process.env.TRIAL_DAYS = "30";
    expect(env.trialDays).toBe(30);
  });

  // /dev/correo enseña los correos (con sus códigos de acceso) de TODOS los negocios: en producción solo puede existir a propósito
  it("el buzón de pruebas (/dev/correo) no existe en producción salvo que se active a propósito", () => {
    const con = ({ NODE_ENV, ...v }: Record<string, string | undefined>) => {
      for (const k of VARS) delete process.env[k];
      for (const [k, x] of Object.entries(v)) if (x !== undefined) process.env[k] = x;
      vi.stubEnv("NODE_ENV", NODE_ENV ?? "test");
      return env.devMailbox;
    };
    expect(con({ NODE_ENV: "production" })).toBe(false); // sin Resend el correo es «dev», pero en producción el buzón sigue cerrado
    expect(con({ NODE_ENV: "production", EMAIL_PROVIDER: "dev" })).toBe(false);
    expect(con({ NODE_ENV: "production", RESEND_API_KEY: "re_x", ALLOW_DEV_MAILBOX: "1" })).toBe(false); // con proveedor real no hay buzón
    expect(con({ NODE_ENV: "production", EMAIL_PROVIDER: "dev", ALLOW_DEV_MAILBOX: "true" })).toBe(false); // solo vale «1»
    expect(con({ NODE_ENV: "production", EMAIL_PROVIDER: "dev", ALLOW_DEV_MAILBOX: "1" })).toBe(true);
    expect(con({ NODE_ENV: "development" })).toBe(true);
    expect(con({ NODE_ENV: "development", RESEND_API_KEY: "re_x" })).toBe(false);
  });
});
