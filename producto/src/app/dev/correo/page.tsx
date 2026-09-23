import { notFound } from "next/navigation";
import { all, sys } from "@/server/db";
import { env } from "@/server/env";

export const metadata = { title: "Buzón de pruebas" };

/** Solo en desarrollo: los correos que la app habría enviado (códigos, invitaciones). */
export default async function DevCorreo() {
  if (!env.devMailbox) notFound();
  const rows = await sys((c) => all<{ id: string; to_email: string; subject: string; body_text: string; created_at: Date }>(c,
    "select id, to_email, subject, body_text, created_at from outbox_emails order by created_at desc limit 30"));
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "var(--font)" }}>
      <h1 className="h2">Buzón de pruebas</h1>
      <p className="muted small" style={{ margin: "6px 0 18px" }}>Correos generados con EMAIL_PROVIDER=dev. En producción se envían con Resend.</p>
      <div className="stack">
        {rows.map((r) => (
          <article key={r.id} className="card" data-to={r.to_email}>
            <div className="card-h"><b>{r.subject}</b><small className="muted">{new Date(r.created_at).toLocaleString("es-ES")}</small></div>
            <small className="muted">Para {r.to_email}</small>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "var(--mono)", fontSize: 13 }}>{r.body_text}</pre>
          </article>
        ))}
        {!rows.length ? <p className="muted">Aún no hay correos.</p> : null}
      </div>
    </main>
  );
}
