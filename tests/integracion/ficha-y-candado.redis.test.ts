// Ficha de la llamada y candado de la hoja contra Upstash de VERDAD (npm run test:integracion).

import { candadosEnRedis } from "../../src/bloqueo/candado.js";
import { redisUpstash } from "../../src/bloqueo/redis.js";
import { fichasEnRedis } from "../../src/llamada/ficha.js";
import { pruebasDeCandado, pruebasDeFicha } from "../comun/ficha-y-candado.js";

pruebasDeFicha("Redis de verdad", () => fichasEnRedis(redisUpstash()));
pruebasDeCandado("Redis de verdad", () => candadosEnRedis(redisUpstash()));
