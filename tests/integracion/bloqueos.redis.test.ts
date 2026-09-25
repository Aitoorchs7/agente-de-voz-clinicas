// El bloqueo temporal contra Upstash de VERDAD (npm run test:integracion). Es la misma batería que la
// versión en memoria: si pasan las dos, se comportan igual. Usa nombres de calendario y de llamada
// aleatorios, así que no toca nada real; lo que deja caduca solo en un día.

import { bloqueosEnRedis } from "../../src/bloqueo/bloqueos.js";
import { redisUpstash } from "../../src/bloqueo/redis.js";
import { pruebasDeBloqueos } from "../comun/bloqueos.js";

pruebasDeBloqueos("Redis de verdad", () => bloqueosEnRedis(redisUpstash()));
