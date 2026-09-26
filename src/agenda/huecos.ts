// Los huecos de un día (PLAN.md §6: «no es un free/busy pelado»). Puro: sin red y sin reloj propio. Lo
// que está ocupado en el calendario y la hora de ahora se le pasan; así se prueba el día entero, los
// cambios de hora y la antelación sin tocar Google.
//
// Un hueco es un inicio dentro de un tramo de `Horarios` tal que el tratamiento ENTERO cabe antes de que
// acabe el tramo y no pisa nada del calendario de su gabinete. Los bloqueos temporales de otras llamadas
// no se miran aquí: eso lo decide `Bloqueos.reservar`, de forma atómica, con la lista que sale de aquí.

import type { Tramo } from "../hoja/lector.js";
import { aMinutos, deMinutos, diaDeLaSemana, existe, instante, type Fecha, type Hora } from "./tiempo.js";

export interface Hueco {
  fecha: Fecha;
  hora: Hora;
  /** Instantes en milisegundos (UTC). */
  inicio: number;
  fin: number;
}

export interface Ocupado {
  inicio: number;
  fin: number;
}

export interface DiaDeAgenda {
  fecha: Fecha;
  duracionMin: number;
  /** Todos los tramos de la clínica; aquí se escogen los de ese día de la semana. */
  tramos: readonly Tramo[];
  zona: string;
  ocupado: readonly Ocupado[];
  ahora: Date;
  /** Minutos mínimos entre ahora y el inicio de una cita. */
  antelacionMin?: number;
  /** Cada cuántos minutos puede empezar una cita. */
  pasoMin?: number;
}

export const ANTELACION_MIN = 30;
export const PASO_MIN = 15;
/** Hasta dónde se dan citas. */
export const HORIZONTE_DIAS = 120;
/** La mañana acaba a las dos. */
export const FIN_DE_LA_MANANA = 14 * 60;

export type Franja = "mañana" | "tarde" | "cualquiera";

const pisa = (a: Ocupado, b: Ocupado) => a.inicio < b.fin && b.inicio < a.fin;

export function tramosDelDia(fecha: Fecha, tramos: readonly Tramo[]): Tramo[] {
  const dia = diaDeLaSemana(fecha);
  return tramos.filter((t) => t.dia === dia).sort((a, b) => a.deMin - b.deMin);
}

function hueco(d: DiaDeAgenda, minutos: number): Hueco | null {
  const hora = deMinutos(minutos);
  if (!existe(d.fecha, hora, d.zona)) return null;
  const inicio = instante(d.fecha, hora, d.zona).getTime();
  return { fecha: d.fecha, hora, inicio, fin: inicio + d.duracionMin * 60_000 };
}

/** Todos los huecos libres del día, en orden. */
export function huecosDelDia(d: DiaDeAgenda): Hueco[] {
  const paso = d.pasoMin ?? PASO_MIN;
  const desde = d.ahora.getTime() + (d.antelacionMin ?? ANTELACION_MIN) * 60_000;
  const libres: Hueco[] = [];
  for (const t of tramosDelDia(d.fecha, d.tramos)) {
    for (let m = t.deMin; m + d.duracionMin <= t.aMin; m += paso) {
      const h = hueco(d, m);
      if (h && h.inicio >= desde && !d.ocupado.some((o) => pisa(o, h))) libres.push(h);
    }
  }
  return libres;
}

export type Exacta =
  | { libre: true; hueco: Hueco }
  | { libre: false; porque: "cerrado" | "no cabe" | "pasada" | "ocupado" };

/**
 * Una hora concreta que pide el paciente, aunque no esté en la rejilla de cada cuarto de hora: si cabe
 * entera en un tramo y está libre, vale. Si no, el motivo, para que el bot lo explique bien.
 */
export function horaExacta(d: DiaDeAgenda, hora: Hora): Exacta {
  const m = aMinutos(hora);
  const tramos = tramosDelDia(d.fecha, d.tramos);
  const dentro = tramos.find((t) => m >= t.deMin && m < t.aMin);
  if (!dentro) return { libre: false, porque: "cerrado" };
  if (m + d.duracionMin > dentro.aMin) return { libre: false, porque: "no cabe" };
  const h = hueco(d, m);
  if (!h) return { libre: false, porque: "cerrado" };
  if (h.inicio < d.ahora.getTime() + (d.antelacionMin ?? ANTELACION_MIN) * 60_000) return { libre: false, porque: "pasada" };
  if (d.ocupado.some((o) => pisa(o, h))) return { libre: false, porque: "ocupado" };
  return { libre: true, hueco: h };
}

export const enFranja = (h: Hueco, franja: Franja) =>
  franja === "cualquiera" || (franja === "mañana" ? aMinutos(h.hora) < FIN_DE_LA_MANANA : aMinutos(h.hora) >= FIN_DE_LA_MANANA);

/**
 * El orden en que se intentan reservar los huecos para ofrecer dos. `Bloqueos.reservar` se queda con los
 * primeros que no choquen, así que el orden ES la elección:
 * - Si el paciente pidió una hora que no está libre: los más cercanos a esa hora.
 * - Si no: primero las horas en punto y las medias (se dicen mejor), y alternando mañana y tarde si hay
 *   de las dos (si no, la primera mitad con la segunda), para que las dos opciones no sean las 9:00 y las 9:15.
 */
export function ordenParaOfrecer(huecos: readonly Hueco[], opciones: { cerca?: Hora } = {}): Hueco[] {
  if (opciones.cerca) {
    // La más cercana, y después la más cercana del OTRO lado: pedida a las 15:00 con la clínica cerrada
    // de 14 a 16, mejor «la una y cuarto o las cuatro» que «las cuatro o las cuatro y cuarto».
    const objetivo = aMinutos(opciones.cerca);
    const distancia = (h: Hueco) => Math.abs(aMinutos(h.hora) - objetivo);
    const porCercania = (a: Hueco, b: Hueco) => distancia(a) - distancia(b) || a.inicio - b.inicio;
    const antes = huecos.filter((h) => aMinutos(h.hora) < objetivo).sort(porCercania);
    const despues = huecos.filter((h) => aMinutos(h.hora) >= objetivo).sort(porCercania);
    const [primero, segundo] = [antes[0], despues[0]].filter((h): h is Hueco => !!h).sort(porCercania);
    const resto = [...antes, ...despues].filter((h) => h !== primero && h !== segundo).sort(porCercania);
    return [primero, segundo, ...resto].filter((h): h is Hueco => !!h);
  }
  const intercalar = (a: readonly Hueco[], b: readonly Hueco[]) => {
    const salida: Hueco[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i]) salida.push(a[i]!);
      if (b[i]) salida.push(b[i]!);
    }
    return salida;
  };
  const repartir = (lista: readonly Hueco[]) => {
    const manana = lista.filter((h) => enFranja(h, "mañana"));
    const tarde = lista.filter((h) => enFranja(h, "tarde"));
    if (manana.length && tarde.length) return intercalar(manana, tarde);
    const mitad = Math.ceil(lista.length / 2);
    return intercalar(lista.slice(0, mitad), lista.slice(mitad));
  };
  const redondas = huecos.filter((h) => aMinutos(h.hora) % 30 === 0);
  const resto = huecos.filter((h) => aMinutos(h.hora) % 30 !== 0);
  return [...repartir(redondas), ...repartir(resto)];
}
