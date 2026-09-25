// Un candado para escribir en una pestaña de la hoja. Sin él, dos citas a la vez leen la misma «última
// fila», calculan la misma fila libre y una pisa a la otra (PLAN.md §9: rango cerrado al escribir; y la
// fila libre se calcula leyendo la pestaña, nunca con `append`).
//
// Caduca solo (por si una función de Vercel muere con el candado cogido) y solo lo suelta quien lo cogió.

import { randomUUID } from "node:crypto";
import type { Redis } from "./redis.js";

export class ErrorDeCandado extends Error {
  override name = "ErrorDeCandado";
}

export interface Candados {
  /** Ejecuta el trabajo con el candado cogido. Si no lo consigue en `esperaMs`, falla sin hacer nada. */
  con<T>(nombre: string, trabajo: () => Promise<T>, opciones?: { esperaMs?: number; vidaMs?: number }): Promise<T>;
}

const POR_DEFECTO = { esperaMs: 8_000, vidaMs: 15_000 };
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function candadosEnRedis(redis: Redis): Candados {
  return {
    async con(nombre, trabajo, opciones = {}) {
      const { esperaMs, vidaMs } = { ...POR_DEFECTO, ...opciones };
      const clave = `av:candado:${nombre}`;
      const mio = randomUUID();
      const limite = Date.now() + esperaMs;
      while ((await redis.orden<string | null>("SET", clave, mio, "NX", "PX", vidaMs)) !== "OK") {
        if (Date.now() > limite) throw new ErrorDeCandado(`«${nombre}» lleva ocupada más de ${esperaMs / 1000} s; no se ha escrito nada.`);
        await pausa(120 + Math.random() * 120);
      }
      try {
        return await trabajo();
      } finally {
        await redis
          .script("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end", [clave], [mio])
          .catch(() => undefined); // si falla, caduca solo
      }
    },
  };
}

export function candadosEnMemoria(): Candados {
  const cogidos = new Map<string, number>();
  return {
    async con(nombre, trabajo, opciones = {}) {
      const { esperaMs, vidaMs } = { ...POR_DEFECTO, ...opciones };
      const limite = Date.now() + esperaMs;
      while ((cogidos.get(nombre) ?? 0) > Date.now()) {
        if (Date.now() > limite) throw new ErrorDeCandado(`«${nombre}» lleva ocupada más de ${esperaMs / 1000} s; no se ha escrito nada.`);
        await pausa(5);
      }
      cogidos.set(nombre, Date.now() + vidaMs);
      try {
        return await trabajo();
      } finally {
        cogidos.delete(nombre);
      }
    },
  };
}
