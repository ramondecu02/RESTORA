// Lo que se le pide al modelo (esquema que viaja a la API de Claude) y su conversión al tipo que usa la app.
//
// La API de salida estructurada admite como mucho 16 campos «con unión» (un campo que puede ser null cuenta como uno):
// con más, responde 400 «Schema contains too many parameters with union types» y la lectura no llega a empezar.
// Por eso aquí «sin dato» se pide como 0 o como cadena vacía en los campos menos importantes, y se vuelve a null
// al convertir. Tests: tests/unit/ocr-wire.test.ts (cuenta los campos con unión de cada esquema).
import { z } from "zod";
import { OcrAlbaran, OcrCarta, type OcrAlbaran as OcrAlbaranT } from "./ocr-types";

const CONF = z.enum(["alta", "media", "baja"]);

const WireLinea = z.object({
  descripcion: z.string().describe("Texto del producto tal cual aparece en la línea"),
  cantidad: z.number().nullable().describe("Cantidad facturada. null si no se lee"),
  cantidad_texto: z.string().describe("La cantidad tal cual se ve impresa, aunque sea dudosa"),
  unidad: z.string().nullable().describe("Unidad de venta impresa: kg, ud, caja, garrafa 5L... null si no aparece"),
  precio_unitario: z.number().nullable().describe("Precio por unidad de venta, sin IVA. null si no aparece"),
  descuento_pct: z.number().describe("Descuento de la línea en %. 0 si no hay descuento"),
  bonificadas: z.number().describe("Unidades regaladas en la línea (por ejemplo 6+1 → 1). 0 si no hay"),
  importe: z.number().nullable().describe("Importe de la línea sin IVA. null si no aparece"),
  iva_pct: z.number().nullable().describe("Tipo de IVA de la línea si aparece (4, 10 o 21). null si no aparece"),
  confianza: CONF.describe("Seguridad global de la lectura de esta línea"),
  confianza_cantidad: CONF,
  confianza_precio: CONF,
  duda: z.string().describe("Qué no se lee bien, en pocas palabras. Cadena vacía si no hay dudas"),
});
export const WireAlbaran = z.object({
  tipo_documento: z.enum(["albaran", "factura", "ticket", "otro"]).describe("«otro» si la imagen no es un documento de compra"),
  proveedor_nombre: z.string().nullable(),
  proveedor_cif: z.string().nullable(),
  confianza_proveedor: CONF,
  numero: z.string().nullable(),
  numero_alternativo: z.string().describe("Otra lectura posible del número si hay dudas. Cadena vacía si no hay"),
  confianza_numero: CONF,
  fecha: z.string().nullable().describe("Fecha del documento en formato AAAA-MM-DD"),
  confianza_fecha: CONF,
  lineas: z.array(WireLinea),
  desglose_iva: z.array(z.object({ tipo: z.number(), base: z.number().nullable(), cuota: z.number().nullable() })),
  total: z.number().nullable().describe("Total a pagar con IVA"),
  confianza_total: CONF,
  observaciones: z.string().describe("Avisos sobre el documento en pocas palabras. Cadena vacía si no hay"),
});
type WireAlbaranT = z.infer<typeof WireAlbaran>;

const vacio = (s: string): string | null => (s.trim() ? s.trim() : null);

/** Lo que devuelve el modelo → el tipo que usa la app (con null donde no hay dato). */
export function albaranDeWire(w: WireAlbaranT): OcrAlbaranT {
  return OcrAlbaran.parse({
    ...w,
    numero_alternativo: vacio(w.numero_alternativo),
    observaciones: vacio(w.observaciones),
    lineas: w.lineas.map((l) => ({
      ...l,
      descuento_pct: l.descuento_pct > 0 ? l.descuento_pct : null,
      bonificadas: l.bonificadas > 0 ? l.bonificadas : null,
      duda: vacio(l.duda),
    })),
  });
}

/** Esquema JSON para `output_config.format`. Se envía tal cual (enums reales): el transformador del SDK los pasa a texto de la
 *  descripción y la API ya no los impondría. */
export function esquemaApi(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { reused: "inline" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}
export const ESQUEMA_ALBARAN = esquemaApi(WireAlbaran);
export const ESQUEMA_CARTA = esquemaApi(OcrCarta);

/** Campos que pueden ser null (o tienen varios tipos): los que cuentan para el límite de la API. */
export function camposConUnion(schema: unknown): number {
  if (Array.isArray(schema)) return schema.reduce((n: number, x) => n + camposConUnion(x), 0);
  if (!schema || typeof schema !== "object") return 0;
  const o = schema as Record<string, unknown>;
  let n = Array.isArray(o.type) || Array.isArray(o.anyOf) ? 1 : 0;
  for (const v of Object.values(o)) n += camposConUnion(v);
  return n;
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const TIPOS = new Set(["albaran", "factura", "ticket", "otro"]);
const CONFS = new Set(["alta", "media", "baja"]);
/** La API no garantiza mayúsculas ni tildes en los valores de un enum: se corrigen aquí (confianza desconocida → «baja»,
 *  tipo desconocido → «otro») en vez de tirar una lectura entera, ya pagada, por una «Media» o un «albarán». */
export function suavizarEnums(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(suavizarEnums);
  if (!x || typeof x !== "object") return x;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof v === "string" && k.startsWith("confianza")) out[k] = CONFS.has(sinAcentos(v)) ? sinAcentos(v) : "baja";
    else if (typeof v === "string" && k === "tipo_documento") out[k] = TIPOS.has(sinAcentos(v)) ? sinAcentos(v) : "otro";
    else out[k] = suavizarEnums(v);
  }
  return out;
}
