"use client";

import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The light way in: name + email + message, no demo request. Posts to the
 * same /api/leads endpoint with kind="mensaje".
 */
export function QuickContact({ quick, locale, tone = "light" }: { quick: SiteCopy["quick"]; locale: Locale; tone?: "light" | "dark" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = quick.errName;
    if (!EMAIL_RE.test(email.trim())) next.email = quick.errEmail;
    if (!message.trim()) next.message = quick.errMessage;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "mensaje", name, email, message, lang: locale, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const dark = tone === "dark";
  const errStyle: React.CSSProperties = { color: dark ? "#f0b9a6" : "var(--down)", fontSize: 12.5 };

  if (status === "success") {
    return (
      <div className={`qc qc--done${dark ? " qc--dark" : ""}`} role="status">
        <div style={{ fontWeight: 700, fontSize: 18 }}>{quick.doneTitle}</div>
        <p style={{ margin: "6px 0 0", fontSize: 14.5, opacity: 0.8 }}>{quick.doneBody}</p>
      </div>
    );
  }

  const loading = status === "loading";
  return (
    <form onSubmit={handleSubmit} noValidate className={`qc${dark ? " qc--dark" : ""}`}>
      <div className="qc__row">
        <label className="qc__field">
          <span className="field-label">{quick.name}</span>
          <input type="text" className="field-input" placeholder={quick.namePh} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={errors.name ? "true" : undefined} />
          {errors.name && <span role="alert" style={errStyle}>{errors.name}</span>}
        </label>
        <label className="qc__field">
          <span className="field-label">{quick.email}</span>
          <input type="email" className="field-input" placeholder={quick.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" aria-invalid={errors.email ? "true" : undefined} />
          {errors.email && <span role="alert" style={errStyle}>{errors.email}</span>}
        </label>
      </div>
      <label className="qc__field">
        <span className="field-label">{quick.message}</span>
        <textarea className="field-input" placeholder={quick.messagePh} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ resize: "vertical", lineHeight: 1.5 }} aria-invalid={errors.message ? "true" : undefined} />
        {errors.message && <span role="alert" style={errStyle}>{errors.message}</span>}
      </label>

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <div className="qc__foot">
        <button type="submit" className={`btn ${dark ? "" : "btn-brand"}`} style={dark ? { background: "#fff", color: "#12211a", border: "1px solid #fff", padding: "13px 22px", fontSize: 15 } : { padding: "13px 22px", fontSize: 15 }} disabled={loading}>
          {loading ? quick.sending : quick.send}
          {!loading && <Send size={15} strokeWidth={2} />}
        </button>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.8 }}>
          {quick.privacyPre}{" "}
          <Link href={`/${locale}/privacidad`} style={{ color: dark ? "#7fc4a3" : "var(--brand)", textDecoration: "underline", textUnderlineOffset: 2 }}>
            {quick.privacyLink}
          </Link>
          .
        </p>
      </div>
      {status === "error" && <p role="alert" style={{ ...errStyle, margin: 0 }}>{quick.errGeneric}</p>}
    </form>
  );
}
