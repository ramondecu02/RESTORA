"use server";
import { cookies } from "next/headers";
import { sys } from "@/server/db";
import { getSession } from "@/server/session";
import { env } from "@/server/env";

const TOURS = new Set(["hoy", "validacion", "compras", "escandallos", "carta", "inventario"]);

export async function marcarTour(k: string): Promise<void> {
  const s = await getSession();
  if (!s || !TOURS.has(k)) return;
  await sys((c) => c.query("update users set prefs = jsonb_set(coalesce(prefs, '{}'::jsonb), '{seen}', coalesce(prefs->'seen', '{}'::jsonb) || jsonb_build_object($2::text, true)) where id = $1", [s.userId, k]));
}

export async function cambiarTema(theme: "light" | "dark" | "system"): Promise<void> {
  const s = await getSession();
  if (!s) return;
  const t = theme === "light" || theme === "dark" ? theme : "system";
  await sys((c) => c.query("update users set prefs = jsonb_set(coalesce(prefs, '{}'::jsonb), '{theme}', to_jsonb($2::text)) where id = $1", [s.userId, t]));
  const jar = await cookies();
  if (t === "system") jar.delete("rs_theme");
  else jar.set("rs_theme", t, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax", secure: env.secureCookies });
}
