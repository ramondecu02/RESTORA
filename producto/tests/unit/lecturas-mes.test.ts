// Tope mensual de lecturas con IA por negocio (MAX_LECTURAS_MES): cómo se interpreta la variable, el mensaje y, contra una base temporal,
// qué cuenta como una lectura y cuándo empieza el mes.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { LECTURAS_MES_DEFECTO, maxLecturasMes, mensajeTopeLecturas } from "@/lib/limits";
import { CONTACTO_EMAIL } from "@/lib/contacto";
import { env } from "@/server/env";
import { baseTemporal } from "./helpers/db-temporal";

const VARS = ["MAX_LECTURAS_MES", "DATABASE_URL"] as const;
const antes = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
afterEach(() => { for (const k of VARS) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; } });

describe("MAX_LECTURAS_MES", () => {
  it("sin la variable, o con algo que no es un número entero, vale 1.500", () => {
    expect(LECTURAS_MES_DEFECTO).toBe(1500);
    for (const v of [undefined, null, "", "  ", "abc", "-5", "12,5", "12.5", "1 500", "1500€", "NaN", "Infinity", "99999999999999999999"]) expect(maxLecturasMes(v), String(v)).toBe(1500);
  });
  it("un entero la fija; 0 apaga la lectura con IA", () => {
    expect(maxLecturasMes("300")).toBe(300);
    expect(maxLecturasMes(" 300 ")).toBe(300);
    expect(maxLecturasMes("0")).toBe(0);
    expect(maxLecturasMes("100000")).toBe(100000);
  });
  it("env la lee del entorno en el momento de usarla", () => {
    delete process.env.MAX_LECTURAS_MES;
    expect(env.maxLecturasMes).toBe(1500);
    process.env.MAX_LECTURAS_MES = "40";
    expect(env.maxLecturasMes).toBe(40);
    process.env.MAX_LECTURAS_MES = "ninguno";
    expect(env.maxLecturasMes).toBe(1500);
  });
  it("el mensaje dice el máximo (con puntos), que apuntar a mano sigue valiendo y a quién escribir", () => {
    const m = mensajeTopeLecturas(1500);
    expect(m).toContain("máximo de lecturas");
    expect(m).toContain("(1.500)");
    expect(m).toMatch(/apuntando a mano tus albaranes/);
    expect(m).toContain(CONTACTO_EMAIL);
    expect(m).toMatch(/vuelve a cero el día 1/);
    expect(mensajeTopeLecturas(40)).toContain("(40)");
  });
  it("con 0 el mensaje dice que la lectura está desactivada, no que se ha llegado a ningún máximo", () => {
    const m = mensajeTopeLecturas(0);
    expect(m).toMatch(/desactivada/);
    expect(m).not.toMatch(/máximo/);
    expect(m).toContain(CONTACTO_EMAIL);
  });
  it("no habla de planes ni de precios", () => {
    expect(mensajeTopeLecturas(1500)).not.toMatch(/plan|€|precio|suscrip/i);
  });
});

const bd = await baseTemporal("lecturas");
describe.skipIf(!bd.disponible)("contador de lecturas del mes contra una base temporal", () => {
  let db: pg.Client;
  let A: { org: string; local: string }, B: { org: string; local: string };
  let modulo: typeof import("@/server/ratelimit");
  const doc = (n: { org: string; local: string }, c: { kind?: string; status?: string; source?: string; model?: string | null; demo?: boolean; creado?: string }) =>
    db.query(`insert into documentos (tenant_id, local_id, kind, status, source, ocr_model, demo, created_at) values ($1, $2, $3, $4, $5, $6, $7, ${c.creado ?? "now()"})`,
      [n.org, n.local, c.kind ?? "albaran", c.status ?? "guardado", c.source ?? "ocr", c.model === undefined ? "claude-sonnet-5-5" : c.model, c.demo ?? false]);
  const auditoria = (n: { org: string }, accion: string, entidad: string, creado = "now()") =>
    db.query(`insert into audit_log (tenant_id, action, entity, created_at) values ($1, $2, $3, ${creado})`, [n.org, accion, entidad]);
  const negocio = async (nombre: string) => {
    const org = (await db.query("insert into organizations (name) values ($1) returning id", [nombre])).rows[0].id;
    const local = (await db.query("insert into locales (tenant_id, name) values ($1, $2) returning id", [org, nombre])).rows[0].id;
    return { org, local };
  };
  const INICIO = "(date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')";

  beforeAll(async () => {
    await bd.crear();
    db = await bd.cliente();
    process.env.DATABASE_URL = bd.url;
    delete (globalThis as { __restoraPool?: unknown }).__restoraPool;
    modulo = await import("@/server/ratelimit");
    A = await negocio("Negocio A"); B = await negocio("Negocio B");
    // Cuentan: 3 lecturas con IA de este mes (albarán, factura y carta), 1 en curso (aún sin modelo), 1 que acabó en error y 1 justo a las 00:00 del día 1 en Madrid
    await doc(A, { kind: "albaran" }); await doc(A, { kind: "factura", model: "claude-sonnet-5-5 (repaso)" }); await doc(A, { kind: "carta", model: "claude-opus-5-5" });
    await doc(A, { status: "leyendo", model: null }); await doc(A, { status: "error", model: null });
    await doc(A, { creado: INICIO });
    // No cuentan: el albarán de ejemplo, la lectura simulada, lo apuntado a mano, los datos de ejemplo, el último segundo del mes anterior
    await doc(A, { model: "ejemplo" }); await doc(A, { model: "mock" }); await doc(A, { source: "manual", model: null }); await doc(A, { demo: true });
    await doc(A, { creado: `${INICIO} - interval '1 second'` }); await doc(A, { creado: `now() - interval '45 days'` });
    // Los reintentos de lectura cuestan igual y no crean documento: 2 de este mes cuentan; otro de un mes anterior, otras acciones y otras entidades no
    await auditoria(A, "reintentar", "documento"); await auditoria(A, "reintentar", "documento", `${INICIO} + interval '1 second'`);
    await auditoria(A, "reintentar", "documento", `${INICIO} - interval '1 second'`); await auditoria(A, "borrar", "documento"); await auditoria(A, "reintentar", "receta");
    // Otro negocio con muchas lecturas: no suma al de A
    for (let i = 0; i < 20; i++) await doc(B, {});
  }, 60_000);
  afterAll(async () => {
    const g = globalThis as { __restoraPool?: { end(): Promise<void> } };
    await g.__restoraPool?.end().catch(() => {});
    await bd.eliminar();
  });

  it("cuenta las lecturas con IA de este mes natural más los reintentos, y solo las del negocio", async () => {
    expect(await modulo.lecturasDelMes(A.org)).toBe(6 + 2);
    expect(await modulo.lecturasDelMes(B.org)).toBe(20);
  });
  it("un negocio sin lecturas lleva cero", async () => {
    const C = await negocio("Negocio C");
    expect(await modulo.lecturasDelMes(C.org)).toBe(0);
  });
  it("el tope se alcanza justo al llegar al máximo, no antes", async () => {
    process.env.MAX_LECTURAS_MES = "9";
    expect(await modulo.topeDeLecturas(A.org)).toMatchObject({ usadas: 8, max: 9, restantes: 1, agotado: false });
    process.env.MAX_LECTURAS_MES = "8";
    expect(await modulo.topeDeLecturas(A.org)).toMatchObject({ usadas: 8, max: 8, restantes: 0, agotado: true });
    process.env.MAX_LECTURAS_MES = "3";
    expect(await modulo.topeDeLecturas(A.org)).toMatchObject({ usadas: 8, max: 3, restantes: 0, agotado: true });
  });
  it("con el valor por defecto un negocio normal no lo alcanza, y con 0 siempre está agotado", async () => {
    delete process.env.MAX_LECTURAS_MES;
    expect(await modulo.topeDeLecturas(A.org)).toMatchObject({ max: 1500, agotado: false, restantes: 1492 });
    process.env.MAX_LECTURAS_MES = "0";
    const t = await modulo.topeDeLecturas(A.org);
    expect(t).toMatchObject({ max: 0, agotado: true });
    expect(t.mensaje).toBe(mensajeTopeLecturas(0));
  });
  it("el cupo del plan manda sobre el valor por defecto: Premium 80, Pro 250, prueba 100; el freno de emergencia, si es más bajo", async () => {
    delete process.env.MAX_LECTURAS_MES;
    expect(await modulo.topeDeLecturas(A.org, { planStatus: "trial" })).toMatchObject({ usadas: 8, max: 100, porPlan: true, agotado: false, casi: false });
    expect(await modulo.topeDeLecturas(A.org, { planStatus: "active", planTier: "premium" })).toMatchObject({ max: 80, porPlan: true });
    expect(await modulo.topeDeLecturas(A.org, { planStatus: "active", planTier: "pro" })).toMatchObject({ max: 250 });
    // Con 8 lecturas y un cupo de 10 se está al 80 %: se avisa, pero aún se puede leer
    process.env.MAX_LECTURAS_MES = "1500";
    const justo = await modulo.topeDeLecturas(A.org, { planStatus: "active", planTier: "premium" });
    expect(justo.casi).toBe(false); // 8 de 80
    process.env.MAX_LECTURAS_MES = "10";
    expect(await modulo.topeDeLecturas(A.org, { planStatus: "active", planTier: "max" })).toMatchObject({ max: 10, porPlan: false, casi: true, agotado: false });
    process.env.MAX_LECTURAS_MES = "8";
    const t = await modulo.topeDeLecturas(A.org, { planStatus: "active", planTier: "max" });
    expect(t).toMatchObject({ max: 8, agotado: true, casi: false });
    expect(t.mensaje).toBe(mensajeTopeLecturas(8));
  });
  it("el mensaje que recibe el negocio es el del tope", async () => {
    process.env.MAX_LECTURAS_MES = "8";
    expect((await modulo.topeDeLecturas(A.org)).mensaje).toBe(mensajeTopeLecturas(8));
  });
  it("una lectura más de este mes lo cambia y una de otro mes no", async () => {
    await doc(A, { creado: `${INICIO} - interval '1 day'` });
    expect(await modulo.lecturasDelMes(A.org)).toBe(8);
    await doc(A, {});
    expect(await modulo.lecturasDelMes(A.org)).toBe(9);
  });
});
