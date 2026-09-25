// Horas de la clínica, sin librerías y sin `Temporal` (Node 24 no lo trae): `Intl` sabe de zonas
// horarias y de cambios de hora. Todo lo que el asistente dice o guarda va en la hora de la clínica
// (Config → zona_horaria), nunca en la del servidor —Vercel corre en UTC— ni en UTC (PLAN.md §5: «un bot
// que cree que son las 23:00 cuando son las 01:00 da citas para ayer»).

import { DIAS, type Dia } from "../hoja/esquema.js";

/** «2026-09-24». */
export type Fecha = string;
/** «10:30», en 24 horas. */
export type Hora = string;

const formateadores = new Map<string, Intl.DateTimeFormat>();
function formateador(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zona, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    formateadores.set(zona, f);
  }
  return f;
}

function partes(instante: Date, zona: string) {
  const p = Object.fromEntries(formateador(zona).formatToParts(instante).map((x) => [x.type, x.value]));
  const hora = p.hour === "24" ? "00" : p.hour!;
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), hh: Number(hora), mm: Number(p.minute), ss: Number(p.second) };
}

/** Qué fecha y qué hora es ese instante en la zona de la clínica, y los minutos desde medianoche. */
export function enZona(instante: Date, zona: string): { fecha: Fecha; hora: Hora; minutos: number } {
  const p = partes(instante, zona);
  return {
    fecha: `${p.y}-${dos(p.m)}-${dos(p.d)}`,
    hora: `${dos(p.hh)}:${dos(p.mm)}`,
    minutos: p.hh * 60 + p.mm,
  };
}

/** Minutos que la zona va por delante de UTC en ese instante. Madrid: +120 en verano, +60 en invierno. */
export function desfase(instante: Date, zona: string): number {
  const p = partes(instante, zona);
  const comoSiFueraUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return Math.round((comoSiFueraUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60_000);
}

/**
 * El instante en que en la zona es esa fecha y esa hora. Se tiene en cuenta el desfase DE ESE DÍA, no el
 * de hoy: una cita pedida en septiembre para noviembre lleva el horario de invierno.
 * Las dos horas raras del año: en el hueco de primavera (esa hora no existe) se corre hacia delante; en la
 * hora repetida de otoño se queda con una de las dos. Una clínica no abre a las dos y media de la madrugada.
 */
export function instante(fecha: Fecha, hora: Hora, zona: string): Date {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const [hh, mm] = hora.split(":").map(Number) as [number, number];
  const local = Date.UTC(y, m - 1, d, hh, mm);
  const primero = local - desfase(new Date(local), zona) * 60_000;
  return new Date(local - desfase(new Date(primero), zona) * 60_000);
}

/** ¿Existe de verdad esa hora ese día en esa zona? (No existe en el hueco del cambio de hora de primavera.) */
export function existe(fecha: Fecha, hora: Hora, zona: string): boolean {
  const e = enZona(instante(fecha, hora, zona), zona);
  return e.fecha === fecha && e.hora === hora;
}

export function hoy(zona: string, ahora = new Date()): Fecha {
  return enZona(ahora, zona).fecha;
}

export function sumarDias(fecha: Fecha, dias: number): Fecha {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}`;
}

/** Días entre dos fechas (b − a). */
export function diasEntre(a: Fecha, b: Fecha): number {
  const t = (f: Fecha) => {
    const [y, m, d] = f.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** El día de la semana de una fecha de calendario (no depende de la zona: una fecha ya es local). */
export function diaDeLaSemana(fecha: Fecha): Dia {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const domingoCero = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return DIAS[(domingoCero + 6) % 7]!;
}

/** «2026-09-24», y que exista (nada de 31 de junio). */
export function esFecha(texto: string): boolean {
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mes - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mes - 1 && t.getUTCDate() === d;
}

/** «10:30» o «9:05» → «10:30» / «09:05». null si no es una hora. */
export function normalizarHora(texto: string): Hora | null {
  const m = texto.trim().match(/^(\d{1,2})[:.h](\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return `${dos(hh)}:${dos(mm)}`;
}

export const aMinutos = (hora: Hora): number => {
  const [hh, mm] = hora.split(":").map(Number) as [number, number];
  return hh * 60 + mm;
};

export const deMinutos = (minutos: number): Hora => `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;

const dos = (n: number) => String(n).padStart(2, "0");
