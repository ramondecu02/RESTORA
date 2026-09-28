// Lectura de documentos con la API de Claude (salida estructurada) o con datos de ejemplo.
// Por defecto lee con Sonnet; si la lectura sale dudosa (muchas líneas poco seguras o totales
// que no cuadran) repasa con Opus y se queda con esa lectura. Registra tokens, coste y tiempo.
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { OcrAlbaran, OcrCarta } from "@/lib/ocr-types";
import { needsEscalation } from "@/lib/draft";
import { PLANTILLAS } from "@/lib/plantillas";
import { compatible, type BaseUnit, type LineUnit } from "@/lib/units";
import { env } from "../env";
import { MOCK_ALBARAN, MOCK_ALBARAN_GIL, MOCK_CARTA, SAMPLE_HASHES } from "./mock-data";

export type OcrFile = { data: Buffer; mime: string; name: string };
export type OcrUsage = { model: string; inputTokens: number; outputTokens: number; costUsd: number; ms: number; escalated: boolean };

/** Precio de referencia en USD por millón de tokens (entrada / salida), para registrar el coste de cada lectura.
 *  Si cambian los precios o usas otro modelo, ajusta la tabla o define OCR_PRICE_IN y OCR_PRICE_OUT. */
const PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5": [2, 10],
  "claude-opus-5": [5, 25],
  "claude-opus-5-5": [4, 20],
  "claude-haiku-4-5": [1, 5],
};
export function costOf(model: string, input: number, output: number): number {
  const [i, o] = PRICES[model] ?? [Number(process.env.OCR_PRICE_IN || 3), Number(process.env.OCR_PRICE_OUT || 15)];
  return (input * i + output * o) / 1_000_000;
}

const SYSTEM_ALBARAN = `Eres el lector de albaranes y facturas de proveedores de RESTORA, una herramienta de control de costes para restaurantes en España.
Tu trabajo es transcribir el documento con exactitud a la estructura pedida. Nunca inventes datos: si algo no se lee, déjalo en null y dilo en "duda".

Reglas:
- Todas las imágenes o páginas forman un único documento. No repitas líneas que aparezcan en dos fotos solapadas.
- El proveedor es quien EMITE el documento (logotipo, CIF del emisor), no el cliente al que va dirigido.
- Una línea por producto o cargo con importe. Incluye portes, envases o recargos si tienen importe, para que los totales cuadren.
- Números con punto decimal (1.234,56 € en el papel → 1234.56). Fechas en formato AAAA-MM-DD (los documentos españoles usan día/mes/año).
- "unidad": la unidad de venta impresa (kg, ud, caja, garrafa 5 L, estuche 30...). La cantidad es en esa unidad.
- "precio_unitario" e "importe" SIN IVA. Si el documento solo muestra precios con IVA incluido, indícalo en "observaciones".
- "descuento_pct" si la línea tiene descuento; "bonificadas" si hay unidades regaladas (por ejemplo 6+1 → 1).
- "iva_pct": el tipo de la línea si aparece (a veces como código A/B/C con leyenda en el pie: tradúcelo al porcentaje). Si no aparece, null.
- "desglose_iva": las bases y cuotas por tipo del pie del documento. "total": el total a pagar.
- Confianza: "alta" si lo lees sin dudar; "media" si hay algún carácter dudoso pero el resto del documento lo confirma (por ejemplo, cantidad × precio = importe); "baja" si no se lee o no cuadra.
- Si un número admite dos lecturas (0/8, 1/7, 3/8, 5/6), pon la más probable y la otra en "numero_alternativo" o en "duda".
- Comprueba que cantidad × precio × (1 − descuento) ≈ importe en cada línea; si no cuadra, baja la confianza y explica la duda.`;

const SYSTEM_CARTA = `Eres el lector de cartas de RESTORA. Transcribe los platos y bebidas de la carta de un restaurante español.
Para cada producto: nombre tal cual, sección de la carta (familia), descripción si la hay y precio de venta con IVA tal cual aparece.
No inventes precios: si un plato no tiene precio visible, pon null. Ignora alérgenos, horarios y textos decorativos.`;

function toBlocks(files: OcrFile[]): Anthropic.ContentBlockParam[] {
  return files.map((f) =>
    f.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data.toString("base64") } }
      : { type: "image", source: { type: "base64", media_type: f.mime as "image/jpeg" | "image/png" | "image/webp", data: f.data.toString("base64") } });
}

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2, timeout: 180_000 }));

async function callAlbaran(files: OcrFile[], model: string, effort: "low" | "medium" | "high", clienteNombre: string) {
  const t0 = Date.now();
  const msg = await api().messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM_ALBARAN,
    output_config: { format: zodOutputFormat(OcrAlbaran), effort },
    messages: [{
      role: "user",
      content: [
        ...toBlocks(files),
        { type: "text", text: `Lee este documento de compra. El cliente (el restaurante que lo sube) se llama «${clienteNombre}»: no lo confundas con el proveedor.` },
      ],
    }],
  });
  if (msg.stop_reason === "refusal") throw new Error("El modelo no ha podido leer el documento.");
  if (!msg.parsed_output) throw new Error(msg.stop_reason === "max_tokens" ? "El documento es demasiado largo para leerlo de una vez." : "La lectura ha salido incompleta.");
  return { result: msg.parsed_output, model, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, ms: Date.now() - t0 };
}

/** ¿Es uno de los documentos de ejemplo? (una sola página con la misma huella). */
function sampleOf(files: OcrFile[]) {
  return files.length === 1 ? SAMPLE_HASHES[createHash("sha256").update(files[0].data).digest("hex")] ?? null : null;
}
const NO_USAGE = (model: string): OcrUsage => ({ model, inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 0, escalated: false });
const OFF = "La lectura automática no está disponible todavía. Puedes apuntar el documento a mano.";
const pause = () => new Promise((r) => setTimeout(r, Number(process.env.OCR_MOCK_DELAY_MS ?? 1200)));

export async function readAlbaran(files: OcrFile[], clienteNombre: string): Promise<{ ocr: OcrAlbaran; usage: OcrUsage }> {
  const sample = sampleOf(files);
  if (sample === "albaran" || sample === "albaran-gil" || env.ocrProvider === "mock") {
    await pause();
    const gil = sample ? sample === "albaran-gil" : files.some((f) => /gil|fg-/i.test(f.name));
    const ocr = OcrAlbaran.parse(JSON.parse(JSON.stringify(gil ? MOCK_ALBARAN_GIL : MOCK_ALBARAN)));
    return { ocr, usage: NO_USAGE(sample ? "ejemplo" : "mock") };
  }
  if (env.ocrProvider === "off") throw new Error(OFF);
  const first = await callAlbaran(files, env.ocrModel, env.ocrEffort, clienteNombre);
  let usage: OcrUsage = { model: first.model, inputTokens: first.inputTokens, outputTokens: first.outputTokens, costUsd: costOf(first.model, first.inputTokens, first.outputTokens), ms: first.ms, escalated: false };
  let ocr = first.result;
  if (needsEscalation(ocr) && env.ocrEscalateModel && env.ocrEscalateModel !== env.ocrModel) {
    try {
      const second = await callAlbaran(files, env.ocrEscalateModel, "medium", clienteNombre);
      ocr = second.result;
      usage = {
        model: second.model, escalated: true,
        inputTokens: usage.inputTokens + second.inputTokens, outputTokens: usage.outputTokens + second.outputTokens,
        costUsd: usage.costUsd + costOf(second.model, second.inputTokens, second.outputTokens), ms: usage.ms + second.ms,
      };
    } catch (e) {
      console.error("[ocr] el repaso con el modelo superior ha fallado; se usa la primera lectura", (e as Error).message);
    }
  }
  return { ocr, usage };
}

export async function readCarta(files: OcrFile[]): Promise<{ carta: OcrCarta; usage: OcrUsage }> {
  const sample = sampleOf(files);
  if (sample === "carta" || env.ocrProvider === "mock") {
    await pause();
    return { carta: OcrCarta.parse(JSON.parse(JSON.stringify(MOCK_CARTA))), usage: NO_USAGE(sample ? "ejemplo" : "mock") };
  }
  if (env.ocrProvider === "off") throw new Error(OFF);
  const t0 = Date.now();
  const model = env.ocrModel;
  const msg = await api().messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM_CARTA,
    output_config: { format: zodOutputFormat(OcrCarta), effort: "low" },
    messages: [{ role: "user", content: [...toBlocks(files), { type: "text", text: "Transcribe esta carta." }] }],
  });
  if (msg.stop_reason === "refusal" || !msg.parsed_output) throw new Error("No se ha podido leer la carta.");
  return {
    carta: msg.parsed_output,
    usage: { model, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, costUsd: costOf(model, msg.usage.input_tokens, msg.usage.output_tokens), ms: Date.now() - t0, escalated: false },
  };
}

// ---- Sugerencia de ingredientes de un plato (a partir del nombre) con Claude ----
const SYSTEM_RECETA = `Eres un jefe de cocina español que ayuda a montar el escandallo de un plato en RESTORA.
A partir del nombre del plato (y su descripción si la hay) propones sus ingredientes principales con cantidades realistas para el número de raciones que se indique.
Reglas:
- Usa SOLO artículos de la lista de catálogo que se te da, con su id EXACTO. No inventes ids ni ingredientes que no estén en la lista.
- Elige la unidad coherente con la del artículo: g o kg para peso, ml o L para líquidos, ud para lo que va por unidades.
- Cantidades por el TOTAL de raciones indicado, no por ración. Sé realista (un plato de carta lleva entre 3 y 12 ingredientes).
- Incluye el aceite, la sal y los básicos si el plato los lleva. No incluyas agua del grifo ni guarniciones de otra receta.
- "pvp_sugerido": un precio de venta con IVA orientativo para ese plato en un restaurante español, o null si no lo tienes claro.`;

const IaReceta = z.object({
  raciones: z.number().describe("Raciones que salen con estas cantidades (normalmente 1 para un plato de carta)"),
  pvp_sugerido: z.number().nullable().describe("Precio de venta con IVA orientativo en euros, o null"),
  ingredientes: z.array(z.object({
    catalog_id: z.string().describe("El id EXACTO de un artículo de la lista del catálogo"),
    cantidad: z.number().describe("Cantidad para el total de raciones indicado"),
    unidad: z.enum(["g", "kg", "ml", "L", "ud"]),
  })).describe("Entre 3 y 12 ingredientes"),
});

export type CatalogoItem = { id: string; name: string; unit: BaseUnit };
export type RecetaSugerida = { raciones: number; pvp: number | null; lineas: { cat: string; q: number; u: LineUnit; name: string }[]; modelo: string };

const clean = (raciones: number, pvp: number | null, items: { catalog_id: string; cantidad: number; unidad: LineUnit }[], cat: Map<string, CatalogoItem>): RecetaSugerida => {
  const vistos = new Set<string>();
  const lineas: RecetaSugerida["lineas"] = [];
  for (const it of items) {
    const a = cat.get(it.catalog_id);
    // Descartamos ids inventados, unidades que no casan con el artículo y cantidades no válidas
    if (!a || vistos.has(a.id) || !compatible(a.unit, it.unidad) || !(it.cantidad > 0 && it.cantidad < 1e6)) continue;
    vistos.add(a.id);
    lineas.push({ cat: a.id, q: Math.round(it.cantidad * 1000) / 1000, u: it.unidad, name: a.name });
    if (lineas.length >= 20) break;
  }
  return { raciones: Math.min(50, Math.max(1, Math.round(raciones || 1))), pvp: pvp != null && pvp > 0 && pvp < 100000 ? pvp : null, lineas, modelo: env.ocrModel };
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");

/** Sin clave (mock/dev): usamos la plantilla cuyo nombre más se parece, para poder probar el flujo. */
function sugeridaMock(name: string, cat: Map<string, CatalogoItem>): RecetaSugerida {
  const q = new Set(norm(name).split(/\s+/).filter((w) => w.length > 2));
  let mejor = PLANTILLAS[0], score = -1;
  for (const p of PLANTILLAS) {
    const palabras = norm(p.name).split(/\s+/);
    const s = palabras.filter((w) => q.has(w)).length;
    if (s > score) { score = s; mejor = p; }
  }
  return clean(mejor.raciones, mejor.pvp, mejor.lineas.map((l) => ({ catalog_id: l.cat, cantidad: l.q, unidad: l.u })), cat);
}

export async function sugerirReceta(name: string, familia: string, descripcion: string, catalogo: CatalogoItem[]): Promise<RecetaSugerida> {
  if (env.ocrProvider === "off") throw new Error("La sugerencia con IA no está disponible: falta configurar la clave de Claude.");
  const cat = new Map(catalogo.map((c) => [c.id, c]));
  if (env.ocrProvider === "mock") { await pause(); return sugeridaMock(name, cat); }
  const lista = catalogo.map((c) => `${c.id} — ${c.name} (${c.unit})`).join("\n");
  const detalle = descripcion.trim() ? `\nDescripción: ${descripcion.trim()}` : "";
  const msg = await api().messages.parse({
    model: env.ocrModel,
    max_tokens: 2000,
    system: SYSTEM_RECETA,
    output_config: { format: zodOutputFormat(IaReceta), effort: "low" },
    messages: [{ role: "user", content: [{ type: "text", text: `Plato: «${name}»${familia ? ` (grupo de carta: ${familia})` : ""}.${detalle}\n\nCatálogo disponible (usa estos ids):\n${lista}` }] }],
  });
  if (msg.stop_reason === "refusal" || !msg.parsed_output) throw new Error("No se ha podido sugerir la receta. Añade los ingredientes a mano.");
  const out = msg.parsed_output;
  return clean(out.raciones, out.pvp_sugerido, out.ingredientes, cat);
}
