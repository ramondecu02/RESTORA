// Evaluaciones que llaman a servicios de pago (no entran en `npm test`): npx vitest run --config vitest.eval.config.mts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["tests/eval/**/*.eval.ts"], environment: "node", testTimeout: 3_600_000 },
});
