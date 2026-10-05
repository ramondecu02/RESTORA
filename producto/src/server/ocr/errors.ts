// Errores de la lectura con IA: lo que se le cuenta al usuario (en español, corto y con una salida) y lo que queda en los registros.

/** Error con mensaje ya listo para enseñar al usuario. `detalle` solo va a los registros. */
export class OcrError extends Error {
  constructor(message: string, readonly detalle?: string) {
    super(message);
    this.name = "OcrError";
  }
}
/** El modelo se ha negado a leer el documento (clasificadores de seguridad): se puede probar con el otro modelo. */
export class OcrRefusal extends OcrError {
  constructor(detalle?: string) {
    super("La IA no ha podido leer este documento. Prueba con otra foto o apúntalo a mano.", detalle);
    this.name = "OcrRefusal";
  }
}

type ApiLike = { status?: number; name?: string; message?: string; requestID?: string | null; error?: { error?: { type?: string; message?: string } } };
const info = (e: unknown): ApiLike => (e && typeof e === "object" ? (e as ApiLike) : {});
const textoApi = (e: unknown) => { const x = info(e); return String(x.error?.error?.message ?? x.message ?? ""); };

const NO_DISPONIBLE = "La lectura automática no está disponible ahora mismo. Puedes meter el documento a mano mientras lo arreglamos.";
const SATURADO = "El servicio de lectura está saturado. Vuelve a intentarlo en un minuto.";
const TARDA = "La lectura ha tardado demasiado. Prueba con menos páginas o vuelve a intentarlo.";
const SIN_RED = "No hemos podido conectar con el servicio de lectura. Vuelve a intentarlo en un minuto.";
const GENERICO = "No hemos podido leer el documento.";

/** Texto para el usuario. Nunca enseña JSON, inglés ni detalles técnicos: esos van a los registros (detalleDeError).
 *  Con contexto «receta» (sugerir ingredientes) los consejos hablan de añadirlos a mano, no de subir páginas. */
export function mensajeDeError(e: unknown, contexto: "documento" | "receta" = "documento"): string {
  if (e instanceof OcrError) return e.message;
  if (contexto === "receta") return mensajeReceta(e);
  const x = info(e), status = typeof x.status === "number" ? x.status : undefined, texto = textoApi(e), nombre = String(x.name ?? "");
  if (status === undefined) {
    if (/abort|timeout/i.test(nombre) || /timed? ?out|aborted/i.test(texto)) return TARDA;
    if (/connection|fetch failed|network|econn|enotfound|socket|eai_again/i.test(nombre + " " + texto)) return SIN_RED;
    return GENERICO;
  }
  if (status === 401 || status === 402 || status === 403) return NO_DISPONIBLE; // clave no válida, sin permiso o sin saldo
  if (status === 400 && /credit balance|billing|plans? ?& ?billing|usage limit/i.test(texto)) return NO_DISPONIBLE;
  if (status === 413) return "El documento pesa demasiado para leerlo de una vez. Súbelo en varias partes o con menos páginas.";
  if (status === 400 && /image|pdf|document|media type|pixel|dimension|base64|pages?\b/i.test(texto)) return "No se ha podido abrir alguna de las páginas (foto o PDF no válido). Prueba con otra foto o súbelo en JPG.";
  if (status === 429 || status === 529 || status >= 500) return SATURADO;
  return GENERICO;
}

/** Para los registros: estado, tipo, mensaje de la API y el id de la petición (para reclamar a Anthropic si hace falta). */
export function detalleDeError(e: unknown): string {
  if (e instanceof OcrError && e.detalle) return e.detalle;
  const x = info(e), t = x.error?.error?.type;
  const partes = [x.status ? `HTTP ${x.status}` : String(x.name ?? "Error"), t, textoApi(e).slice(0, 300), x.requestID ? `request_id=${x.requestID}` : ""];
  return partes.filter(Boolean).join(" · ");
}

function mensajeReceta(e: unknown): string {
  const x = info(e), status = typeof x.status === "number" ? x.status : undefined, texto = textoApi(e), nombre = String(x.name ?? "");
  if (status === undefined) {
    if (/abort|timeout/i.test(nombre) || /timed? ?out|aborted/i.test(texto)) return "La IA ha tardado demasiado. Prueba otra vez o añade los ingredientes a mano.";
    return "No se ha podido sugerir la receta. Añade los ingredientes a mano.";
  }
  if (status === 401 || status === 402 || status === 403 || (status === 400 && /credit balance|billing/i.test(texto))) return "La sugerencia con IA no está disponible ahora mismo. Añade los ingredientes a mano.";
  if (status === 429 || status === 529 || status >= 500) return "La IA está saturada. Prueba otra vez en un minuto o añade los ingredientes a mano.";
  return "No se ha podido sugerir la receta. Añade los ingredientes a mano.";
}
