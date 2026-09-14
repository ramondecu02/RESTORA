import { notFound } from "next/navigation";
import { isLocale } from "@/lib/types";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const sp = await props.searchParams;
  const nextPath = typeof sp.next === "string" ? sp.next : "";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <div
          className="mono"
          style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 600 }}
        >
          RESTORA · Admin
        </div>
        <h1 className="display" style={{ fontWeight: 800, fontSize: 30, margin: "10px 0 0" }}>
          Panel de leads
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0" }}>
          Acceso restringido al equipo.
        </p>

        <form action={loginAction} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={nextPath} />

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="field-label">Email</span>
            <input type="email" name="email" className="field-input" autoComplete="username" required />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="field-label">Contraseña</span>
            <input type="password" name="password" className="field-input" autoComplete="current-password" required />
          </label>

          {sp.error && (
            <p role="alert" style={{ color: "var(--amber)", fontSize: 13, margin: 0 }}>
              Credenciales incorrectas.
            </p>
          )}

          <button type="submit" className="btn btn-amber" style={{ padding: 14, fontSize: 15, marginTop: 4 }}>
            Entrar →
          </button>
        </form>
      </div>
    </main>
  );
}
