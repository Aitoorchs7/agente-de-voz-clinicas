// Pruebas contra servicios de verdad (Upstash, Google). Necesitan el .env. Más lentas, y no van en `npm test`.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integracion/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
