import { CONTACTO_EMAIL } from "./contacto";
import { num } from "./format";

// Límite de una subida de documentos. La función de Vercel acepta como mucho 4,5 MB de cuerpo, y el formulario añade
// su propio relleno: con 4,4 MB de archivos la petición se rechazaba antes de llegar al código y el usuario solo veía
// «Prueba otra vez». 4 MB deja margen y se avisa en el navegador antes de enviar.
export const MAX_SUBIDA_BYTES = 4 * 1024 * 1024;
export const MENSAJE_PESADO = "Los archivos pesan demasiado (máximo 4 MB en total). Sube menos páginas o un PDF más ligero.";

/**
 * Tope mensual de lecturas con IA por negocio: un freno contra un gasto desbocado (un fallo, un bucle, un abuso), no un límite de
 * plan. El valor por defecto queda muy por encima de cualquier uso normal; el propietario lo baja con MAX_LECTURAS_MES.
 * Cuentan las lecturas de albaranes, facturas y cartas (cada una es una llamada a la API de Claude) por mes natural en hora de Madrid.
 * Apuntar a mano nunca se limita.
 */
export const LECTURAS_MES_DEFECTO = 1500;
/** Interpreta MAX_LECTURAS_MES: un entero de 0 en adelante. Vacío o no válido: el valor por defecto. 0 apaga la lectura con IA. */
export function maxLecturasMes(raw: string | undefined | null): number {
  const t = String(raw ?? "").trim();
  if (!/^\d+$/.test(t)) return LECTURAS_MES_DEFECTO;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : LECTURAS_MES_DEFECTO;
}
/** Lo que se le dice a quien llega al tope (o lo intenta): qué pasa, qué puede seguir haciendo y a quién escribir. */
export function mensajeTopeLecturas(max: number): string {
  if (max <= 0) return `La lectura automática de documentos está desactivada ahora mismo. Puedes seguir apuntando a mano tus albaranes y tus platos; para activarla, escribe a ${CONTACTO_EMAIL}.`;
  return `Has llegado al máximo de lecturas automáticas de este mes (${num(max, 0)}). Puedes seguir apuntando a mano tus albaranes y tus platos; si necesitas leer más, escribe a ${CONTACTO_EMAIL}. El contador vuelve a cero el día 1.`;
}
