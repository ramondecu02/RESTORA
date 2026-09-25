/** Solo rutas internas: evita redirecciones abiertas. Exige "/" seguido de algo que no sea "/" ni "\" y solo
 *  caracteres ASCII visibles: el navegador descarta tabuladores y saltos de línea al leer la URL, así que
 *  "/\t/web.com" acabaría en "//web.com" (otro dominio), y un salto de línea rompe la cabecera Location. */
export const safeNext = (n: string | null | undefined) =>
  (typeof n === "string" && /^\/(?![/\\])[\x21-\x7e]*$/.test(n) && !n.includes("\\") ? n : "/hoy");
