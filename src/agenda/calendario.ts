// Google Calendar, directo por su API (sin la herramienta nativa de Vapi). Un calendario por gabinete
// (PLAN.md §4): la ficha de la clínica dice cuál es cuál.
//
// - `ocupado`: lo que hay en un calendario en un rango (freeBusy). Eso es lo que ve `huecosDelDia`.
// - `crear`: el evento lleva un ID que sale de la llamada, el calendario y la hora. Si Vapi reintenta
//   `crear_cita` o la función se repite, el segundo intento encuentra el mismo evento y no hace otro.
// - Cada evento lleva la llamada en una propiedad privada: al colgar se buscan los eventos de la llamada
//   para limpiar uno que se quedara huérfano (creado en Calendar, pero sin fila en `Citas`).
//
// Las horas van siempre como instantes y con la zona de la clínica: Google las guarda y las enseña bien.

import { createHash } from "node:crypto";
import { tokenDeAcceso } from "../google/cuenta-servicio.js";
import type { Ocupado } from "./huecos.js";

export class ErrorDeAgenda extends Error {
  override name = "ErrorDeAgenda";
}

export interface EventoNuevo {
  id: string;
  inicio: number;
  fin: number;
  zona: string;
  resumen: string;
  descripcion: string;
  llamada: string;
}

export interface Agenda {
  ocupado(calendario: string, desde: number, hasta: number): Promise<Ocupado[]>;
  /** «creado» o, si ya existía ese mismo evento de esa misma llamada, «ya estaba». */
  crear(calendario: string, evento: EventoNuevo): Promise<"creado" | "ya estaba">;
  borrar(calendario: string, id: string): Promise<void>;
  /** Los IDs de los eventos vivos que creó esa llamada. */
  deLaLlamada(calendario: string, llamada: string): Promise<string[]>;
}

export const ALCANCES_AGENDA = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.freebusy"];

/** Un ID válido para Google (letras a-v y cifras): el SHA-1 en hexadecimal lo es. */
export function idDeEvento(llamada: string, calendario: string, inicio: number): string {
  return createHash("sha1").update(`${llamada}|${calendario}|${inicio}`).digest("hex");
}

interface EventoGoogle {
  id: string;
  status?: string;
  extendedProperties?: { private?: Record<string, string> };
}

export function agendaDeGoogle(opciones: { token?: () => Promise<string>; fetch?: typeof fetch } = {}): Agenda {
  const f = opciones.fetch ?? fetch;
  const token = opciones.token ?? (() => tokenDeAcceso(ALCANCES_AGENDA));
  const base = "https://www.googleapis.com/calendar/v3";
  const eventos = (calendario: string) => `${base}/calendars/${encodeURIComponent(calendario)}/events`;

  async function pedir(metodo: string, url: string, cuerpo?: unknown): Promise<Response> {
    return f(url, {
      method: metodo,
      headers: { Authorization: `Bearer ${await token()}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
  }
  async function fallo(r: Response, que: string): Promise<never> {
    const texto = await r.text();
    const detalle = texto.match(/"message":\s*"([^"]+)"/)?.[1] ?? texto.slice(0, 200);
    throw new ErrorDeAgenda(`Google Calendar respondió ${r.status} al ${que}: ${detalle}`);
  }
  const cuerpoEvento = (e: EventoNuevo) => ({
    start: { dateTime: new Date(e.inicio).toISOString(), timeZone: e.zona },
    end: { dateTime: new Date(e.fin).toISOString(), timeZone: e.zona },
    summary: e.resumen,
    description: e.descripcion,
    extendedProperties: { private: { id_llamada: e.llamada, origen: "asistente de voz" } },
  });

  return {
    async ocupado(calendario, desde, hasta) {
      const r = await pedir("POST", `${base}/freeBusy`, {
        timeMin: new Date(desde).toISOString(),
        timeMax: new Date(hasta).toISOString(),
        items: [{ id: calendario }],
      });
      if (!r.ok) await fallo(r, "mirar la agenda");
      const j = (await r.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }> };
      const c = j.calendars?.[calendario];
      if (!c || c.errors?.length) throw new ErrorDeAgenda(`Google Calendar no deja mirar el calendario (${c?.errors?.map((e) => e.reason).join(", ") ?? "no aparece"}).`);
      return (c.busy ?? []).map((b) => ({ inicio: Date.parse(b.start), fin: Date.parse(b.end) }));
    },

    async crear(calendario, e) {
      const r = await pedir("POST", eventos(calendario), { id: e.id, ...cuerpoEvento(e) });
      if (r.ok) return "creado";
      if (r.status !== 409) await fallo(r, "crear la cita");
      // Ya existe un evento con ese ID: solo vale si es de esta misma llamada.
      const g = await pedir("GET", `${eventos(calendario)}/${e.id}`);
      if (!g.ok) await fallo(g, "comprobar la cita");
      const existente = (await g.json()) as EventoGoogle;
      if (existente.extendedProperties?.private?.id_llamada !== e.llamada) {
        throw new ErrorDeAgenda("Ya hay un evento con ese identificador y no es de esta llamada; no se toca.");
      }
      if (existente.status !== "cancelled") return "ya estaba";
      // Se borró (una compensación anterior) y se vuelve a pedir: se revive el mismo.
      const p = await pedir("PUT", `${eventos(calendario)}/${e.id}`, { ...cuerpoEvento(e), status: "confirmed" });
      if (!p.ok) await fallo(p, "recuperar la cita");
      return "creado";
    },

    async borrar(calendario, id) {
      const r = await pedir("DELETE", `${eventos(calendario)}/${id}`);
      if (!r.ok && r.status !== 404 && r.status !== 410) await fallo(r, "borrar la cita");
    },

    async deLaLlamada(calendario, llamada) {
      const params = new URLSearchParams({ privateExtendedProperty: `id_llamada=${llamada}`, singleEvents: "true", maxResults: "50" });
      const r = await pedir("GET", `${eventos(calendario)}?${params}`);
      if (!r.ok) await fallo(r, "buscar las citas de la llamada");
      const j = (await r.json()) as { items?: EventoGoogle[] };
      return (j.items ?? []).filter((x) => x.status !== "cancelled").map((x) => x.id);
    },
  };
}

/** La misma agenda en memoria, para probar las herramientas sin Google. */
export function agendaEnMemoria(): Agenda & {
  eventos: Map<string, EventoNuevo & { calendario: string; vivo: boolean }>;
  ocupar(calendario: string, inicio: number, fin: number): void;
  fallarAlCrear: boolean;
} {
  const eventos = new Map<string, EventoNuevo & { calendario: string; vivo: boolean }>();
  const ajenos: { calendario: string; inicio: number; fin: number }[] = [];
  const clave = (calendario: string, id: string) => `${calendario}\n${id}`;
  const agenda = {
    eventos,
    fallarAlCrear: false,
    ocupar(calendario: string, inicio: number, fin: number) {
      ajenos.push({ calendario, inicio, fin });
    },
    async ocupado(calendario: string, desde: number, hasta: number) {
      const propios = [...eventos.values()].filter((e) => e.vivo && e.calendario === calendario);
      return [...propios, ...ajenos.filter((a) => a.calendario === calendario)]
        .filter((e) => e.inicio < hasta && desde < e.fin)
        .map((e) => ({ inicio: e.inicio, fin: e.fin }));
    },
    async crear(calendario: string, e: EventoNuevo) {
      if (agenda.fallarAlCrear) throw new ErrorDeAgenda("Google Calendar respondió 503 al crear la cita (simulado)");
      const k = clave(calendario, e.id);
      const existente = eventos.get(k);
      if (existente) {
        if (existente.llamada !== e.llamada) throw new ErrorDeAgenda("Ya hay un evento con ese identificador y no es de esta llamada; no se toca.");
        if (existente.vivo) return "ya estaba" as const;
      }
      eventos.set(k, { ...e, calendario, vivo: true });
      return "creado" as const;
    },
    async borrar(calendario: string, id: string) {
      const e = eventos.get(clave(calendario, id));
      if (e) e.vivo = false;
    },
    async deLaLlamada(calendario: string, llamada: string) {
      return [...eventos.values()].filter((e) => e.vivo && e.calendario === calendario && e.llamada === llamada).map((e) => e.id);
    },
  };
  return agenda;
}
