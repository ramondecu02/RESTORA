import { describe, expect, it } from "vitest";
import { parse } from "pg-connection-string";
import { pgUrl } from "@/server/db";

// Las URLs de Neon llevan sslmode=require: pg lo trata como verify-full y avisa en cada arranque
describe("cadena de conexión de Postgres", () => {
  const neon = "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  it("escribe verify-full en lugar de require, prefer o verify-ca", () => {
    expect(pgUrl(neon)).toBe("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require");
    expect(pgUrl("postgres://h/db?channel_binding=require&sslmode=prefer")).toBe("postgres://h/db?channel_binding=require&sslmode=verify-full");
    expect(pgUrl("postgres://h/db?sslmode=verify-ca")).toBe("postgres://h/db?sslmode=verify-full");
  });

  it("no cambia la seguridad de la conexión: la configuración SSL resultante es la misma", () => {
    expect(parse(pgUrl(neon)).ssl).toEqual(parse(neon).ssl);
  });

  it("deja igual las URLs sin sslmode, con disable, con verify-full o con uselibpqcompat", () => {
    for (const u of ["postgres://localhost:5432/restora", "postgres://h/db?sslmode=disable", "postgres://h/db?sslmode=verify-full", "postgres://h/db?uselibpqcompat=true&sslmode=require"]) {
      expect(pgUrl(u)).toBe(u);
    }
  });
});
