// Configuración leída del entorno en el momento de usarla (así las pruebas pueden cambiarla).
import { maxLecturasMes } from "@/lib/limits";

const v = (k: string) => (process.env[k] ?? "").trim();

export const env = {
  get databaseUrl() { return v("DATABASE_URL"); },
  get authSecret() {
    const s = v("AUTH_SECRET");
    if (!s) {
      if (process.env.NODE_ENV === "production") throw new Error("Falta AUTH_SECRET");
      return "dev-secret-no-usar-en-produccion";
    }
    return s;
  },
  get appUrl() {
    const vercel = v("VERCEL_PROJECT_PRODUCTION_URL"); // lo pone Vercel; APP_URL manda si está definida
    return (v("APP_URL") || (vercel ? "https://" + vercel : "http://localhost:3100")).replace(/\/+$/, "");
  },
  get secureCookies() { return this.appUrl.startsWith("https://"); },
  get anthropicKey() { return v("ANTHROPIC_API_KEY"); },
  /** "mock" (lecturas de ejemplo) solo si se pide expresamente o fuera de producción: en producción, sin clave,
   *  la lectura queda desactivada ("off") en vez de rellenar albaranes reales con datos inventados. */
  get ocrProvider(): "anthropic" | "mock" | "off" {
    const p = v("OCR_PROVIDER");
    if (p === "mock") return "mock";
    if (this.anthropicKey) return "anthropic";
    return p === "anthropic" || this.isProd ? "off" : "mock";
  },
  get ocrModel() { return v("OCR_MODEL") || "claude-sonnet-5-5"; },
  get ocrEscalateModel() { return v("OCR_ESCALATE_MODEL") || "claude-opus-5-5"; },
  /** Esfuerzo de la primera lectura: en un albarán un dígito mal leído sale caro, así que «medium» por defecto. */
  get ocrEffort(): "low" | "medium" | "high" { const e = v("OCR_EFFORT"); return e === "low" || e === "high" ? e : "medium"; },
  get blobToken() { return v("BLOB_READ_WRITE_TOKEN"); },
  /** Lo pone Vercel al conectar un Blob store nuevo: el SDK se autentica con OIDC, sin token fijo. */
  get blobStoreId() { return v("BLOB_STORE_ID"); },
  get resendKey() { return v("RESEND_API_KEY"); },
  /** Sin dominio verificado en Resend solo vale su remitente de pruebas, que envía únicamente al email de la
   *  cuenta de Resend. Con restoraapp.app verificado: EMAIL_FROM=RESTORA <hola@restoraapp.app>. */
  get emailFrom() { return v("EMAIL_FROM") || "RESTORA <onboarding@resend.dev>"; },
  get emailProvider(): "resend" | "dev" {
    const p = v("EMAIL_PROVIDER");
    if (p === "resend" || p === "dev") return p;
    return this.resendKey ? "resend" : "dev";
  },
  get stripeKey() { return v("STRIPE_SECRET_KEY"); },
  get stripePrice() { return v("STRIPE_PRICE_ID"); },
  get stripeWebhookSecret() { return v("STRIPE_WEBHOOK_SECRET"); },
  /** Tope mensual de lecturas con IA por negocio (1.500 si no se indica; 0 apaga la lectura). Ver «Tope mensual de lecturas» en docs/DESPLIEGUE.md. */
  get maxLecturasMes() { return maxLecturasMes(process.env.MAX_LECTURAS_MES); },
  get trialDays() { const n = Number(v("TRIAL_DAYS")); return Number.isFinite(n) && n > 0 ? n : 14; },
  get isProd() { return process.env.NODE_ENV === "production"; },
  /** Buzón de pruebas en /dev/correo: solo fuera de producción o si se activa a propósito. */
  get devMailbox() { return this.emailProvider === "dev" && (!this.isProd || v("ALLOW_DEV_MAILBOX") === "1"); },
};
