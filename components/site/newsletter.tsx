"use client";

import { useState } from "react";
import { Check, Download, FileText } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { LEAD_MAGNET } from "@/lib/site";

type Status = "idle" | "loading" | "success" | "error";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Email in exchange for a real, downloadable resource (the food-cost
 * checklist PDF). The download is offered right after the sign-up, so nothing
 * depends on an email automation existing yet.
 */
export function NewsletterSignup({ nl, locale }: { nl: SiteCopy["newsletter"]; locale: Locale }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = nl.errEmail;
    if (!consent) next.consent = nl.errConsent;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "newsletter", email, consent: true, lang: locale, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="card" style={{ padding: 26, border: "1.5px solid var(--brand)" }} role="status">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", color: "var(--on-brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={20} strokeWidth={2.6} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{nl.doneTitle}</div>
            <p style={{ margin: "4px 0 0", fontSize: 14.5, color: "var(--muted)" }}>{nl.doneBody}</p>
          </div>
        </div>
        <a href={LEAD_MAGNET[locale]} download className="btn btn-brand" style={{ marginTop: 18, padding: "13px 22px", fontSize: 15 }}>
          <Download size={16} strokeWidth={2} />
          {nl.download}
        </a>
      </div>
    );
  }

  const loading = status === "loading";
  return (
    <form onSubmit={handleSubmit} noValidate className="card" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--brand)" }}>
        <FileText size={18} strokeWidth={1.9} />
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>PDF · {nl.eyebrow}</span>
      </div>
      <div className="nl__row">
        <input
          type="email"
          className="field-input"
          placeholder={nl.emailPh}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          aria-label={nl.emailPh}
          aria-invalid={errors.email ? "true" : undefined}
        />
        <button type="submit" className="btn btn-brand" style={{ padding: "13px 22px", fontSize: 15, whiteSpace: "nowrap" }} disabled={loading}>
          {loading ? nl.sending : nl.cta}
        </button>
      </div>
      {errors.email && <span role="alert" style={{ color: "var(--down)", fontSize: 12.5 }}>{errors.email}</span>}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, cursor: "pointer" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)", flexShrink: 0 }} aria-invalid={errors.consent ? "true" : undefined} />
        <span>{nl.consent}</span>
      </label>
      {errors.consent && <span role="alert" style={{ color: "var(--down)", fontSize: 12.5 }}>{errors.consent}</span>}
      {status === "error" && <p role="alert" style={{ color: "var(--down)", fontSize: 13, margin: 0 }}>{nl.errGeneric}</p>}

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
    </form>
  );
}
