// Sesiones en base de datos: la cookie lleva un token aleatorio; en la base solo guardamos su hash.
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { one, sys } from "./db";
import { env } from "./env";
import { randomToken, sha256 } from "./crypto";

const MAX_AGE = 30 * 24 * 3600;
export const sessionCookieName = () => (env.secureCookies ? "__Host-rs_sess" : "rs_sess");
export const cookieBase = () => ({ httpOnly: true, secure: env.secureCookies, sameSite: "lax" as const, path: "/" });

export type Prefs = { theme?: "light" | "dark" | "system"; seen?: Record<string, boolean>; hideChecklist?: boolean };
export type SessionData = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  verified: boolean;
  prefs: Prefs;
  orgId: string | null;
  createdAt: string;
};

export async function createSession(userId: string, orgId: string | null): Promise<void> {
  const token = randomToken(32);
  const ua = ((await headers()).get("user-agent") ?? "").slice(0, 200);
  await sys((c) => c.query(
    "insert into sessions (user_id, org_id, token_hash, expires_at, user_agent) values ($1, $2, $3, now() + interval '30 days', $4)",
    [userId, orgId, sha256(token), ua]));
  (await cookies()).set(sessionCookieName(), token, { ...cookieBase(), maxAge: MAX_AGE });
}

export const getSession = cache(async (): Promise<SessionData | null> => {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || token.length > 100) return null;
  const row = await sys((c) => one<{
    id: string; org_id: string | null; last_seen_at: Date; user_id: string; name: string; email: string;
    email_verified_at: Date | null; prefs: Prefs; created_at: Date;
  }>(c, `select s.id, s.org_id, s.last_seen_at, u.id as user_id, u.name, u.email, u.email_verified_at, u.prefs, u.created_at
          from sessions s join users u on u.id = s.user_id
          where s.token_hash = $1 and s.expires_at > now()`, [sha256(token)]));
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 3600_000) {
    await sys((c) => c.query("update sessions set last_seen_at = now(), expires_at = now() + interval '30 days' where id = $1", [row.id]));
  }
  return {
    sessionId: row.id, userId: row.user_id, name: row.name, email: row.email, verified: !!row.email_verified_at,
    prefs: row.prefs || {}, orgId: row.org_id, createdAt: new Date(row.created_at).toISOString(),
  };
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await sys((c) => c.query("delete from sessions where token_hash = $1", [sha256(token)]));
  jar.delete(sessionCookieName());
}

/** Cierra todas las sesiones de un usuario (al cambiar la contraseña), menos la actual si se indica. */
export async function destroyUserSessions(userId: string, keepSessionId?: string) {
  await sys((c) => c.query("delete from sessions where user_id = $1 and ($2::uuid is null or id <> $2)", [userId, keepSessionId ?? null]));
}

export async function setSessionOrg(sessionId: string, orgId: string) {
  await sys((c) => c.query("update sessions set org_id = $2 where id = $1", [sessionId, orgId]));
}

/** Mensaje de un solo uso para mostrar tras una redirección. */
export async function setFlash(msg: string) {
  (await cookies()).set("rs_flash", encodeURIComponent(msg), { path: "/", maxAge: 60, sameSite: "lax", secure: env.secureCookies });
}
