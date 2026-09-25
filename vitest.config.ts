// `npm test` no toca la red. Las pruebas contra servicios de verdad (Redis, Google) están en
// tests/integracion/ y se corren aparte: npm run test:integracion.
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/integracion/**"],
  },
});
