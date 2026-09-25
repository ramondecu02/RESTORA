// Nombre y atributos de la cookie de sesión. Sin dependencias de la base: también lo usa proxy.ts.
import { env } from "./env";

/** 30 días, igual que la caducidad de la sesión en la base (que se alarga con el uso). */
export const SESSION_MAX_AGE = 30 * 24 * 3600;
export const sessionCookieName = () => (env.secureCookies ? "__Host-rs_sess" : "rs_sess");
export const cookieBase = () => ({ httpOnly: true, secure: env.secureCookies, sameSite: "lax" as const, path: "/" });
