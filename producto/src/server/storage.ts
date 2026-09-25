// Archivos privados (albaranes, fotos). Vercel Blob en producción; disco local en desarrollo.
import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isUuid } from "./db";
import { env } from "./env";

const LOCAL_DIR = path.join(process.cwd(), ".storage");
const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes("..")) throw new Error("Ruta de archivo no válida");
  return key;
};
const blobOn = () => {
  // En Vercel el disco es de solo lectura y efímero: sin Blob los archivos se perderían
  if (!env.blobToken && process.env.VERCEL === "1") throw new Error("Falta BLOB_READ_WRITE_TOKEN: conecta un Blob store al proyecto.");
  return !!env.blobToken;
};

export async function putFile(key: string, data: Buffer, contentType: string): Promise<void> {
  safeKey(key);
  if (blobOn()) {
    await put(key, data, { access: "private", contentType, allowOverwrite: true, token: env.blobToken });
    return;
  }
  const f = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, data);
  await writeFile(f + ".type", contentType);
}

export async function readFileBytes(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  safeKey(key);
  if (blobOn()) {
    const r = await get(key, { access: "private", token: env.blobToken });
    if (!r || r.statusCode !== 200) return null;
    const data = Buffer.from(await new Response(r.stream).arrayBuffer());
    return { data, contentType: r.blob.contentType };
  }
  const f = path.join(LOCAL_DIR, key);
  try {
    const [data, t] = await Promise.all([readFile(f), readFile(f + ".type", "utf8").catch(() => "application/octet-stream")]);
    return { data, contentType: t };
  } catch {
    return null;
  }
}

export async function openFile(key: string): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string; size: number | null } | null> {
  safeKey(key);
  if (blobOn()) {
    const r = await get(key, { access: "private", token: env.blobToken });
    if (!r || r.statusCode !== 200) return null;
    return { body: r.stream, contentType: r.blob.contentType, size: r.blob.size };
  }
  const f = path.join(LOCAL_DIR, key);
  try {
    const s = await stat(f);
    const got = await readFileBytes(key);
    return got ? { body: got.data, contentType: got.contentType, size: s.size } : null;
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  safeKey(key);
  try {
    if (blobOn()) await del(key, { token: env.blobToken });
    else { const f = path.join(LOCAL_DIR, key); await rm(f, { force: true }); await rm(f + ".type", { force: true }); }
  } catch (e) {
    console.error("[archivos] no se pudo borrar", key, (e as Error).message);
  }
}

/** Borra todos los archivos de un negocio (carpeta t/<negocio>/), también los que ya no están enlazados en la base. */
export async function deleteTenantFiles(tenantId: string): Promise<void> {
  if (!isUuid(tenantId)) throw new Error("Negocio no válido");
  const prefix = `t/${tenantId}/`;
  try {
    if (blobOn()) {
      for (let i = 0; i < 1000; i++) {
        const r = await list({ prefix, limit: 100, token: env.blobToken });
        if (!r.blobs.length) break;
        await del(r.blobs.map((b) => b.url), { token: env.blobToken });
      }
    } else await rm(path.join(LOCAL_DIR, prefix), { recursive: true, force: true });
  } catch (e) {
    console.error("[archivos] no se pudo borrar la carpeta", prefix, (e as Error).message);
  }
}

export const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
export const extFor = (mime: string) => ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" } as Record<string, string>)[mime] ?? "bin";
/** Comprueba la firma real del archivo (no solo la extensión). */
export function sniffMime(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (b.toString("ascii", 4, 8) === "ftyp" && /heic|heix|mif1|msf1|heif/.test(b.toString("ascii", 8, 12))) return "image/heic";
  return null;
}
