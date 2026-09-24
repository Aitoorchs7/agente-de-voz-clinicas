// Cliente mínimo de la API de Vapi: solo lo que usa el compilador.

import { variableObligatoria } from "../entorno.js";

export class ErrorDeVapi extends Error {
  override name = "ErrorDeVapi";
}

export interface MensajeModelo {
  role: string;
  content?: string;
  [otra: string]: unknown;
}

export interface Asistente {
  id: string;
  name?: string;
  firstMessage?: string;
  endCallMessage?: string;
  voicemailMessage?: string;
  model?: { provider?: string; model?: string; temperature?: number; toolIds?: string[]; messages?: MensajeModelo[]; [otra: string]: unknown };
  [otra: string]: unknown;
}

export interface Herramienta {
  id: string;
  type: string;
  function?: { name?: string; description?: string; [otra: string]: unknown };
  metadata?: Record<string, unknown>;
  [otra: string]: unknown;
}

export interface ClienteVapi {
  leerAsistente(id: string): Promise<Asistente>;
  actualizarAsistente(id: string, cambios: Partial<Asistente>): Promise<Asistente>;
  leerHerramienta(id: string): Promise<Herramienta>;
  actualizarHerramienta(id: string, cambios: Partial<Herramienta>): Promise<Herramienta>;
  listarAsistentes(): Promise<Asistente[]>;
}

export function clienteVapi(clave = variableObligatoria("VAPI_PRIVATE_KEY"), f: typeof fetch = fetch): ClienteVapi {
  const pedir = async <T>(metodo: string, camino: string, cuerpo?: unknown): Promise<T> => {
    // Con tiempo límite: sin él, una API colgada deja el bucle parado para siempre sin decir nada.
    const r = await f(`https://api.vapi.ai${camino}`, {
      signal: AbortSignal.timeout(30_000),
      method: metodo,
      headers: { Authorization: `Bearer ${clave}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!r.ok) throw new ErrorDeVapi(`Vapi respondió ${r.status} a ${metodo} ${camino}: ${(await r.text()).slice(0, 300)}`);
    return (await r.json()) as T;
  };
  return {
    leerAsistente: (id) => pedir("GET", `/assistant/${id}`),
    actualizarAsistente: (id, cambios) => pedir("PATCH", `/assistant/${id}`, cambios),
    leerHerramienta: (id) => pedir("GET", `/tool/${id}`),
    actualizarHerramienta: (id, cambios) => pedir("PATCH", `/tool/${id}`, cambios),
    listarAsistentes: () => pedir("GET", `/assistant?limit=100`),
  };
}
