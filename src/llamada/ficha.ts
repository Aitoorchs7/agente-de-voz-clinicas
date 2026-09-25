// La ficha de una llamada: lo que `anotar` va apuntando, un dato cada vez, ya validado. `crear_cita`
// reserva con ESTO, no con lo que el modelo vuelva a teclear al final: así lo que se agenda es
// exactamente lo que se validó y el paciente confirmó (como en la V1, donde vivía en la sesión).
//
// En Vercel no hay sesión, así que vive en Redis, por ID de llamada, y se borra al colgar. Caduca sola
// a las dos horas (una llamada dura diez minutos como mucho). Con datos de pacientes reales, Upstash
// tendría que ir en el contrato de encargado del tratamiento; en la demo todo es ficticio.

import type { Redis } from "../bloqueo/redis.js";

export const CAMPOS_FICHA = [
  "tratamiento", "fecha", "hora", "nombre", "apellidos", "telefono", "quien_llama", "sin_telefono_avisado",
] as const;
export type CampoFicha = (typeof CAMPOS_FICHA)[number];
export type DatosAnotados = Partial<Record<CampoFicha, string>>;

export interface Fichas {
  leer(llamada: string): Promise<DatosAnotados>;
  anotar(llamada: string, datos: DatosAnotados): Promise<void>;
  olvidar(llamada: string, campos: readonly CampoFicha[]): Promise<void>;
  borrar(llamada: string): Promise<void>;
}

const VIDA_MS = 2 * 60 * 60_000;
const clave = (llamada: string) => `av:llam:${llamada}:ficha`;

export function fichasEnRedis(redis: Redis): Fichas {
  return {
    async leer(llamada) {
      const plano = (await redis.orden<string[] | null>("HGETALL", clave(llamada))) ?? [];
      const datos: DatosAnotados = {};
      for (let i = 0; i + 1 < plano.length; i += 2) {
        const campo = plano[i] as CampoFicha;
        if ((CAMPOS_FICHA as readonly string[]).includes(campo)) datos[campo] = plano[i + 1]!;
      }
      return datos;
    },
    async anotar(llamada, datos) {
      const pares = Object.entries(datos).filter(([, v]) => v !== undefined).flat() as string[];
      if (!pares.length) return;
      await redis.script(
        "redis.call('HSET', KEYS[1], unpack(ARGV, 2)) redis.call('PEXPIRE', KEYS[1], ARGV[1]) return 1",
        [clave(llamada)],
        [VIDA_MS, ...pares],
      );
    },
    async olvidar(llamada, campos) {
      if (campos.length) await redis.orden("HDEL", clave(llamada), ...campos);
    },
    async borrar(llamada) {
      await redis.orden("DEL", clave(llamada));
    },
  };
}

export function fichasEnMemoria(): Fichas & { todas: Map<string, DatosAnotados> } {
  const todas = new Map<string, DatosAnotados>();
  return {
    todas,
    async leer(llamada) {
      return { ...(todas.get(llamada) ?? {}) };
    },
    async anotar(llamada, datos) {
      todas.set(llamada, { ...(todas.get(llamada) ?? {}), ...Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined)) });
    },
    async olvidar(llamada, campos) {
      const f = todas.get(llamada);
      if (f) for (const c of campos) delete f[c];
    },
    async borrar(llamada) {
      todas.delete(llamada);
    },
  };
}
