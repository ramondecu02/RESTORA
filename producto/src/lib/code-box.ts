/** Casillas del código de 6 cifras: qué hacer con el valor de una casilla después de escribir en ella.
 *  - Una cifra escrita sobre la que ya había la sustituye (no empuja el resto hacia la derecha).
 *  - Varias cifras de golpe (autorrelleno del móvil) se reparten a partir de esa casilla.
 *  `typed` es lo que se acaba de teclear (InputEvent.data), si el navegador lo da. */
export function codeBoxInput(prev: string, value: string, typed?: string | null): { digit: string } | { spread: string } {
  const t = value.replace(/\D/g, "");
  if (t.length <= 1) return { digit: t };
  if (prev && t.length === prev.length + 1) {
    const d = typed && /^\d$/.test(typed) ? typed : t.startsWith(prev) ? t.slice(-1) : t[0];
    return { digit: d };
  }
  return { spread: t };
}
