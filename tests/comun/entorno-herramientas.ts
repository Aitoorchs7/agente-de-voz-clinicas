// Un entorno completo para probar las herramientas sin red: la clínica de Dentalvis (sus tratamientos y
// su horario de verdad, calendarios falsos), la hoja en memoria, la agenda en memoria, y los bloqueos, la
// ficha y los candados en memoria (los mismos que pasan la batería contra Upstash).

import { agendaEnMemoria } from "../../src/agenda/calendario.js";
import { bloqueosEnMemoria } from "../../src/bloqueo/bloqueos.js";
import { candadosEnMemoria } from "../../src/bloqueo/candado.js";
import type { Clinica } from "../../src/herramientas/clinica.js";
import { MANEJADORES, type Dependencias } from "../../src/herramientas/manejadores.js";
import { PESTANAS, type Dia } from "../../src/hoja/esquema.js";
import { escritorDeHoja } from "../../src/hoja/escritor.js";
import type { Tramo, Tratamiento } from "../../src/hoja/lector.js";
import { fichasEnMemoria } from "../../src/llamada/ficha.js";
import type { LlamadaVapi } from "../../src/vapi/contrato.js";
import type { DependenciasWebhook } from "../../src/vapi/webhook.js";
import { sheetsFalso } from "./sheets-falso.js";

export const ZONA = "Europe/Madrid";
/** Sábado 26 de septiembre de 2026, 14:00 en Madrid. */
export const AHORA = new Date("2026-09-26T12:00:00Z");
export const MARTES = "2026-09-29";
export const DOMINGO = "2026-09-27";

const tr = (codigo: string, nombre: string, duracionMin: number, gabinete: string, fila: number): Tratamiento => ({
  fila, codigo, nombre, duracionMin, duracionTexto: String(duracionMin), gabinete, frase: "", publico: "sí",
});
export const TRATAMIENTOS = [
  tr("REV", "Revisión o primera visita", 30, "Gabinete 1", 2),
  tr("URG", "Urgencia por dolor", 30, "Gabinete 1", 3),
  tr("LIM", "Limpieza bucal", 45, "Gabinete 1", 4),
  tr("EMP", "Empaste", 45, "Gabinete 1", 5),
  tr("EXT", "Extracción", 45, "Gabinete 3", 6),
  tr("ORT", "Primera consulta de ortodoncia", 45, "Gabinete 2", 7),
  tr("IMP", "Primera consulta de implantes", 45, "Gabinete 3", 8),
  tr("EST", "Primera consulta de estética dental", 45, "Gabinete 1", 9),
  tr("PED", "Odontopediatría (niños)", 30, "Gabinete 1", 10),
  tr("RAR", "Tratamiento sin gabinete con calendario", 30, "Gabinete 9", 11),
];

const tramo = (dia: Dia, de: string, a: string): Tramo => {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
  return { fila: 2, dia, de, a, deMin: m(de), aMin: m(a) };
};
export const TRAMOS: Tramo[] = [
  ...(["lunes", "martes", "miércoles", "jueves", "viernes"] as const).flatMap((d) => [tramo(d, "09:00", "14:00"), tramo(d, "16:00", "20:00")]),
  tramo("sábado", "09:00", "14:00"),
];

export const CALENDARIOS = { "Gabinete 1": "cal-g1", "Gabinete 2": "cal-g2", "Gabinete 3": "cal-g3" };
export const ASISTENTE = "asistente-de-pruebas";

export function clinicaDePrueba(): Clinica {
  return {
    ficha: { clinica: "Dentalvis (pruebas)", spreadsheetId: "hoja-falsa", assistantId: ASISTENTE, calendarios: { ...CALENDARIOS } },
    zona: ZONA,
    tratamientos: TRATAMIENTOS,
    tramos: TRAMOS,
  };
}

export const llamadaWeb = (id = "llamada-web-1"): LlamadaVapi => ({ id, tipo: "webCall", asistenteId: ASISTENTE });
export const llamadaTelefono = (id = "llamada-tel-1", numero = "+34612345678"): LlamadaVapi => ({
  id, tipo: "inboundPhoneCall", asistenteId: ASISTENTE, numeroCliente: numero,
});

export function entorno(opciones: { caducidadMs?: number } = {}) {
  const hoja = sheetsFalso({
    Citas: { valores: [[...PESTANAS.citas.columnas]] },
    Llamadas: { valores: [[...PESTANAS.llamadas.columnas]] },
    Escalados: { valores: [[...PESTANAS.escalados.columnas]] },
  });
  const agenda = agendaEnMemoria();
  const fichas = fichasEnMemoria();
  const bloqueos = bloqueosEnMemoria(opciones.caducidadMs);
  const candados = candadosEnMemoria();
  const registro: string[] = [];
  const clinica = clinicaDePrueba();
  const dep: Dependencias = {
    fichas, bloqueos, candados, agenda,
    escritor: () => escritorDeHoja("hoja-falsa", { candados, token: async () => "t", fetch: hoja.fetch }),
    ahora: () => AHORA,
    registrar: (l) => registro.push(l),
  };
  const webhook: DependenciasWebhook = {
    ...dep,
    clinica: async (id) => (id === ASISTENTE || id === "0854f732-b5f0-4224-9fd6-2edc60829c81" ? clinica : null),
    resumir: async () => "Pidió una limpieza y quedó citado.",
    secreto: "secreto-de-prueba",
  };
  const llamar = (nombre: string, args: Record<string, unknown>, llamada: LlamadaVapi = llamadaWeb()) =>
    MANEJADORES[nombre]!({ llamada, clinica, dep }, args);
  /** Las filas de una pestaña, con su cabecera como claves. */
  const filas = (pestana: "Citas" | "Llamadas" | "Escalados") => {
    const [cabecera, ...resto] = hoja.matriz(pestana);
    return resto.map((f) => Object.fromEntries(cabecera!.map((c, i) => [String(c), f[i] ?? ""])));
  };
  return { hoja, agenda, fichas, bloqueos, candados, registro, clinica, dep, webhook, llamar, filas };
}
