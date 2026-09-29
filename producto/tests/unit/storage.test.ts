import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putFile, readFileBytes } from "@/server/storage";

// El SDK de Blob de mentira: se comprueba qué credencial le pasa la app según cómo esté conectado el store
const llamadas: { fn: string; opts: Record<string, unknown> }[] = [];
vi.mock("@vercel/blob", () => ({
  put: async (_k: string, _d: unknown, opts: Record<string, unknown>) => { llamadas.push({ fn: "put", opts }); return {}; },
  get: async (_k: string, opts: Record<string, unknown>) => { llamadas.push({ fn: "get", opts }); return null; },
  del: async () => {},
  list: async () => ({ blobs: [] }),
}));

const VARS = ["VERCEL", "BLOB_STORE_ID", "BLOB_READ_WRITE_TOKEN"] as const;
const antes = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeEach(() => { llamadas.length = 0; for (const k of VARS) delete process.env[k]; process.env.VERCEL = "1"; });
afterEach(() => { for (const k of VARS) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } });

describe("archivos en Vercel Blob", () => {
  it("con la conexión actual (BLOB_STORE_ID + OIDC) no pasa token y deja que el SDK se autentique", async () => {
    process.env.BLOB_STORE_ID = "store_prueba";
    await putFile("t/negocio/doc.jpg", Buffer.from("x"), "image/jpeg");
    expect(await readFileBytes("t/negocio/doc.jpg")).toBeNull();
    expect(llamadas.map((l) => l.fn)).toEqual(["put", "get"]);
    for (const l of llamadas) { expect(l.opts.access).toBe("private"); expect(l.opts).not.toHaveProperty("token"); }
  });

  it("con la conexión antigua usa BLOB_READ_WRITE_TOKEN", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_prueba";
    await putFile("t/negocio/doc.jpg", Buffer.from("x"), "image/jpeg");
    expect(llamadas[0].opts).toMatchObject({ access: "private", token: "vercel_blob_rw_prueba" });
  });

  it("en Vercel sin Blob conectado falla con un mensaje claro", async () => {
    await expect(putFile("t/negocio/doc.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow(/Falta el Blob/);
    expect(llamadas).toEqual([]);
  });
});
