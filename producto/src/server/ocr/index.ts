// Lectura de documentos con la API de Claude (salida estructurada) o con datos de ejemplo.
// Por defecto lee con Sonnet; si la lectura sale dudosa (muchas líneas poco seguras o totales
// que no cuadran) repasa con Opus y se queda con esa lectura. Registra tokens, coste y tiempo.
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { OcrAlbaran, OcrCarta } from "@/lib/ocr-types";
import { needsEscalation } from "@/lib/draft";
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
