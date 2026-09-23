import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE_HASHES } from "@/server/ocr/mock-data";

// Los documentos de ejemplo se reconocen por su huella: si cambian las imágenes, hay que actualizarlas.
describe("documentos de ejemplo", () => {
  for (const [file, kind] of [["albaran-ejemplo.jpg", "albaran"], ["albaran-gil.jpg", "albaran-gil"], ["carta-ejemplo.jpg", "carta"]] as const) {
    it(`${file} coincide con su huella`, () => {
      const h = createHash("sha256").update(readFileSync(new URL(`../../public/demo/${file}`, import.meta.url))).digest("hex");
      expect(SAMPLE_HASHES[h]).toBe(kind);
    });
  }
});
