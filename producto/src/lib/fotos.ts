/** URL pública de una foto: las de ejemplo están en /demo; las del usuario pasan por la ruta privada. */
export function fotoUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("demo/")) return "/" + key;
  return "/api/archivos/" + key.split("/").map(encodeURIComponent).join("/");
}
