// Esquema de lo que devuelve la lectura del albarán (salida estructurada del modelo).
import { z } from "zod";

export const Conf = z.enum(["alta", "media", "baja"]);
export type Conf = z.infer<typeof Conf>;

export const OcrLinea = z.object({
  descripcion: z.string().describe("Texto del producto tal cual aparece en la línea"),
  cantidad: z.number().nullable().describe("Cantidad facturada. null si no se lee"),
  cantidad_texto: z.string().describe("La cantidad tal cual se ve impresa, aunque sea dudosa"),
  unidad: z.string().nullable().describe("Unidad de venta impresa: kg, ud, caja, garrafa 5L... null si no aparece"),
  precio_unitario: z.number().nullable().describe("Precio por unidad de venta, sin IVA"),
  descuento_pct: z.number().nullable().describe("Descuento de la línea en %"),
  bonificadas: z.number().nullable().describe("Unidades regaladas en la línea (por ejemplo 6+1 → 1)"),
  importe: z.number().nullable().describe("Importe de la línea sin IVA"),
  iva_pct: z.number().nullable().describe("Tipo de IVA de la línea si aparece (4, 10 o 21)"),
  confianza: Conf.describe("Seguridad global de la lectura de esta línea"),
  confianza_cantidad: Conf,
  confianza_precio: Conf,
  duda: z.string().nullable().describe("Qué no se lee bien, en pocas palabras"),
});
export const OcrAlbaran = z.object({
  tipo_documento: z.enum(["albaran", "factura", "ticket", "otro"]),
  proveedor_nombre: z.string().nullable(),
  proveedor_cif: z.string().nullable(),
  confianza_proveedor: Conf,
  numero: z.string().nullable(),
  numero_alternativo: z.string().nullable().describe("Otra lectura posible del número si hay dudas"),
  confianza_numero: Conf,
  fecha: z.string().nullable().describe("Fecha del documento en formato AAAA-MM-DD"),
  confianza_fecha: Conf,
  lineas: z.array(OcrLinea),
  desglose_iva: z.array(z.object({ tipo: z.number(), base: z.number().nullable(), cuota: z.number().nullable() })),
  total: z.number().nullable().describe("Total a pagar con IVA"),
  confianza_total: Conf,
  observaciones: z.string().nullable(),
});
export type OcrAlbaran = z.infer<typeof OcrAlbaran>;
export type OcrLinea = z.infer<typeof OcrLinea>;

export const OcrCarta = z.object({
  nombre_local: z.string().nullable(),
  platos: z.array(z.object({
    nombre: z.string(),
    familia: z.string().nullable().describe("Sección de la carta: Entrantes, Principales, Postres, Vinos..."),
    descripcion: z.string().nullable(),
    precio: z.number().nullable().describe("PVP con IVA tal cual aparece"),
    confianza: Conf,
  })),
});
export type OcrCarta = z.infer<typeof OcrCarta>;

/** Línea del borrador de validación (lo que el usuario revisa y corrige). */
export type DraftLine = {
  id: string;
  texto: string;
  cantidad: number | null;
  cantidadTexto: string;
  unidadCompra: string;
  factor: number | null;
  factorFuente: "articulo" | "texto" | "unidad" | "usuario" | null;
  precio: number | null;
  descuento: number;
  bonificadas: number;
  importe: number | null;
  ivaLeido: number | null;
  iva: number | null;
  ivaEsperado: number | null;
  conf: { linea: Conf; cantidad: Conf; precio: Conf };
  duda: string | null;
  match: { tipo: "tuyo" | "catalogo" | "nuevo"; id: string | null; score: number; porUsuario: boolean } | null;
  nuevo: { name: string; categoryId: string; unit: "kg" | "L" | "ud"; rend: number } | null;
  candidatos: { tipo: "tuyo" | "catalogo"; id: string; name: string; score: number }[];
  decisiones: { articulo: boolean; iva: boolean; cantidad: boolean; unidad: boolean };
  resuelto: { articulo: boolean; iva: boolean; cantidad: boolean; unidad: boolean };
  /** Cargos que no son producto (portes, envases): cuentan para el total pero no crean compra. */
  ignorar?: boolean;
  /** Línea añadida a mano por el usuario. */
  manual?: boolean;
};
export type Draft = {
  proveedor: { nombreLeido: string | null; cif: string | null; id: string | null; conf: Conf; nuevo: boolean; nombre?: string };
  tipoDocumento?: "albaran" | "factura" | "ticket" | "otro";
  duplicado?: { id: string; fecha: string | null } | null;
  manual?: boolean;
  resumen?: Resumen | null;
  numero: string | null; numeroAlt: string | null; confNumero: Conf; numeroRevisado: boolean;
  fecha: string | null; confFecha: Conf;
  total: number | null; confTotal: Conf;
  desglose: { tipo: number; base: number | null; cuota: number | null }[];
  lineas: DraftLine[];
  observaciones: string | null;
};

/** Lo que cambió al guardar un albarán (para la pantalla de guardado). */
export type Resumen = {
  lineas: number;
  nuevos: { id: string; name: string }[];
  cambios: { id: string; name: string; antes: number; ahora: number; variacion: number; unit: string }[];
  primeros: { id: string; name: string; precio: number; unit: string }[];
  recetas: { id: string; name: string; antes: number | null; ahora: number | null }[];
  proveedorNuevo: boolean;
  total: number;
};
