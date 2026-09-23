// Lectura de ejemplo (sin API): el albarán de muestra de Distribuciones Martínez y una carta.
// Se usa con OCR_PROVIDER=mock (pruebas y desarrollo) y reproduce las dudas típicas:
// número con dos lecturas, cantidad poco legible, IVA que no cuadra y un producto sin equivalencia.
import { isoDate } from "@/lib/format";
import type { OcrAlbaran, OcrCarta } from "@/lib/ocr-types";

const hace = (dias: number) => { const d = new Date(); d.setDate(d.getDate() - dias); return isoDate(d); };
type L = OcrAlbaran["lineas"][number];
const l = (descripcion: string, cantidad: number | null, unidad: string | null, precio: number, iva: number, extra: Partial<L> = {}): L => ({
  descripcion, cantidad, cantidad_texto: cantidad == null ? "" : String(cantidad).replace(".", ","), unidad, precio_unitario: precio,
  descuento_pct: null, bonificadas: null, importe: Math.round((cantidad ?? 0) * precio * 100) / 100, iva_pct: iva,
  confianza: "alta", confianza_cantidad: "alta", confianza_precio: "alta", duda: null, ...extra,
});

export const MOCK_ALBARAN: OcrAlbaran = {
  tipo_documento: "albaran",
  proveedor_nombre: "DISTRIBUCIONES MARTINEZ S.L.",
  proveedor_cif: "B43123456",
  confianza_proveedor: "alta",
  numero: "A-2231",
  numero_alternativo: "A-2281",
  confianza_numero: "media",
  fecha: hace(2),
  confianza_fecha: "alta",
  lineas: [
    l("TOMATE PERA", 12, "kg", 1.85, 4),
    l("CEBOLLA DULCE", 10, "kg", 0.95, 4),
    l("PATATA AGRIA", 25, "kg", 0.62, 4),
    l("HUEVO CAMPERO L EST.30", 2, "estuche", 8.1, 4),
    l("LIMON", 5, "kg", 1.9, 4),
    l("LECHUGA ROMANA", 12, "ud", 0.8, 4),
    l("ACEITE OLIVA V.EXTRA 5L", 2, "garrafa", 34.5, 4),
    l("VINAGRE JEREZ 1L", 3, "botella", 3.4, 10),
    l("SAL MARINA 1KG", 2, "paquete", 0.55, 10),
    l("POLLO ENTERO", 6, "kg", 3.9, 10, { cantidad_texto: "6,?", confianza: "media", confianza_cantidad: "baja", duda: "El decimal de la cantidad no se lee; el importe (23,40) cuadra con 6 kg" }),
    l("CERVEZA BARRIL 30L", 1, "barril", 62, 10, { confianza: "media", duda: "La línea parece marcar IVA 10 %, pero el desglose del pie la incluye en el 21 %" }),
    l("MIX GOURMET 125G", 6, "bandeja", 1.45, 4),
  ],
  desglose_iva: [
    { tipo: 4, base: 160.2, cuota: 6.41 },
    { tipo: 10, base: 34.7, cuota: 3.47 },
    { tipo: 21, base: 62, cuota: 13.02 },
  ],
  total: 279.8,
  confianza_total: "alta",
  observaciones: null,
};

/** Segundo proveedor de ejemplo: lectura limpia, sin dudas. */
export const MOCK_ALBARAN_GIL: OcrAlbaran = {
  tipo_documento: "albaran",
  proveedor_nombre: "FRUTAS HERMANOS GIL",
  proveedor_cif: "B43987654",
  confianza_proveedor: "alta",
  numero: "FG-0419",
  numero_alternativo: null,
  confianza_numero: "alta",
  fecha: hace(0),
  confianza_fecha: "alta",
  lineas: [
    l("TOMATE PERA CAT.I", 10, "kg", 1.62, 4),
    l("CEBOLLA DULCE FUENTES", 8, "kg", 0.98, 4),
    l("LIMON PRIMOFIORI", 4, "kg", 1.75, 4),
    l("LECHUGA ROMANA", 10, "ud", 0.85, 4),
    l("PATATA AGRIA SACO 25KG", 1, "saco", 14.25, 4),
  ],
  desglose_iva: [{ tipo: 4, base: 53.79, cuota: 2.15 }],
  total: 55.94,
  confianza_total: "alta",
  observaciones: null,
};

export const MOCK_CARTA: OcrCarta = {
  nombre_local: null,
  platos: [
    { nombre: "Croquetas de jamón ibérico", familia: "Entrantes", descripcion: "Ocho unidades, cremosas", precio: 9.5, confianza: "alta" },
    { nombre: "Ensalada de temporada", familia: "Entrantes", descripcion: "Burrata, aguacate y tomate de rama", precio: 9.5, confianza: "alta" },
    { nombre: "Lubina a la brasa", familia: "Pescados", descripcion: "Con patata confitada y salsa de la casa", precio: 24, confianza: "alta" },
    { nombre: "Arroz de carabineros", familia: "Arroces", descripcion: "Mínimo dos personas, precio por ración", precio: 26.5, confianza: "alta" },
    { nombre: "Canelón de rustido", familia: "Carnes", descripcion: null, precio: 14.5, confianza: "alta" },
    { nombre: "Crema catalana", familia: "Postres", descripcion: null, precio: 6.5, confianza: "alta" },
    { nombre: "Copa de Priorat DOQ", familia: "Vinos", descripcion: null, precio: 6.5, confianza: "media" },
  ],
};

/** Huella SHA-256 de los documentos de ejemplo de public/demo. Se leen siempre con su lectura grabada:
 *  el tutorial de validación sale igual, no gasta tokens y funciona aunque la lectura real no esté configurada.
 *  Si cambias esas imágenes, actualiza las huellas (lo comprueba tests/unit/samples.test.ts). */
export const SAMPLE_HASHES: Record<string, "albaran" | "albaran-gil" | "carta"> = {
  "2a7ec420933e34447962efa1f1afeda31761c2eea2cfc78d46239ea610261cfa": "albaran",
  "2a862c0013158f437c8083aa17418242aab8fee955cb6aa0227625d36592f817": "albaran-gil",
  "6e3abd99d86f9cf9ab1c457229e3668a0cd06778fb87eec62d8d80491aabddab": "carta",
};
