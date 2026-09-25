// El bloqueo temporal (PLAN.md §6): que dos llamadas a la vez no se lleven la misma hora.
//
// Se copia el patrón de la plantilla del curso —registro temporal al consultar, borrado al confirmar—,
// pero no su almacén: la plantilla usa Airtable, sin caducidad y con una carrera entre buscar y crear.
// Aquí cada bloqueo es un intervalo [inicio, fin) en un calendario (un gabinete) y un día, apuntado con
// el ID de la llamada, y comprobar solapes y apuntar ocurre EN UNA SOLA OPERACIÓN ATÓMICA.
//
// - Dos gabinetes distintos a la misma hora no chocan: cada calendario tiene lo suyo.
// - Los bloqueos de una llamada no chocan entre sí ni con ella misma.
// - Caducan solos: CADUCIDAD_MS después de la última herramienta de esa llamada (cada herramienta los
//   renueva). Y se sueltan en el acto al crear la cita, al elegir otra hora y al colgar.
//
// Dos implementaciones con el mismo comportamiento y las mismas pruebas: en Redis (la de verdad, con
// scripts Lua) y en memoria (para probar las herramientas sin red).

import { createHash } from "node:crypto";
import type { Fecha } from "../agenda/tiempo.js";
import type { Redis } from "./redis.js";

/** 4 minutos desde la última herramienta de la llamada. Decidido el 25-sep-2026; se mide con llamadas. */
export const CADUCIDAD_MS = 4 * 60_000;

export interface Intervalo {
  /** El calendario del gabinete. */
  calendario: string;
  /** El día, en hora de la clínica: con él se agrupan los bloqueos. */
  fecha: Fecha;
  /** Instantes en milisegundos (UTC). */
  inicio: number;
  fin: number;
}

export interface Bloqueos {
  /**
   * Intenta bloquear para la llamada, EN ESTE ORDEN, los candidatos, hasta conseguir `cuantos`. Salta
   * los que choquen con bloqueos vivos de otras llamadas (o con otro de este mismo lote). Devuelve los
   * índices de los conseguidos. Todo de una vez: nadie se puede meter en medio.
   */
  reservar(llamada: string, candidatos: readonly Intervalo[], cuantos: number, ahora?: number): Promise<number[]>;
  /** Suelta los bloqueos de la llamada, salvo los que se digan. Devuelve cuántos ha soltado. */
  soltar(llamada: string, salvo?: readonly Intervalo[]): Promise<number>;
  /** La caducidad vuelve a contar desde ahora para todos los bloqueos vivos de la llamada. */
  renovar(llamada: string, ahora?: number): Promise<number>;
  /** ¿Sigue vivo este bloqueo de esta llamada? */
  esMio(llamada: string, intervalo: Intervalo, ahora?: number): Promise<boolean>;
}

const clave = (i: Intervalo) => `av:bloq:${createHash("sha1").update(i.calendario).digest("hex").slice(0, 16)}:${i.fecha}`;
const indice = (llamada: string) => `av:llam:${llamada}:bloq`;
const miembro = (llamada: string, i: Intervalo) => `${llamada}|${i.inicio}|${i.fin}`;
const entrada = (llamada: string, i: Intervalo) => `${clave(i)}\t${miembro(llamada, i)}`;

function comprobar(candidatos: readonly Intervalo[]): void {
  for (const c of candidatos) {
    if (!Number.isInteger(c.inicio) || !Number.isInteger(c.fin) || c.inicio >= c.fin) {
      throw new RangeError(`Intervalo imposible: ${c.inicio} → ${c.fin}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Redis

const LUA_RESERVAR = `
local llamada = ARGV[1]
local ahora = tonumber(ARGV[2])
local caduca = ahora + tonumber(ARGV[3])
local cuantos = tonumber(ARGV[4])
local conseguidos = {}
local mios = {}
for i = 2, #KEYS do
  if #conseguidos >= cuantos then break end
  local clave = KEYS[i]
  local si, sf = ARGV[5 + (i - 2) * 2], ARGV[6 + (i - 2) * 2]
  local ini, fin = tonumber(si), tonumber(sf)
  redis.call('ZREMRANGEBYSCORE', clave, '-inf', ahora)
  local libre = true
  for _, m in ipairs(redis.call('ZRANGE', clave, 0, -1)) do
    local otra, oi, of = string.match(m, '^(.*)|(%d+)|(%d+)$')
    if otra ~= llamada and tonumber(oi) < fin and ini < tonumber(of) then libre = false break end
  end
  if libre and mios[clave] then
    for _, par in ipairs(mios[clave]) do
      if par[1] < fin and ini < par[2] then libre = false break end
    end
  end
  if libre then
    local m = llamada .. '|' .. si .. '|' .. sf
    redis.call('ZADD', clave, caduca, m)
    redis.call('PEXPIRE', clave, 86400000)
    redis.call('SADD', KEYS[1], clave .. '\\t' .. m)
    mios[clave] = mios[clave] or {}
    table.insert(mios[clave], {ini, fin})
    table.insert(conseguidos, i - 2)
  end
end
redis.call('PEXPIRE', KEYS[1], 7200000)
return conseguidos
`;

const LUA_SOLTAR = `
local n = 0
for i = 1, #ARGV do
  local clave, m = string.match(ARGV[i], '^(.-)\\t(.*)$')
  if clave then
    n = n + redis.call('ZREM', clave, m)
    redis.call('SREM', KEYS[1], ARGV[i])
  end
end
return n
`;

const LUA_RENOVAR = `
local ahora = tonumber(ARGV[1])
local caduca = ahora + tonumber(ARGV[2])
local n = 0
for i = 3, #ARGV do
  local clave, m = string.match(ARGV[i], '^(.-)\\t(.*)$')
  if clave then
    local s = redis.call('ZSCORE', clave, m)
    if s and tonumber(s) > ahora then
      redis.call('ZADD', clave, 'XX', caduca, m)
      n = n + 1
    else
      redis.call('SREM', KEYS[1], ARGV[i])
    end
  end
end
redis.call('PEXPIRE', KEYS[1], 7200000)
return n
`;

const clavesDe = (entradas: readonly string[]) => [...new Set(entradas.map((e) => e.split("\t")[0]!))];

export function bloqueosEnRedis(redis: Redis, caducidad = CADUCIDAD_MS): Bloqueos {
  return {
    async reservar(llamada, candidatos, cuantos, ahora = Date.now()) {
      comprobar(candidatos);
      if (!candidatos.length || cuantos < 1) return [];
      const args = [llamada, ahora, caducidad, cuantos, ...candidatos.flatMap((c) => [c.inicio, c.fin])];
      const r = await redis.script<number[]>(LUA_RESERVAR, [indice(llamada), ...candidatos.map(clave)], args);
      return (r ?? []).map(Number);
    },
    async soltar(llamada, salvo = []) {
      const guardar = new Set(salvo.map((i) => entrada(llamada, i)));
      const todas = (await redis.orden<string[]>("SMEMBERS", indice(llamada))) ?? [];
      const fuera = todas.filter((e) => !guardar.has(e));
      if (!fuera.length) return 0;
      return Number(await redis.script(LUA_SOLTAR, [indice(llamada), ...clavesDe(fuera)], fuera));
    },
    async renovar(llamada, ahora = Date.now()) {
      const todas = (await redis.orden<string[]>("SMEMBERS", indice(llamada))) ?? [];
      if (!todas.length) return 0;
      return Number(await redis.script(LUA_RENOVAR, [indice(llamada), ...clavesDe(todas)], [ahora, caducidad, ...todas]));
    },
    async esMio(llamada, intervalo, ahora = Date.now()) {
      const s = await redis.orden<string | null>("ZSCORE", clave(intervalo), miembro(llamada, intervalo));
      return s !== null && s !== undefined && Number(s) > ahora;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// En memoria: el mismo comportamiento, para probar sin red.

export function bloqueosEnMemoria(caducidad = CADUCIDAD_MS): Bloqueos & { claves(): number } {
  const dias = new Map<string, Map<string, number>>(); // clave → miembro → caduca
  const indices = new Map<string, Set<string>>(); // llamada → entradas
  const dia = (k: string) => dias.get(k) ?? dias.set(k, new Map()).get(k)!;
  const trozos = (m: string) => {
    const [llamada, ini, fin] = m.split("|");
    return { llamada: llamada!, ini: Number(ini), fin: Number(fin) };
  };
  return {
    async reservar(llamada, candidatos, cuantos, ahora = Date.now()) {
      comprobar(candidatos);
      const conseguidos: number[] = [];
      const mios = new Map<string, { ini: number; fin: number }[]>();
      for (const [i, c] of candidatos.entries()) {
        if (conseguidos.length >= cuantos) break;
        const k = clave(c);
        const d = dia(k);
        for (const [m, caduca] of d) if (caduca <= ahora) d.delete(m);
        const choca = [...d.keys()].some((m) => {
          const t = trozos(m);
          return t.llamada !== llamada && t.ini < c.fin && c.inicio < t.fin;
        });
        const chocaConElLote = (mios.get(k) ?? []).some((p) => p.ini < c.fin && c.inicio < p.fin);
        if (choca || chocaConElLote) continue;
        d.set(miembro(llamada, c), ahora + caducidad);
        (indices.get(llamada) ?? indices.set(llamada, new Set()).get(llamada)!).add(entrada(llamada, c));
        mios.set(k, [...(mios.get(k) ?? []), { ini: c.inicio, fin: c.fin }]);
        conseguidos.push(i);
      }
      return conseguidos;
    },
    async soltar(llamada, salvo = []) {
      const guardar = new Set(salvo.map((i) => entrada(llamada, i)));
      let n = 0;
      for (const e of [...(indices.get(llamada) ?? [])]) {
        if (guardar.has(e)) continue;
        const [k, m] = e.split("\t") as [string, string];
        if (dias.get(k)?.delete(m)) n++;
        indices.get(llamada)!.delete(e);
      }
      return n;
    },
    async renovar(llamada, ahora = Date.now()) {
      let n = 0;
      for (const e of [...(indices.get(llamada) ?? [])]) {
        const [k, m] = e.split("\t") as [string, string];
        const caduca = dias.get(k)?.get(m);
        if (caduca !== undefined && caduca > ahora) {
          dias.get(k)!.set(m, ahora + caducidad);
          n++;
        } else indices.get(llamada)!.delete(e);
      }
      return n;
    },
    async esMio(llamada, intervalo, ahora = Date.now()) {
      const caduca = dias.get(clave(intervalo))?.get(miembro(llamada, intervalo));
      return caduca !== undefined && caduca > ahora;
    },
    claves: () => dias.size,
  };
}
