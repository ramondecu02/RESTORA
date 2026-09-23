// Configuración leída del entorno en el momento de usarla (así las pruebas pueden cambiarla).
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
  get appUrl() { return (v("APP_URL") || "http://localhost:3100").replace(/\/+$/, ""); },
  get secureCookies() { return this.appUrl.startsWith("https://"); },
  get anthropicKey() { return v("ANTHROPIC_API_KEY"); },
  get ocrProvider(): "anthropic" | "mock" {
    const p = v("OCR_PROVIDER");
    if (p === "mock" || p === "anthropic") return p;
    return this.anthropicKey ? "anthropic" : "mock";
  },
  get ocrModel() { return v("OCR_MODEL") || "claude-sonnet-5"; },
  get ocrEscalateModel() { return v("OCR_ESCALATE_MODEL") || "claude-opus-5"; },
  get ocrEffort(): "low" | "medium" | "high" { const e = v("OCR_EFFORT"); return e === "medium" || e === "high" ? e : "low"; },
  get blobToken() { return v("BLOB_READ_WRITE_TOKEN"); },
  get resendKey() { return v("RESEND_API_KEY"); },
  get emailFrom() { return v("EMAIL_FROM") || "RESTORA <hola@restoraapp.app>"; },
  get emailProvider(): "resend" | "dev" {
    const p = v("EMAIL_PROVIDER");
    if (p === "resend" || p === "dev") return p;
    return this.resendKey ? "resend" : "dev";
  },
  get stripeKey() { return v("STRIPE_SECRET_KEY"); },
  get stripePrice() { return v("STRIPE_PRICE_ID"); },
  get stripeWebhookSecret() { return v("STRIPE_WEBHOOK_SECRET"); },
  get trialDays() { const n = Number(v("TRIAL_DAYS")); return Number.isFinite(n) && n > 0 ? n : 14; },
  get isProd() { return process.env.NODE_ENV === "production"; },
  /** Buzón de pruebas en /dev/correo: solo fuera de producción o si se activa a propósito. */
  get devMailbox() { return this.emailProvider === "dev" && (!this.isProd || v("ALLOW_DEV_MAILBOX") === "1"); },
};
