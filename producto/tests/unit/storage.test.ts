import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claveValida, putFile, readFileBytes } from "@/server/storage";

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

// La ruta /api/archivos da 404 (nunca un 500) a toda clave que no se pueda servir: la de otro negocio, con «..» o con caracteres raros
describe("claves de archivo válidas", () => {
  it("las que genera la app lo son", () => {
    expect(claveValida("t/4f1d2c3a-0000-4000-8000-000000000001/docs/9a8b7c6d-0000-4000-8000-000000000002/0-abc_DEF-12.jpg")).toBe(true);
    expect(claveValida("t/4f1d2c3a-0000-4000-8000-000000000001/fotos/9a8b7c6d-0000-4000-8000-000000000002-Zx9.webp")).toBe(true);
  });
  it("las que llevan «..», espacios, acentos, comillas u otros caracteres no lo son", () => {
    for (const k of ["t/x/../y/a.jpg", "t/x/docs/a b.jpg", "t/x/docs/ñ.jpg", "t/x/docs/\"'.jpg", "t/x/docs/a\\b.jpg", "t/x/docs/a%2fb.jpg", "t/x/docs/a\u0000b.jpg", "", "t/x/docs/a?b.jpg", "t/x/docs/a#b.jpg"]) expect(claveValida(k), k).toBe(false);
  });
});
