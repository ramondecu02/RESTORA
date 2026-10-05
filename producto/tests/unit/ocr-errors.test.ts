import { describe, expect, it } from "vitest";
import { detalleDeError, mensajeDeError, OcrError, OcrRefusal } from "@/server/ocr/errors";

// Errores tal y como los lanza el SDK de Anthropic: status + name + message + el cuerpo de la respuesta en .error
const api = (status: number, message: string, type = "invalid_request_error", name = "APIError") =>
  Object.assign(new Error(message), { status, name, error: { type: "error", error: { type, message } }, requestID: "req_123" });

const NO_JSON = (m: string) => { expect(m).not.toMatch(/[{}]|"type"|error_|HTTP|request/i); expect(m).not.toMatch(/\b(the|credit|balance|invalid|request)\b/i); };

describe("mensajes de error de la lectura para el usuario", () => {
  const casos: [string, unknown, RegExp][] = [
    ["sin saldo (400 credit balance)", api(400, "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing"), /no está disponible/],
    ["clave no válida (401)", api(401, "invalid x-api-key", "authentication_error"), /no está disponible/],
    ["sin permiso (403)", api(403, "forbidden", "permission_error"), /no está disponible/],
    ["límite de uso (429)", api(429, "rate limited", "rate_limit_error"), /saturado/],
    ["sobrecargado (529)", api(529, "Overloaded", "overloaded_error"), /saturado/],
    ["error del servidor (500)", api(500, "internal", "api_error"), /saturado/],
    ["documento enorme (413)", api(413, "request_too_large", "request_too_large"), /pesa demasiado/],
    ["imagen no válida (400)", api(400, "messages.0.content.0.image.source.base64: Image does not match the provided media type"), /No se ha podido abrir alguna de las páginas/],
    ["esquema rechazado (400)", api(400, "Schemas contains too many parameters with union types"), /No hemos podido leer el documento/],
    ["tiempo agotado", Object.assign(new Error("Request was aborted."), { name: "APIUserAbortError" }), /tardado demasiado/],
    ["tiempo agotado del SDK", Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" }), /tardado demasiado/],
    ["sin red", Object.assign(new Error("Connection error."), { name: "APIConnectionError" }), /No hemos podido conectar/],
    ["error cualquiera", new Error("boom"), /No hemos podido leer el documento/],
  ];
  for (const [nombre, error, esperado] of casos) {
    it(nombre, () => {
      const m = mensajeDeError(error);
      expect(m).toMatch(esperado);
      NO_JSON(m);
    });
  }
  it("los errores propios llevan su mensaje tal cual", () => {
    expect(mensajeDeError(new OcrError("Falta alguna página del documento."))).toBe("Falta alguna página del documento.");
    expect(mensajeDeError(new OcrRefusal())).toMatch(/no ha podido leer este documento/);
  });
  it("sugerir una receta habla de añadir los ingredientes a mano", () => {
    expect(mensajeDeError(api(429, "x"), "receta")).toMatch(/ingredientes a mano/);
    expect(mensajeDeError(api(401, "x"), "receta")).toMatch(/ingredientes a mano/);
    expect(mensajeDeError(new Error("boom"), "receta")).toMatch(/ingredientes a mano/);
  });
});

describe("detalle para los registros", () => {
  it("incluye el estado, el tipo, el mensaje y el id de la petición", () => {
    const d = detalleDeError(api(400, "Your credit balance is too low", "invalid_request_error"));
    expect(d).toContain("HTTP 400");
    expect(d).toContain("invalid_request_error");
    expect(d).toContain("credit balance");
    expect(d).toContain("request_id=req_123");
  });
});
