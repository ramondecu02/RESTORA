"use server";
import { redirect } from "next/navigation";
import { one, sys } from "@/server/db";
import { hashPassword } from "@/server/crypto";
import { findInvitation } from "@/server/queries/invitations";
import { createSession, getSession, setFlash, setSessionOrg } from "@/server/session";
import type { FormState } from "../actions";

export async function aceptarInvitacion(token: string): Promise<void> {
  const s = await getSession();
  if (!s) redirect(`/entrar?next=${encodeURIComponent("/invitacion/" + token)}`);
  const inv = await findInvitation(token);
  if (!inv || inv.email.toLowerCase() !== s.email.toLowerCase()) redirect(`/invitacion/${token}`);
  await sys(async (c) => {
    await c.query("insert into memberships (org_id, user_id, role) values ($1, $2, $3) on conflict (org_id, user_id) do update set role = excluded.role", [inv.org_id, s.userId, inv.role]);
    await c.query("update invitations set accepted_at = now() where id = $1", [inv.id]);
    await c.query("update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1", [s.userId]);
  });
  await setSessionOrg(s.sessionId, inv.org_id);
  await setFlash(`Ya formas parte de ${inv.org_name}.`);
  redirect("/hoy");
}

export async function aceptarNuevo(_: FormState, f: FormData): Promise<FormState> {
  const token = String(f.get("token") ?? "");
  const nombre = String(f.get("nombre") ?? "").trim();
  const pw = String(f.get("password") ?? "");
  const inv = await findInvitation(token);
  if (!inv) return { error: "Esta invitación ya no es válida. Pide una nueva." };
  const fields: Record<string, string> = {};
  if (nombre.length < 2) fields.nombre = "Escribe tu nombre.";
  if (pw.length < 8) fields.password = "Mínimo 8 caracteres.";
  if (f.get("ok") !== "on") fields.ok = "Necesitamos que aceptes las condiciones.";
  if (Object.keys(fields).length) return { fields, values: { nombre } };
  const exists = await sys((c) => one(c, "select 1 from users where lower(email) = lower($1)", [inv.email]));
  if (exists) redirect(`/entrar?next=${encodeURIComponent("/invitacion/" + token)}&email=${encodeURIComponent(inv.email)}`);
  const hash = await hashPassword(pw);
  const userId = await sys(async (c) => {
    const u = await one<{ id: string }>(c, "insert into users (email, name, password_hash, email_verified_at) values ($1, $2, $3, now()) returning id", [inv.email.toLowerCase(), nombre.slice(0, 80), hash]);
    await c.query("insert into memberships (org_id, user_id, role) values ($1, $2, $3)", [inv.org_id, u!.id, inv.role]);
    await c.query("update invitations set accepted_at = now() where id = $1", [inv.id]);
    return u!.id;
  });
  await createSession(userId, inv.org_id);
  await setFlash(`Bienvenido a ${inv.org_name}.`);
  redirect("/hoy?tour=1");
}
