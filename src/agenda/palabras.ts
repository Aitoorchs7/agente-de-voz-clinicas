// Fechas y horas dichas como se dicen al teléfono (PLAN.md §5: «Los números se dicen en palabras»).
// Lo que devuelven las herramientas lo lee el modelo y lo convierte en voz: si le llega «10:30», puede
// decir «diez treinta»; si le llega «a las diez y media de la mañana», lo dice bien.

import { diaDeLaSemana, diasEntre, type Fecha, type Hora } from "./tiempo.js";

const HASTA_VEINTINUEVE = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece",
  "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós",
  "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS: Record<number, string> = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa" };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** 0 a 99, en palabras. En femenino, «una» («a la una», «veintiuna»). */
export function numero(n: number, femenino = false): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new RangeError(`numero(): ${n} fuera de 0-99`);
  let t = n < 30 ? HASTA_VEINTINUEVE[n]! : DECENAS[Math.floor(n / 10)]! + (n % 10 ? ` y ${HASTA_VEINTINUEVE[n % 10]}` : "");
  if (femenino) t = t.replace(/uno$/, "una").replace(/veintiuno$/, "veintiuna");
  return t;
}

/** 2026 → «dos mil veintiséis». Basta para los años de una agenda. */
export function anio(n: number): string {
  if (n < 2000 || n > 2099) throw new RangeError(`anio(): ${n} fuera de 2000-2099`);
  return n === 2000 ? "dos mil" : `dos mil ${numero(n - 2000)}`;
}

function momentoDelDia(hora24: number): string {
  if (hora24 < 6) return "de la madrugada";
  if (hora24 < 12) return "de la mañana";
  if (hora24 === 12) return "del mediodía";
  if (hora24 < 21) return "de la tarde";
  return "de la noche";
}

/**
 * «10:30» → «a las diez y media de la mañana»; «13:00» → «a la una de la tarde»; «16:45» → «a las cinco
 * menos cuarto de la tarde». Con «de la mañana/tarde» porque al teléfono «a las cinco» es ambiguo.
 */
export function horaEnPalabras(hora: Hora): string {
  const [hh, mm] = hora.split(":").map(Number) as [number, number];
  let h = hh;
  let tras = "";
  if (mm === 15) tras = " y cuarto";
  else if (mm === 30) tras = " y media";
  else if (mm === 45) {
    h = (hh + 1) % 24;
    tras = " menos cuarto";
  } else if (mm > 30 && mm % 5 === 0) {
    h = (hh + 1) % 24;
    tras = ` menos ${numero(60 - mm)}`;
  } else if (mm > 0) tras = ` y ${numero(mm)}`;
  const doce = h % 12 === 0 ? 12 : h % 12;
  const articulo = doce === 1 ? "a la" : "a las";
  return `${articulo} ${numero(doce, true)}${tras} ${momentoDelDia(h)}`;
}

/**
 * «2026-09-24» → «el jueves veinticuatro de septiembre». Si es hoy o mañana, se dice («mañana, viernes
 * veinticinco de septiembre»), y si es de otro año, el año también: en diciembre, «enero» es del siguiente.
 */
export function fechaEnPalabras(fecha: Fecha, hoy?: Fecha): string {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const base = `${diaDeLaSemana(fecha)} ${d === 1 ? "uno" : numero(d)} de ${MESES[m - 1]}`;
  const conAnio = hoy && Number(hoy.slice(0, 4)) !== y ? `${base} de ${anio(y)}` : base;
  if (hoy) {
    const dias = diasEntre(hoy, fecha);
    if (dias === 0) return `hoy, ${conAnio}`;
    if (dias === 1) return `mañana, ${conAnio}`;
  }
  return `el ${conAnio}`;
}

/** «666111222» → «seis, seis, seis, uno, uno, uno, dos, dos, dos»: dígito a dígito, como pide el bloque 40. */
export function digitoADigito(cifras: string): string {
  return [...cifras].map((c) => numero(Number(c))).join(", ");
}
