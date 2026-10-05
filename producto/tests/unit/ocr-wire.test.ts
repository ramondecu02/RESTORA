import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { OcrAlbaran } from "@/lib/ocr-types";
import { albaranDeWire, camposConUnion, ESQUEMA_ALBARAN, ESQUEMA_CARTA, suavizarEnums, WireAlbaran } from "@/lib/ocr-wire";
import { MOCK_ALBARAN } from "@/server/ocr/mock-data";

// La API de salida estructurada rechaza (400) un esquema con más de 16 campos «con unión» (los que pueden ser null).
// El 5 de octubre de 2026 el esquema de la app tenía 17 y TODAS las lecturas de albaranes reales fallaban con ese 400.
const LIMITE_API = 16;
const MARGEN = 4; // por debajo del límite: añadir un par de campos más no debe volver a romperlo

type Obj = Record<string, unknown>;
const objetos = (s: unknown, out: Obj[] = []): Obj[] => {
  if (Array.isArray(s)) s.forEach((x) => objetos(x, out));
  else if (s && typeof s === "object") { const o = s as Obj; if (o.type === "object") out.push(o); Object.values(o).forEach((v) => objetos(v, out)); }
  return out;
};

describe("esquemas que se envían a la API de Claude", () => {
  it("el esquema de albaranes y facturas tiene pocos campos con unión", () => {
    expect(camposConUnion(ESQUEMA_ALBARAN)).toBeLessThanOrEqual(LIMITE_API - MARGEN);
  });
  it("el esquema de la carta también", () => {
    expect(camposConUnion(ESQUEMA_CARTA)).toBeLessThanOrEqual(LIMITE_API - MARGEN);
  });
  it("el tipo de la app (con todos los null) NO sirve para enviar: se pasa del límite", () => {
    // Si alguien vuelve a mandar zodOutputFormat(OcrAlbaran), esta prueba recuerda por qué no
    expect(camposConUnion(zodOutputFormat(OcrAlbaran).schema)).toBeGreaterThan(LIMITE_API);
  });
  it("todos los objetos cierran sus propiedades y las piden todas (sin campos opcionales)", () => {
    for (const o of [...objetos(ESQUEMA_ALBARAN), ...objetos(ESQUEMA_CARTA)]) {
      expect(o.additionalProperties).toBe(false);
      expect([...(o.required as string[])].sort()).toEqual(Object.keys(o.properties as Obj).sort());
    }
  });
  it("manda enums reales (no texto en la descripción) y sin $schema", () => {
    const p = ESQUEMA_ALBARAN.properties as Record<string, Obj>;
    expect(p.tipo_documento.enum).toEqual(["albaran", "factura", "ticket", "otro"]);
    expect(p.confianza_total.enum).toEqual(["alta", "media", "baja"]);
    expect(ESQUEMA_ALBARAN).not.toHaveProperty("$schema");
  });
  it("camposConUnion cuenta tipos múltiples y anyOf", () => {
    expect(camposConUnion({ type: "object", properties: { a: { type: ["string", "null"] }, b: { anyOf: [{ type: "string" }, { type: "number" }] }, c: { type: "number" } } })).toBe(2);
  });
});

describe("de lo que devuelve el modelo al tipo de la app", () => {
  const wire = () => ({
    ...MOCK_ALBARAN,
    numero_alternativo: "", observaciones: "  ",
    lineas: MOCK_ALBARAN.lineas.map((l) => ({ ...l, descuento_pct: 0, bonificadas: 0, duda: "" })),
  });
  it("0 y cadena vacía vuelven a ser «sin dato»", () => {
    const o = albaranDeWire(WireAlbaran.parse(wire()));
    expect(o.numero_alternativo).toBeNull();
    expect(o.observaciones).toBeNull();
    expect(o.lineas.every((l) => l.descuento_pct === null && l.bonificadas === null && l.duda === null)).toBe(true);
  });
  it("conserva los descuentos, las unidades gratis y las dudas reales", () => {
    const w = wire();
    w.lineas[0] = { ...w.lineas[0], descuento_pct: 12.5, bonificadas: 1, duda: "el 8 podría ser un 3" };
    w.numero_alternativo = "A-2281";
    const o = albaranDeWire(WireAlbaran.parse(w));
    expect(o.lineas[0]).toMatchObject({ descuento_pct: 12.5, bonificadas: 1, duda: "el 8 podría ser un 3" });
    expect(o.numero_alternativo).toBe("A-2281");
  });
});

describe("enums con mayúsculas o tildes", () => {
  it("se corrigen en vez de tirar la lectura entera", () => {
    const x = suavizarEnums({ tipo_documento: "Albarán", confianza_total: "Media", lineas: [{ confianza: "ALTA", confianza_precio: "dudosa" }] }) as Obj;
    expect(x.tipo_documento).toBe("albaran");
    expect(x.confianza_total).toBe("media");
    expect((x.lineas as Obj[])[0]).toEqual({ confianza: "alta", confianza_precio: "baja" });
    expect(suavizarEnums({ tipo_documento: "recibo raro" })).toEqual({ tipo_documento: "otro" });
  });
  it("no toca el resto de textos (una unidad «caja» sigue siendo «caja»)", () => {
    expect(suavizarEnums({ lineas: [{ unidad: "Caja", descripcion: "Tomate" }] })).toEqual({ lineas: [{ unidad: "Caja", descripcion: "Tomate" }] });
  });
});
