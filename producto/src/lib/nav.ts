/** Solo rutas internas: evita redirecciones abiertas. */
export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/hoy");
