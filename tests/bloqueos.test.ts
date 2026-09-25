// El bloqueo temporal, en memoria. La misma batería corre contra Redis de verdad en
// tests/integracion/bloqueos.redis.test.ts (npm run test:integracion).

import { bloqueosEnMemoria } from "../src/bloqueo/bloqueos.js";
import { pruebasDeBloqueos } from "./comun/bloqueos.js";

pruebasDeBloqueos("en memoria", () => bloqueosEnMemoria());
