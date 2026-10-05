import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { camposConUnion } from "@/lib/ocr-wire";
import { MOCK_ALBARAN } from "@/server/ocr/mock-data";

// El cliente de Claude de mentira: cada llamada a messages.stream() consume la siguiente respuesta (o error) preparada.
type Body = { model: string; max_tokens: number; system: string; thinking?: unknown; output_config: { effort: string; format: { type: string; schema: Record<string, unknown> } }; messages: { content: { type: string }[] }[] };
const h = vi.hoisted(() => ({ cola: [] as (() => unknown)[], llamadas: [] as { body: Body; opts: { signal?: AbortSignal } }[] }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (body: Body, opts: { signal?: AbortSignal }) => {
        h.llamadas.push({ body, opts });
        return { finalMessage: async () => { const f = h.cola.shift(); if (!f) throw new Error("no hay respuesta preparada para esta llamada"); return f(); } };
      },
    };
  },
}));

import { readAlbaran, readCarta, sugerirReceta, type OcrFile } from "@/server/ocr";
import { OcrError } from "@/server/ocr/errors";

const wire = (o: typeof MOCK_ALBARAN = MOCK_ALBARAN) => ({
  ...o, numero_alternativo: o.numero_alternativo ?? "", observaciones: o.observaciones ?? "",
  descuento_global_pct: 0, descuento_global_importe: 0, precios_con_iva: false, total_sin_iva: 0,
  lineas: o.lineas.map((l) => ({ ...l, descuento_pct: l.descuento_pct ?? 0, bonificadas: l.bonificadas ?? 0, duda: l.duda ?? "", tipo: "producto" })),
});
const respuesta = (texto: string, extra: Record<string, unknown> = {}, usage = { input_tokens: 3000, output_tokens: 1500 }) => () => ({
  stop_reason: "end_turn", stop_details: null, usage, content: [{ type: "thinking", thinking: "" }, { type: "text", text: texto }], ...extra,
});
const ok = (o: unknown = wire(), usage?: { input_tokens: number; output_tokens: number }) => respuesta(JSON.stringify(o), {}, usage);
const falla = (status: number | undefined, message: string, name = "APIError") => () => { throw Object.assign(new Error(message), { status, name, error: { error: { message } } }); };
const dudosa = () => ({ ...wire(), lineas: wire().lineas.map((l) => ({ ...l, confianza: "baja" })) });

const FOTO: OcrFile[] = [{ data: Buffer.from("no es un albarán de ejemplo"), mime: "image/jpeg", name: "foto.jpg" }];
const VARS = ["ANTHROPIC_API_KEY", "OCR_PROVIDER", "OCR_MODEL", "OCR_ESCALATE_MODEL", "OCR_EFFORT", "OCR_MOCK_DELAY_MS"] as const;
const antes = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeEach(() => {
  h.cola.length = 0; h.llamadas.length = 0;
  for (const k of VARS) delete process.env[k];
  process.env.ANTHROPIC_API_KEY = "sk-ant-prueba"; process.env.OCR_MOCK_DELAY_MS = "0";
  vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); for (const k of VARS) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } });

describe("lectura de albaranes con la API de Claude", () => {
  it("una lectura limpia: una sola llamada, modelo actual, esquema válido y sin repaso", async () => {
    h.cola.push(ok());
    const { ocr, usage } = await readAlbaran(FOTO, "Casa Pujol");
    expect(ocr.lineas).toHaveLength(MOCK_ALBARAN.lineas.length);
    expect(ocr.lineas[0].descuento_pct).toBeNull(); // 0 → sin dato
    expect(h.llamadas).toHaveLength(1);
    const { body, opts } = h.llamadas[0];
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.output_config.effort).toBe("medium");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(camposConUnion(body.output_config.format.schema)).toBeLessThanOrEqual(12); // la API admite 16: aquí falló el 5 de octubre
    expect(body).not.toHaveProperty("thinking"); // Sonnet 5.5: el razonamiento va solo
    expect(body.max_tokens).toBeGreaterThanOrEqual(16_000);
    expect(opts.signal).toBeInstanceOf(AbortSignal); // cada llamada lleva su tiempo máximo
    expect(body.messages[0].content.map((c) => c.type)).toEqual(["image", "text"]);
    expect(usage).toMatchObject({ model: "claude-sonnet-5-5", escalated: false, inputTokens: 3000, outputTokens: 1500 });
    expect(usage.costUsd).toBeCloseTo((3000 * 2 + 1500 * 10) / 1e6, 6);
  });

  it("un descuento general del pie llega a la lectura (albarán de distribución con el 15 %)", async () => {
    h.cola.push(ok({ ...wire(), descuento_global_pct: 15, descuento_global_importe: 420, lineas: wire().lineas.map((l, i) => (i === 0 ? { ...l, tipo: "portes" } : l)) }));
    const { ocr } = await readAlbaran(FOTO, "Casa Pujol");
    expect(ocr.descuento_global_pct).toBe(15);
    expect(ocr.descuento_global_importe).toBe(420);
    expect(ocr.lineas[0].tipo).toBe("portes");
    expect(h.llamadas[0].body.system).toMatch(/descuento_global_pct/); // el prompt le explica dónde ponerlo
  });

  it("los PDF viajan como documento", async () => {
    h.cola.push(ok());
    await readAlbaran([{ data: Buffer.from("%PDF-1.4"), mime: "application/pdf", name: "a.pdf" }], "Casa Pujol");
    expect(h.llamadas[0].body.messages[0].content[0].type).toBe("document");
  });

  it("una lectura dudosa se repasa con el modelo superior y se suman los costes", async () => {
    h.cola.push(ok(dudosa(), { input_tokens: 3000, output_tokens: 1000 }), ok(wire(), { input_tokens: 3000, output_tokens: 2000 }));
    const { ocr, usage } = await readAlbaran(FOTO, "Casa Pujol");
    expect(h.llamadas.map((l) => l.body.model)).toEqual(["claude-sonnet-5-5", "claude-opus-5-5"]);
    expect(h.llamadas[1].body.output_config.effort).toBe("high");
    expect(ocr.lineas.every((l) => l.confianza !== "baja")).toBe(true);
    expect(usage).toMatchObject({ model: "claude-opus-5-5", escalated: true, inputTokens: 6000, outputTokens: 3000 });
    expect(usage.costUsd).toBeCloseTo((3000 * 2 + 1000 * 10 + 3000 * 4 + 2000 * 20) / 1e6, 6);
  });

  it("si el repaso falla (saturado), se queda con la primera lectura y no da error", async () => {
    h.cola.push(ok(dudosa()), falla(529, "Overloaded"));
    const { ocr, usage } = await readAlbaran(FOTO, "Casa Pujol");
    expect(h.llamadas).toHaveLength(2);
    expect(ocr.lineas.every((l) => l.confianza === "baja")).toBe(true);
    expect(usage.escalated).toBe(false);
  });

  it("si el primer modelo se niega a leerlo, lo intenta el otro", async () => {
    h.cola.push(respuesta("", { stop_reason: "refusal", stop_details: { type: "refusal", category: "general_harms" }, content: [] }), ok());
    const { usage } = await readAlbaran(FOTO, "Casa Pujol");
    expect(h.llamadas.map((l) => l.body.model)).toEqual(["claude-sonnet-5-5", "claude-opus-5-5"]);
    expect(usage).toMatchObject({ model: "claude-opus-5-5", escalated: true });
  });

  it("si se niegan los dos, avisa en español y apunta el motivo en los registros", async () => {
    const no = respuesta("", { stop_reason: "refusal", stop_details: { type: "refusal", category: "bio" }, content: [] });
    h.cola.push(no, no);
    await expect(readAlbaran(FOTO, "Casa Pujol")).rejects.toThrow(/no ha podido leer este documento/);
  });

  it("un documento demasiado largo (max_tokens) no intenta leer el JSON cortado", async () => {
    h.cola.push(respuesta('{"tipo_documento":"factura","lin', { stop_reason: "max_tokens" }));
    const e = await readAlbaran(FOTO, "Casa Pujol").catch((x) => x);
    expect(e).toBeInstanceOf(OcrError);
    expect(e.message).toMatch(/demasiado largo.*varias partes/);
    expect(e.message).not.toMatch(/Failed|JSON|AnthropicError/);
  });

  it("un JSON roto o fuera del esquema da un error claro, no inglés", async () => {
    h.cola.push(respuesta("esto no es json"));
    await expect(readAlbaran(FOTO, "Casa Pujol")).rejects.toThrow(/La lectura ha salido incompleta/);
    h.cola.push(ok({ ...wire(), lineas: "no es una lista" }));
    await expect(readAlbaran(FOTO, "Casa Pujol")).rejects.toThrow(/La lectura ha salido incompleta/);
  });

  it("tolera «Media» y «Albarán» con mayúsculas y tildes", async () => {
    h.cola.push(ok({ ...wire(), tipo_documento: "Albarán", confianza_total: "Media" }));
    const { ocr } = await readAlbaran(FOTO, "Casa Pujol");
    expect(ocr.tipo_documento).toBe("albaran");
    expect(ocr.confianza_total).toBe("media");
  });

  it("una foto que no es un documento se avisa de una vez y no se repasa (no se paga dos veces)", async () => {
    h.cola.push(ok({ ...wire(), tipo_documento: "otro", lineas: [], desglose_iva: [], total: null, observaciones: "Es una foto de una pared" }));
    await expect(readAlbaran(FOTO, "Casa Pujol")).rejects.toThrow(/No parece un albarán ni una factura/);
    expect(h.llamadas).toHaveLength(1);
  });

  it("solo lee los bloques de texto (ignora el razonamiento)", async () => {
    h.cola.push(() => ({ stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "thinking", thinking: "{no es json}" }, { type: "text", text: JSON.stringify(wire()) }] }));
    await expect(readAlbaran(FOTO, "Casa Pujol")).resolves.toBeTruthy();
  });

  it("los errores de la API llegan al usuario en español y sin detalles técnicos", async () => {
    h.cola.push(falla(400, "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing"));
    const e = await readAlbaran(FOTO, "Casa Pujol").catch((x) => x);
    expect(e.status).toBe(400); // el error original sigue ahí: compras.ts lo traduce con mensajeDeError y lo registra
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).toMatch(/credit balance/); // y el motivo exacto queda en los registros
  });

  it("los documentos de ejemplo se leen sin llamar a la API aunque haya clave", async () => {
    const ejemplo: OcrFile[] = [{ data: readFileSync(new URL("../../public/demo/albaran-ejemplo.jpg", import.meta.url)), mime: "image/jpeg", name: "albaran-ejemplo.jpg" }];
    const { ocr, usage } = await readAlbaran(ejemplo, "Casa Pujol");
    expect(ocr.lineas.length).toBeGreaterThan(5);
    expect(usage.model).toBe("ejemplo");
    expect(h.llamadas).toHaveLength(0);
  });

  it("sin clave en producción la lectura está desactivada (no inventa datos)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.stubEnv("NODE_ENV", "production");
    await expect(readAlbaran(FOTO, "Casa Pujol")).rejects.toThrow(/no está disponible todavía/);
    vi.unstubAllEnvs();
  });

  it("se pueden cambiar los modelos y el esfuerzo con variables", async () => {
    process.env.OCR_MODEL = "claude-haiku-4-5"; process.env.OCR_EFFORT = "high"; process.env.OCR_ESCALATE_MODEL = "claude-opus-5";
    h.cola.push(ok(dudosa()), ok());
    await readAlbaran(FOTO, "Casa Pujol");
    expect(h.llamadas.map((l) => [l.body.model, l.body.output_config.effort])).toEqual([["claude-haiku-4-5", "high"], ["claude-opus-5", "high"]]);
  });
});

describe("lectura de cartas", () => {
  it("lee con el esquema de la carta y suma el coste", async () => {
    h.cola.push(ok({ nombre_local: "Casa Pujol", platos: [{ nombre: "Tortilla", familia: "Entrantes", descripcion: null, precio: 8.5, confianza: "Alta" }] }));
    const { carta, usage } = await readCarta(FOTO);
    expect(carta.platos[0]).toMatchObject({ nombre: "Tortilla", precio: 8.5, confianza: "alta" });
    expect(camposConUnion(h.llamadas[0].body.output_config.format.schema)).toBeLessThanOrEqual(12);
    expect(usage.model).toBe("claude-sonnet-5-5");
  });
  it("una carta cortada por longitud lo dice en español", async () => {
    h.cola.push(respuesta('{"platos":[{"nom', { stop_reason: "max_tokens" }));
    await expect(readCarta(FOTO)).rejects.toThrow(/carta es demasiado larga/);
  });
});

describe("sugerencia de ingredientes", () => {
  const cat = [{ id: "a1", name: "Huevos", unit: "ud" as const }, { id: "a2", name: "Aceite de oliva", unit: "L" as const }, { id: "a3", name: "Patata", unit: "kg" as const }];
  it("acepta unidades escritas de otra forma y descarta ids inventados", async () => {
    h.cola.push(ok({ raciones: 4, pvp_sugerido: 9, ingredientes: [
      { catalog_id: "a1", cantidad: 6, unidad: "unidades" }, { catalog_id: "a2", cantidad: 0.2, unidad: "l" },
      { catalog_id: "a3", cantidad: 500, unidad: "gr" }, { catalog_id: "inventado", cantidad: 1, unidad: "kg" },
    ] }));
    const r = await sugerirReceta("Tortilla de patatas", "", "", cat);
    expect(r.lineas.map((l) => [l.cat, l.u])).toEqual([["a1", "ud"], ["a2", "L"], ["a3", "g"]]);
    expect(r.raciones).toBe(4);
    expect(h.llamadas[0].body.max_tokens).toBeGreaterThanOrEqual(4000);
  });
  it("un fallo de la IA llega como mensaje en español", async () => {
    h.cola.push(falla(529, "Overloaded"));
    const e = await sugerirReceta("Tortilla", "", "", cat).catch((x) => x);
    expect(e).toBeInstanceOf(OcrError);
    expect(e.message).toMatch(/saturada.*ingredientes a mano/);
  });
});
