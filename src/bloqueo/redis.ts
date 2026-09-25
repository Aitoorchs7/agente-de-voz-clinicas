// Cliente mínimo de Redis (Upstash) por su API REST, con `fetch` y sin librerías, como el resto del
// proyecto. Aquí viven el bloqueo temporal de las horas, la ficha de cada llamada y el candado de
// escritura de la hoja: tres cosas que en Vercel no pueden estar en memoria, porque cada petición puede
// caer en una instancia distinta.

import { variableObligatoria } from "../entorno.js";

export class ErrorDeRedis extends Error {
  override name = "ErrorDeRedis";
}

export type Argumento = string | number;

export interface Redis {
  orden<T = unknown>(...args: Argumento[]): Promise<T>;
  /** Un script Lua: todo lo que hace ocurre de una vez, sin que otra petición se meta en medio. */
  script<T = unknown>(lua: string, claves: string[], argumentos: Argumento[]): Promise<T>;
}

export function redisUpstash(
  url = variableObligatoria("UPSTASH_REDIS_REST_URL"),
  token = variableObligatoria("UPSTASH_REDIS_REST_TOKEN"),
  f: typeof fetch = fetch,
): Redis {
  const orden = async <T>(...args: Argumento[]): Promise<T> => {
    // Tiempo límite corto: esto va dentro de una herramienta, con el paciente esperando al teléfono.
    const r = await f(url, {
      method: "POST",
      signal: AbortSignal.timeout(5_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args.map(String)),
    });
    const cuerpo = (await r.json().catch(() => ({}))) as { result?: T; error?: string };
    if (!r.ok || cuerpo.error !== undefined) throw new ErrorDeRedis(`Redis respondió ${r.status} a ${String(args[0])}: ${cuerpo.error ?? "sin detalle"}`);
    return cuerpo.result as T;
  };
  return {
    orden,
    script: (lua, claves, argumentos) => orden("EVAL", lua, claves.length, ...claves, ...argumentos),
  };
}
