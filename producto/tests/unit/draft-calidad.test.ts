import { describe, expect, it } from "vitest";
import { buildDraft, draftCheck, dtoGlobalPct, lineImporte, needsEscalation, pendientes, type ArtRef } from "@/lib/draft";
import { OcrAlbaran, type OcrLinea } from "@/lib/ocr-types";
import { albaranDeWire, suavizarEnums, WireAlbaran } from "@/lib/ocr-wire";
import { MOCK_ALBARAN } from "@/server/ocr/mock-data";

const catalog = [
  { id: "cerveza-barril", name: "Cerveza de barril", aliases: [] as string[], unit: "L" as const, categoryId: "cerveza", rend: 100 },
  { id: "tomate-pera", name: "Tomate pera", aliases: ["tomate"], unit: "kg" as const, categoryId: "verdura", rend: 95 },
  { id: "aceite", name: "Aceite de oliva", aliases: [] as string[], unit: "L" as const, categoryId: "aceite", rend: 100 },
];
const catIva = new Map([["cerveza", 21], ["verdura", 4], ["aceite", 4]]);
const ctx = { arts: [] as ArtRef[], catalog, catIva, provs: [], packs: new Map() };

const l = (descripcion: string, cantidad: number | null, unidad: string | null, precio: number | null, extra: Partial<OcrLinea> = {}): OcrLinea => ({
  descripcion, cantidad, cantidad_texto: cantidad == null ? "" : String(cantidad), unidad, precio_unitario: precio, descuento_pct: null, bonificadas: null,
  importe: cantidad != null && precio != null ? Math.round(cantidad * precio * 100) / 100 : null, iva_pct: 10,
  confianza: "alta", confianza_cantidad: "alta", confianza_precio: "alta", duda: null, ...extra,
});
const albaran = (lineas: OcrLinea[], extra: Record<string, unknown> = {}) =>
  OcrAlbaran.parse({ ...MOCK_ALBARAN, lineas, desglose_iva: [], total: null, observaciones: null, ...extra });
const draft = (lineas: OcrLinea[], extra: Record<string, unknown> = {}) => buildDraft(albaran(lineas, extra), ctx);
const uno = (linea: OcrLinea, extra: Record<string, unknown> = {}) => draft([linea], extra).lineas[0];

describe("líneas dudosas: siempre piden revisión", () => {
  it("una línea con confianza baja ya no sale como «leída con seguridad»", () => {
    const x = uno(l("TOMATE PERA", 10, "kg", 2, { confianza: "baja" }));
    expect(x.decisiones.cantidad).toBe(true);
    expect(pendientes(x)).toContain("cantidad");
    expect(x.duda).toMatch(/No estamos seguros de haber leído bien esta línea/);
  });
  it("si el modelo explicó su duda, se muestra esa y no una genérica", () => {
    const x = uno(l("TOMATE PERA", 10, "kg", 2, { confianza: "baja", duda: "El 1 podría ser un 7" }));
    expect(x.duda).toBe("El 1 podría ser un 7");
  });
  it("un precio con confianza baja pide revisión y lo dice", () => {
    const x = uno(l("TOMATE PERA", 10, "kg", 2, { confianza_precio: "baja" }));
    expect(x.decisiones.cantidad).toBe(true);
    expect(x.duda).toMatch(/precio no se lee con seguridad/);
  });
  it("si el importe impreso no cuadra con cantidad × precio, avisa con las dos cifras", () => {
    const x = uno(l("TOMATE PERA", 10, "kg", 2.5, { importe: 52.5 }));
    expect(x.decisiones.cantidad).toBe(true);
    expect(x.duda).toMatch(/52,50 €.*10 × 2,50 €.*25,00 €/);
  });
  it("con un descuento propio la cuenta lo tiene en cuenta", () => {
    expect(uno(l("TOMATE PERA", 10, "kg", 2, { descuento_pct: 10, importe: 18 })).decisiones.cantidad).toBe(false);
    expect(uno(l("TOMATE PERA", 10, "kg", 2, { descuento_pct: 10, importe: 20 })).decisiones.cantidad).toBe(true);
  });
  it("dentro de la tolerancia (2 % o 5 céntimos) no molesta", () => {
    expect(uno(l("TOMATE PERA", 10, "kg", 2.5, { importe: 25.04 })).decisiones.cantidad).toBe(false);
    expect(uno(l("TOMATE PERA", 3, "kg", 1.333, { importe: 4 })).decisiones.cantidad).toBe(false);
  });
  it("sin importe impreso, o con la cantidad deducida del importe, no hay nada que comparar", () => {
    expect(uno(l("TOMATE PERA", 10, "kg", 2, { importe: null })).decisiones.cantidad).toBe(false);
    const deducida = uno(l("TOMATE PERA", null, "kg", 2, { importe: 20, confianza_cantidad: "alta" }));
    expect(deducida.cantidad).toBe(10);
    expect(deducida.decisiones.cantidad).toBe(true); // sin cantidad impresa sí se confirma, pero por eso y no por un descuadre
    expect(deducida.duda ?? "").not.toMatch(/no cuadra/);
  });
  it("un albarán sin valorar pide el precio de cada línea desde el principio", () => {
    const x = uno(l("TOMATE PERA", 10, "kg", null, { importe: null }));
    expect(x.decisiones.cantidad).toBe(true);
    expect(x.duda).toMatch(/No aparece el precio/);
  });
  it("una línea limpia sigue sin pedir nada", () => {
    const x = uno(l("TOMATE PERA", 10, "kg", 2));
    expect(x.decisiones.cantidad).toBe(false);
    expect(x.duda).toBeNull();
  });
});

describe("descuento general del pie (el albarán de internet del 15 %)", () => {
  // Distribuciones del Centro → Fritos y Secos: 3 líneas, subtotal 2.800, descuento 15 % (−420), base 2.380, IVA 10 % impreso 280, total 2.660
  const internet = (extra: Record<string, unknown> = {}) => albaran([
    l("C09456", 100, "ud", 6, { importe: 600 }), l("D12456", 120, "ud", 10, { importe: 1200 }), l("E03738", 200, "ud", 5, { importe: 1000 }),
  ], { descuento_global_pct: 15, descuento_global_importe: 420, desglose_iva: [{ tipo: 4, base: null, cuota: 0 }, { tipo: 10, base: null, cuota: 280 }, { tipo: 21, base: null, cuota: 0 }], total: 2660, ...extra });

  it("reparte el 15 % entre las líneas: el coste real de cada producto lleva el descuento", () => {
    const d = buildDraft(internet(), ctx);
    expect(d.lineas.map((x) => x.descuento)).toEqual([15, 15, 15]);
    expect(d.lineas.map((x) => lineImporte(x))).toEqual([510, 1020, 850]);
    expect(d.lineas.map((x) => x.precio)).toEqual([6, 10, 5]); // el precio impreso no se toca
    expect(d.observaciones).toMatch(/Descuento general del 15 %.*420,00 €.*repartido entre las líneas/);
  });
  it("no pregunta por el importe de las líneas: el impreso es el de antes del descuento y cuadra", () => {
    const d = buildDraft(internet(), ctx);
    expect(d.lineas.every((x) => !x.decisiones.cantidad)).toBe(true);
  });
  it("no repasa con el modelo caro: base 2.380 + IVA impreso 280 = total 2.660", () => {
    expect(needsEscalation(internet())).toBe(false);
    // Sin tener en cuenta el descuento general (como antes) habría salido «no cuadra» y se habría pagado el repaso
    expect(needsEscalation(internet({ descuento_global_pct: 0, descuento_global_importe: 0 }))).toBe(true);
  });
  it("la base sale 2.380 y, con el IVA de cada línea, el total es coherente (este documento aplica el IVA sobre 2.800)", () => {
    const d = buildDraft(internet(), ctx);
    const c = draftCheck(d);
    expect(c.base).toBeCloseTo(2380, 6);
    expect(c.cuota).toBeCloseTo(238, 6);
    expect(c.total).toBeCloseTo(2618, 6);
    expect(c.cuadra).toBe(false); // el documento calcula su IVA (280) sobre el subtotal sin descuento: con razón avisa
    expect(c.diff).toBeCloseTo(-42, 6);
  });
  it("con un documento coherente (IVA sobre la base rebajada) cuadra", () => {
    const d = buildDraft(internet({ total: 2618, desglose_iva: [{ tipo: 10, base: 2380, cuota: 238 }] }), ctx);
    const c = draftCheck(d);
    expect(c.cuadra).toBe(true);
    expect(c.desglose[0]).toMatchObject({ tipo: 10, ok: true });
  });
  it("si solo hay el importe del descuento, saca el porcentaje de importe / suma de líneas", () => {
    expect(dtoGlobalPct(internet({ descuento_global_pct: 0, descuento_global_importe: 420 }))).toBeCloseTo(15, 6);
    expect(dtoGlobalPct(internet({ descuento_global_pct: 7.5, descuento_global_importe: 0 }))).toBe(7.5);
    expect(dtoGlobalPct(internet({ descuento_global_pct: 0, descuento_global_importe: 0 }))).toBe(0);
    expect(dtoGlobalPct(internet({ descuento_global_pct: 0, descuento_global_importe: 99999 }))).toBe(0); // más que todo: no es creíble
  });
  it("se suma al descuento propio de la línea (10 % y 15 % → 23,5 %)", () => {
    const x = buildDraft(albaran([l("C09456", 100, "ud", 10, { descuento_pct: 10, importe: 900 })], { descuento_global_pct: 15 }), ctx).lineas[0];
    expect(x.descuento).toBeCloseTo(23.5, 6);
    expect(lineImporte(x)).toBeCloseTo(765, 6);
  });
  it("no rebaja una devolución", () => {
    const d = buildDraft(albaran([l("TOMATE PERA", 10, "kg", 2), l("DEVOLUCION TOMATE", -2, "kg", 2, { tipo: "devolucion", importe: -4 })], { descuento_global_pct: 10 }), ctx);
    expect(d.lineas[0].descuento).toBe(10);
    expect(d.lineas[1].descuento).toBe(0);
  });
  it("sin descuento general todo queda como antes", () => {
    const d = buildDraft(albaran([l("TOMATE PERA", 10, "kg", 2)]), ctx);
    expect(d.lineas[0].descuento).toBe(0);
    expect(d.observaciones).toBeNull();
  });
});

describe("líneas que no son producto", () => {
  it("un casco de barril no se empareja con la cerveza ni toca su precio", () => {
    const x = uno(l("CASCO BARRIL CERVEZA 30L", 1, "ud", 30, { tipo: "envase", iva_pct: 21 }));
    expect(x.ignorar).toBe(true);
    expect(x.tipo).toBe("envase");
    expect(x.match).toBeNull();
    expect(x.candidatos.length).toBeGreaterThan(0); // por si el usuario quiere deshacerlo
    expect(x.factor).toBeNull();
    expect(Object.values(x.decisiones).every((v) => !v)).toBe(true);
    expect(pendientes(x)).toEqual([]);
  });
  it("el mismo texto como producto sí se empareja (el tipo manda)", () => {
    const x = uno(l("CERVEZA DE BARRIL", 1, "barril", 62, { tipo: "producto" }));
    expect(x.match?.id).toBe("cerveza-barril");
    expect(x.ignorar).toBeUndefined();
  });
  it("los portes llevan el IVA más alto del documento cuando no dicen el suyo", () => {
    const d = draft([l("TOMATE PERA", 10, "kg", 2, { iva_pct: 4, importe: 20 }), l("CERVEZA DE BARRIL", 1, "barril", 50, { iva_pct: 21, importe: 50 }), l("PORTES", 1, "ud", 6, { tipo: "portes", iva_pct: null, importe: 6 })],
      { desglose_iva: [{ tipo: 4, base: 20, cuota: 0.8 }, { tipo: 21, base: 56, cuota: 11.76 }], total: 88.56 });
    const portes = d.lineas[2];
    expect(portes.ivaLeido).toBe(21);
    expect(portes.iva).toBe(21);
    for (const x of d.lineas) if (!x.ignorar) x.iva = x.ivaLeido;
    const c = draftCheck(d);
    expect(c.cuota).toBeCloseTo(0.8 + 10.5 + 1.26, 6);
    expect(c.cuadra).toBe(true);
  });
  it("una devolución queda marcada, se explica y no impide guardar", () => {
    const d = draft([l("TOMATE PERA", 12, "kg", 2, { iva_pct: 4 }), l("DEVOLUCION TOMATE PERA", -2, "kg", 2, { tipo: "devolucion", iva_pct: 4, importe: -4 })]);
    expect(d.lineas[1]).toMatchObject({ ignorar: true, tipo: "devolucion" });
    expect(d.observaciones).toMatch(/devolución o un abono/);
    expect(pendientes(d.lineas[1])).toEqual([]);
    expect(lineImporte(d.lineas[1])).toBeCloseTo(-4, 6);
  });
  it("las lecturas antiguas (sin tipo) siguen siendo productos", () => {
    expect(uno(l("TOMATE PERA", 10, "kg", 2)).ignorar).toBeUndefined();
  });
});

describe("de la respuesta del modelo al tipo de la app", () => {
  const wire = (lineas: Record<string, unknown>[], extra: Record<string, unknown> = {}) => WireAlbaran.parse({
    ...MOCK_ALBARAN, numero_alternativo: "", observaciones: "", total_sin_iva: 0, precios_con_iva: false, descuento_global_pct: 0, descuento_global_importe: 0,
    lineas: lineas.map((x) => ({ descuento_pct: 0, bonificadas: 0, duda: "", tipo: "producto", ...x })), ...extra,
  });
  const base = { descripcion: "TOMATE", cantidad: 1, cantidad_texto: "1", unidad: "kg", precio_unitario: 2, importe: 2, iva_pct: 4, confianza: "alta", confianza_cantidad: "alta", confianza_precio: "alta" };

  it("un descuento escrito como línea pasa al descuento general y la línea desaparece", () => {
    const o = albaranDeWire(wire([base, { ...base, descripcion: "DTO PRONTO PAGO", tipo: "descuento", cantidad: 1, precio_unitario: -12.5, importe: -12.5 }]));
    expect(o.lineas).toHaveLength(1);
    expect(o.descuento_global_importe).toBe(12.5);
  });
  it("si el descuento ya viene en el pie, la línea repetida se descarta (no se cuenta dos veces)", () => {
    const o = albaranDeWire(wire([base, { ...base, descripcion: "DTO", tipo: "descuento", importe: -12.5 }], { descuento_global_pct: 5 }));
    expect(o.lineas).toHaveLength(1);
    expect(o.descuento_global_pct).toBe(5);
    expect(o.descuento_global_importe).toBeUndefined();
  });
  it("0 significa «no hay»: sin descuento, sin IVA incluido y sin total sin IVA", () => {
    const o = albaranDeWire(wire([base]));
    expect(o.descuento_global_pct).toBeUndefined();
    expect(o.descuento_global_importe).toBeUndefined();
    expect(o.precios_con_iva).toBeUndefined();
    expect(o.total_sin_iva).toBeNull();
  });
  it("conserva el tipo de cada línea, el IVA incluido y el total sin IVA", () => {
    const o = albaranDeWire(wire([base, { ...base, tipo: "portes" }], { precios_con_iva: true, total_sin_iva: 27.54, total: null }));
    expect(o.lineas.map((x) => x.tipo)).toEqual(["producto", "portes"]);
    expect(o.precios_con_iva).toBe(true);
    expect(o.total_sin_iva).toBe(27.54);
  });
  it("el tipo de línea con tilde o mayúsculas se corrige; uno desconocido es un producto; el tipo del desglose (un número) no se toca", () => {
    const x = suavizarEnums({ lineas: [{ tipo: "Devolución" }, { tipo: "gastos raros" }, { tipo: "ENVASE" }], desglose_iva: [{ tipo: 10, base: 1, cuota: 0.1 }] }) as { lineas: { tipo: string }[]; desglose_iva: { tipo: number }[] };
    expect(x.lineas.map((v) => v.tipo)).toEqual(["devolucion", "producto", "envase"]);
    expect(x.desglose_iva[0].tipo).toBe(10);
  });
});

describe("precios con IVA incluido y albaranes sin IVA", () => {
  it("un ticket con IVA incluido se pasa a precios sin IVA y cuadra con su total", () => {
    // 4,16 € (IVA 4 % incluido) + 14,40 € (IVA 10 % incluido) = 18,56 €
    const d = draft([l("TOMATE PERA", 4, "kg", 1.04, { iva_pct: 4, importe: 4.16 }), l("ACEITE", 1, "ud", 14.4, { iva_pct: 10, importe: 14.4 })], { precios_con_iva: true, total: 18.56, tipo_documento: "ticket" });
    expect(d.lineas[0].precio).toBeCloseTo(1, 4);
    expect(d.lineas[0].importe).toBeCloseTo(4, 2);
    expect(d.lineas[1].precio).toBeCloseTo(13.0909, 4);
    expect(d.observaciones).toMatch(/IVA incluido: los hemos pasado a precios sin IVA/);
    for (const x of d.lineas) x.iva = x.ivaLeido;
    const c = draftCheck(d);
    expect(c.total).toBeCloseTo(18.56, 2);
    expect(c.cuadra).toBe(true);
  });
  it("un ticket con IVA incluido no se repasa con el modelo caro por no cuadrar", () => {
    const o = albaran([l("TOMATE PERA", 4, "kg", 1.04, { iva_pct: 4, importe: 4.16 }), l("ACEITE", 1, "ud", 14.4, { iva_pct: 10, importe: 14.4 })], { precios_con_iva: true, total: 18.56, tipo_documento: "ticket" });
    expect(needsEscalation(o)).toBe(false);
    expect(needsEscalation({ ...o, precios_con_iva: undefined })).toBe(true); // tratado como precios sin IVA, saldría 21,75 contra 18,56
  });
  it("una línea con IVA incluido sin saber su IVA no se convierte a ciegas: pide revisión", () => {
    const x = uno(l("TOMATE PERA", 4, "kg", 1.04, { iva_pct: null, importe: 4.16 }), { precios_con_iva: true });
    expect(x.precio).toBe(1.04);
    expect(x.decisiones.cantidad).toBe(true);
    expect(x.duda).toMatch(/lleva el IVA incluido y esta línea no dice qué IVA tiene/);
  });
  it("un albarán valorado sin IVA se compara con la suma de las bases, no con base + IVA", () => {
    // 22,20 + 5,34 = 27,54 y el documento no desglosa IVA
    const d = draft([l("TOMATE PERA", 12, "kg", 1.85, { iva_pct: null, importe: 22.2 }), l("LIMON", 3, "kg", 1.78, { iva_pct: null, importe: 5.34 })], { total: null, total_sin_iva: 27.54 });
    expect(d.totalSinIva).toBe(27.54);
    for (const x of d.lineas) x.iva = 4;
    const c = draftCheck(d);
    expect(c.sinIva).toBe(true);
    expect(c.objetivo).toBe(27.54);
    expect(c.comparado).toBeCloseTo(27.54, 6);
    expect(c.cuadra).toBe(true);
    // y no se repasa con el modelo caro
    expect(needsEscalation(albaran([l("TOMATE PERA", 12, "kg", 1.85, { iva_pct: null, importe: 22.2 }), l("LIMON", 3, "kg", 1.78, { iva_pct: null, importe: 5.34 })], { total: null, total_sin_iva: 27.54 }))).toBe(false);
  });
  it("si no cuadra, lo dice con las cifras sin IVA", () => {
    const d = draft([l("TOMATE PERA", 12, "kg", 1.85, { iva_pct: null, importe: 22.2 })], { total: null, total_sin_iva: 30 });
    d.lineas[0].iva = 4;
    const c = draftCheck(d);
    expect(c.cuadra).toBe(false);
    expect(c.diff).toBeCloseTo(-7.8, 6);
  });
  it("un documento normal sigue comparando el total con IVA", () => {
    const d = draft([l("TOMATE PERA", 10, "kg", 2, { iva_pct: 4 })], { total: 20.8 });
    d.lineas[0].iva = 4;
    const c = draftCheck(d);
    expect(c.sinIva).toBe(false);
    expect(c.cuadra).toBe(true);
  });
  it("sin desglose ni IVA en las líneas no se puede comparar, y no se repasa por eso", () => {
    expect(needsEscalation(albaran([l("TOMATE PERA", 10, "kg", 2, { iva_pct: null })], { total: 50 }))).toBe(false);
  });
});
