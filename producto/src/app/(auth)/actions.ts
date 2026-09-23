"use server";
// Registro, verificación de email, acceso y recuperación de contraseña.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { one, sys, withTenant } from "@/server/db";
import { env } from "@/server/env";
import { DUMMY_HASH, hashPassword, safeEqual, sha256, sixDigits, verifyPassword } from "@/server/crypto";
import { rateLimit } from "@/server/ratelimit";
import { createSession, destroySession, destroyUserSessions, getSession, setFlash, setSessionOrg } from "@/server/session";
import { resetEmail, sendEmail, verifyEmail } from "@/server/email";
import { safeNext } from "@/lib/nav";

export type FormState = { error?: string; fields?: Record<string, string>; values?: Record<string, string>; ok?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COMMON = new Set(["12345678", "123456789", "1234567890", "password", "contraseña", "qwertyuiop", "11111111", "restaurante", "restora123"]);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
async function ip() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}
const codeHash = (userId: string, code: string) => sha256(`${userId}:${code}`);

async function issueCode(userId: string, purpose: "verify" | "reset") {
  const code = sixDigits();
  await sys(async (c) => {
    await c.query("update email_codes set used_at = now() where user_id = $1 and purpose = $2 and used_at is null", [userId, purpose]);
    await c.query("insert into email_codes (user_id, purpose, code_hash, expires_at) values ($1, $2, $3, now() + interval '30 minutes')", [userId, purpose, codeHash(userId, code)]);
  });
  return code;
}

export async function registrar(_: FormState, f: FormData): Promise<FormState> {
  const values = { nombre: str(f, "nombre"), email: str(f, "email").toLowerCase(), restaurante: str(f, "restaurante") };
  const pw = String(f.get("password") ?? "");
  const fields: Record<string, string> = {};
  if (values.nombre.length < 2) fields.nombre = "Escribe tu nombre.";
  if (!EMAIL.test(values.email)) fields.email = "Revisa el email: parece incompleto.";
  if (values.restaurante.length < 2) fields.restaurante = "Escribe el nombre de tu restaurante.";
  if (pw.length < 8) fields.password = "Mínimo 8 caracteres.";
  else if (COMMON.has(pw.toLowerCase())) fields.password = "Esa contraseña es demasiado común. Elige otra.";
  if (f.get("ok") !== "on") fields.ok = "Necesitamos que aceptes las condiciones para crear la cuenta.";
  if (Object.keys(fields).length) return { fields, values };
  if (!(await rateLimit(`reg:${await ip()}`, 8, 3600))) return { error: "Demasiados intentos desde esta conexión. Prueba dentro de una hora.", values };

  const exists = await sys((c) => one(c, "select 1 from users where lower(email) = $1", [values.email]));
  if (exists) return { fields: { email: "Ya hay una cuenta con este email. Entra con tu contraseña." }, values };

  const hash = await hashPassword(pw);
  const { userId, orgId } = await sys(async (c) => {
    const u = await one<{ id: string }>(c, "insert into users (email, name, password_hash) values ($1, $2, $3) returning id", [values.email, values.nombre.slice(0, 80), hash]);
    const o = await one<{ id: string }>(c, "insert into organizations (name, trial_ends_at) values ($1, now() + make_interval(days => $2)) returning id", [values.restaurante.slice(0, 80), env.trialDays]);
    await c.query("insert into memberships (org_id, user_id, role) values ($1, $2, 'propietario')", [o!.id, u!.id]);
    return { userId: u!.id, orgId: o!.id };
  });
  await withTenant(orgId, (c) => c.query("insert into locales (tenant_id, name) values ($1, $2)", [orgId, values.restaurante.slice(0, 80)]));
  const code = await issueCode(userId, "verify");
  await sendEmail({ to: values.email, ...verifyEmail(values.nombre, code) });
  await createSession(userId, orgId);
  redirect("/verificar");
}

export async function verificar(_: FormState, f: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  const code = str(f, "code").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Escribe las 6 cifras del código." };
  const row = await sys((c) => one<{ id: string; code_hash: string; attempts: number; expires_at: Date }>(c,
    "select id, code_hash, attempts, expires_at from email_codes where user_id = $1 and purpose = 'verify' and used_at is null order by created_at desc limit 1", [s.userId]));
  if (!row) return { error: "Ese código ya no vale. Pide uno nuevo." };
  if (new Date(row.expires_at) < new Date()) return { error: "El código ha caducado. Pide uno nuevo." };
  if (row.attempts >= 5) return { error: "Demasiados intentos con este código. Pide uno nuevo." };
  if (!safeEqual(row.code_hash, codeHash(s.userId, code))) {
    await sys((c) => c.query("update email_codes set attempts = attempts + 1 where id = $1", [row.id]));
    return { error: "El código no es correcto. Revisa el último correo que te hemos enviado." };
  }
  await sys(async (c) => {
    await c.query("update email_codes set used_at = now() where id = $1", [row.id]);
    await c.query("update users set email_verified_at = now() where id = $1", [s.userId]);
  });
  redirect("/bienvenida");
}

export async function reenviarCodigo(): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  if (s.verified) redirect("/hoy");
  if (!(await rateLimit(`resend:${s.userId}`, 1, 55)) || !(await rateLimit(`resend-h:${s.userId}`, 6, 3600))) return { error: "Espera un momento antes de pedir otro código." };
  const code = await issueCode(s.userId, "verify");
  await sendEmail({ to: s.email, ...verifyEmail(s.name, code) });
  return { ok: "Te hemos enviado un código nuevo." };
}

export async function cambiarEmail(_: FormState, f: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  if (s.verified) redirect("/hoy");
  const email = str(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { fields: { email: "Revisa el email: parece incompleto." }, values: { email } };
  if (!(await rateLimit(`chmail:${s.userId}`, 5, 3600))) return { error: "Demasiados cambios. Prueba dentro de una hora." };
  const taken = await sys((c) => one(c, "select 1 from users where lower(email) = $1 and id <> $2", [email, s.userId]));
  if (taken) return { fields: { email: "Ya hay una cuenta con este email." }, values: { email } };
  await sys((c) => c.query("update users set email = $2 where id = $1", [s.userId, email]));
  const code = await issueCode(s.userId, "verify");
  await sendEmail({ to: email, ...verifyEmail(s.name, code) });
  redirect("/verificar?cambiado=1");
}

export async function entrar(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const pw = String(f.get("password") ?? "");
  const next = safeNext(str(f, "next"));
  if (!EMAIL.test(email) || !pw) return { error: "Escribe tu email y tu contraseña.", values: { email } };
  if (!(await rateLimit(`login:${email}`, 8, 900)) || !(await rateLimit(`login-ip:${await ip()}`, 40, 900))) {
    return { error: "Demasiados intentos. Espera 15 minutos o recupera tu contraseña.", values: { email } };
  }
  const u = await sys((c) => one<{ id: string; password_hash: string; email_verified_at: Date | null; name: string }>(c,
    "select id, password_hash, email_verified_at, name from users where lower(email) = $1", [email]));
  const ok = await verifyPassword(pw, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) return { error: "El email o la contraseña no son correctos.", values: { email } };
  const m = await sys((c) => one<{ org_id: string }>(c, "select org_id from memberships where user_id = $1 order by created_at limit 1", [u.id]));
  await createSession(u.id, m?.org_id ?? null);
  if (!u.email_verified_at) {
    const code = await issueCode(u.id, "verify");
    await sendEmail({ to: email, ...verifyEmail(u.name, code) });
    redirect("/verificar");
  }
  redirect(next);
}

export async function recuperar(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { fields: { email: "Revisa el email: parece incompleto." }, values: { email } };
  if (await rateLimit(`reset:${email}`, 4, 3600) && await rateLimit(`reset-ip:${await ip()}`, 20, 3600)) {
    const u = await sys((c) => one<{ id: string; name: string }>(c, "select id, name from users where lower(email) = $1", [email]));
    if (u) {
      const code = await issueCode(u.id, "reset");
      await sendEmail({ to: email, ...resetEmail(u.name, code) });
    }
  }
  redirect(`/restablecer?email=${encodeURIComponent(email)}`);
}

export async function restablecer(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const code = str(f, "code").replace(/\D/g, "");
  const pw = String(f.get("password") ?? "");
  const values = { email };
  if (code.length !== 6) return { fields: { code: "Escribe las 6 cifras del código." }, values };
  if (pw.length < 8) return { fields: { password: "Mínimo 8 caracteres." }, values };
  if (COMMON.has(pw.toLowerCase())) return { fields: { password: "Esa contraseña es demasiado común. Elige otra." }, values };
  const u = await sys((c) => one<{ id: string }>(c, "select id from users where lower(email) = $1", [email]));
  const row = u ? await sys((c) => one<{ id: string; code_hash: string; attempts: number; expires_at: Date }>(c,
    "select id, code_hash, attempts, expires_at from email_codes where user_id = $1 and purpose = 'reset' and used_at is null order by created_at desc limit 1", [u.id])) : null;
  if (!u || !row || new Date(row.expires_at) < new Date() || row.attempts >= 5) return { error: "El código no es válido o ha caducado. Pide uno nuevo.", values };
  if (!safeEqual(row.code_hash, codeHash(u.id, code))) {
    await sys((c) => c.query("update email_codes set attempts = attempts + 1 where id = $1", [row.id]));
    return { fields: { code: "El código no es correcto." }, values };
  }
  const hash = await hashPassword(pw);
  await sys(async (c) => {
    await c.query("update email_codes set used_at = now() where id = $1", [row.id]);
    await c.query("update users set password_hash = $2, email_verified_at = coalesce(email_verified_at, now()) where id = $1", [u.id, hash]);
  });
  await destroyUserSessions(u.id);
  const m = await sys((c) => one<{ org_id: string }>(c, "select org_id from memberships where user_id = $1 order by created_at limit 1", [u.id]));
  await createSession(u.id, m?.org_id ?? null);
  await setFlash("Contraseña cambiada. Ya estás dentro.");
  redirect("/hoy");
}

export async function salir() {
  await destroySession();
  redirect("/entrar");
}

/** Crear un negocio nuevo cuando el usuario se ha quedado sin ninguno. */
export async function crearNegocio(_: FormState, f: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  const name = str(f, "restaurante");
  if (name.length < 2) return { fields: { restaurante: "Escribe el nombre de tu restaurante." }, values: { restaurante: name } };
  const orgId = await sys(async (c) => {
    const o = await one<{ id: string }>(c, "insert into organizations (name, trial_ends_at) values ($1, now() + make_interval(days => $2)) returning id", [name.slice(0, 80), env.trialDays]);
    await c.query("insert into memberships (org_id, user_id, role) values ($1, $2, 'propietario')", [o!.id, s.userId]);
    return o!.id;
  });
  await withTenant(orgId, (c) => c.query("insert into locales (tenant_id, name) values ($1, $2)", [orgId, name.slice(0, 80)]));
  await setSessionOrg(s.sessionId, orgId);
  redirect("/bienvenida");
}
