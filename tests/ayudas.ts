// Ayudas de las pruebas: una ficha de mentira construida igual que la construye el lector de verdad
// (matriz de celdas → interpretarTabla), y un Vapi en memoria que se porta como el real.

import { PESTANAS, normalizar, type Pestana } from "../src/hoja/esquema.js";
import { interpretarTabla, leerConfig, leerFaq, leerHorarios, leerTratamientos, type FichaLeida } from "../src/hoja/lector.js";
import type { Semilla } from "../src/hoja/preparar.js";
import type { Asistente, ClienteVapi, Herramienta } from "../src/vapi/cliente.js";
import { DENTALVIS } from "../scripts/semillas.js";

export function matriz(p: Pestana, filas: Record<string, string>[]): string[][] {
  return [[...p.columnas], ...filas.map((f) => p.columnas.map((c) => f[Object.keys(f).find((k) => normalizar(k) === normalizar(c)) ?? ""] ?? ""))];
}

export function fichaDesdeMatrices(m: { config: string[][]; tratamientos: string[][]; faq: string[][]; horarios: string[][] }, id = "HOJA-DE-PRUEBA"): FichaLeida {
  const avisos: string[] = [];
  return {
    spreadsheetId: id,
    titulo: "Hoja de prueba",
    config: leerConfig(interpretarTabla(PESTANAS.config, m.config)),
    tratamientos: leerTratamientos(interpretarTabla(PESTANAS.tratamientos, m.tratamientos)),
    faq: leerFaq(interpretarTabla(PESTANAS.faq, m.faq)),
    horarios: leerHorarios(interpretarTabla(PESTANAS.horarios, m.horarios), avisos),
    avisos,
  };
}

export function matricesDe(s: Semilla = DENTALVIS) {
  return {
    config: matriz(PESTANAS.config, s.config),
    tratamientos: matriz(PESTANAS.tratamientos, s.tratamientos),
    faq: matriz(PESTANAS.faq, s.faq),
    horarios: matriz(PESTANAS.horarios, s.horarios),
  };
}

export const fichaDentalvis = (id?: string) => fichaDesdeMatrices(matricesDe(DENTALVIS), id);

/**
 * Vapi en memoria. Como el de verdad, un PATCH REEMPLAZA cada campo de primer nivel entero (no
 * fusiona los anidados). `estropear` permite simular que Vapi pierde algo al guardar.
 */
export function vapiFalso(inicial: { asistente: Asistente; herramientas: Herramienta[]; otros?: Asistente[] }) {
  const estado = { asistente: structuredClone(inicial.asistente), herramientas: structuredClone(inicial.herramientas) };
  const llamadas: string[] = [];
  let estropear: ((a: Asistente) => void) | null = null;
  const cliente: ClienteVapi = {
    async leerAsistente() {
      llamadas.push("GET asistente");
      return structuredClone(estado.asistente);
    },
    async actualizarAsistente(_id, cambios) {
      llamadas.push("PATCH asistente");
      Object.assign(estado.asistente, structuredClone(cambios), { updatedAt: new Date().toISOString() });
      if (estropear) {
        estropear(estado.asistente);
        estropear = null;
      }
      return structuredClone(estado.asistente);
    },
    async leerHerramienta(id) {
      llamadas.push(`GET herramienta ${id}`);
      const h = estado.herramientas.find((x) => x.id === id);
      if (!h) throw new Error("no existe");
      return structuredClone(h);
    },
    async actualizarHerramienta(id, cambios) {
      llamadas.push(`PATCH herramienta ${id}`);
      const h = estado.herramientas.find((x) => x.id === id)!;
      Object.assign(h, structuredClone(cambios));
      return structuredClone(h);
    },
    async listarAsistentes() {
      return [structuredClone(estado.asistente), ...(inicial.otros ?? [])];
    },
  };
  return { cliente, estado, llamadas, estropearElSiguientePatch: (f: (a: Asistente) => void) => (estropear = f) };
}

export function asistenteDeDiego(): { asistente: Asistente; herramientas: Herramienta[] } {
  return {
    asistente: {
      id: "asistente-1",
      name: "Diego - Clínica Dentalvis",
      firstMessage: "Clínica Dentalvis, le atiende Diego…",
      endCallMessage: "Gracias por llamar.",
      voicemailMessage: "Ha llamado.",
      model: {
        provider: "google",
        model: "gemini-3.5-flash",
        temperature: 0.3,
        toolIds: ["cal-check", "cal-crear", "hoja"],
        messages: [{ role: "system", content: "prompt viejo de una pieza" }],
      },
      voice: { provider: "azure", voiceId: "es-ES-DarioNeural", fallbackPlan: { voices: [{ provider: "azure", voiceId: "es-ES-AlvaroNeural" }] } },
      transcriber: { provider: "deepgram", model: "nova-2", language: "es" },
      analysisPlan: { structuredDataSchema: { type: "object" }, summaryPlan: { enabled: true } },
    },
    herramientas: [
      { id: "cal-check", type: "google.calendar.availability.check", function: { name: "google_calendar_check" }, metadata: { calendarId: "c" } },
      { id: "cal-crear", type: "google.calendar.event.create", function: { name: "google_calendar_agendamiento" }, metadata: { calendarId: "c" } },
      {
        id: "hoja",
        type: "google.sheets.row.append",
        function: { name: "google_sheets_tool", description: "descripción vieja con HOJA-VIEJA" },
        metadata: { spreadsheetId: "HOJA-VIEJA", range: "Llamadas!A:Z" },
      },
    ],
  };
}
