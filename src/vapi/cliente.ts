// Cliente mínimo de la API de Vapi. `ClienteVapi` es lo que usa el compilador; `ClienteVapiCompleto`
// añade las altas (herramientas, asistentes, credenciales) y la lectura de llamadas de la Fase 3.
//
// ⚠ PATCH /assistant y PATCH /tool REEMPLAZAN los objetos anidados enteros: `model`, `metadata`,
// `function`, `server`... se mandan siempre completos y se comprueban con un GET después.

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

/** Credencial con la que Vapi se autentica ante nuestro servidor (`server.credentialId`). */
export interface Credencial {
  id: string;
  provider: string;
  name?: string;
  [otra: string]: unknown;
}

export interface ClienteVapiCompleto extends ClienteVapi {
  listarHerramientas(): Promise<Herramienta[]>;
  crearHerramienta(cuerpo: Record<string, unknown>): Promise<Herramienta>;
  crearAsistente(cuerpo: Record<string, unknown>): Promise<Asistente>;
  listarCredenciales(): Promise<Credencial[]>;
  crearCredencial(cuerpo: Record<string, unknown>): Promise<Credencial>;
  leerLlamada(id: string): Promise<Record<string, unknown>>;
}

export function clienteVapi(clave = variableObligatoria("VAPI_PRIVATE_KEY"), f: typeof fetch = fetch): ClienteVapiCompleto {
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
    listarHerramientas: () => pedir("GET", `/tool?limit=100`),
    crearHerramienta: (cuerpo) => pedir("POST", `/tool`, cuerpo),
    crearAsistente: (cuerpo) => pedir("POST", `/assistant`, cuerpo),
    listarCredenciales: () => pedir("GET", `/credential`),
    crearCredencial: (cuerpo) => pedir("POST", `/credential`, cuerpo),
    leerLlamada: (id) => pedir("GET", `/call/${id}`),
  };
}
