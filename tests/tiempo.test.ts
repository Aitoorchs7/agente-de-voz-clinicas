// La hora de la clínica: la franja peligrosa de 23:00 a 01:00 y los dos cambios de hora de 2026 en
// España (29 de marzo y 25 de octubre). Skill prueba-marca-de-tiempo: esto NO sustituye a la llamada
// real de las 00:30; prueba nuestro código, no la cadena entera.

import { describe, expect, it } from "vitest";
import {
  aMinutos, deMinutos, desfase, diaDeLaSemana, diasEntre, enZona, esFecha, existe, hoy, instante, normalizarHora, sumarDias,
} from "../src/agenda/tiempo.js";

const MAD = "Europe/Madrid";
const CAN = "Atlantic/Canary";
const utc = (iso: string) => new Date(iso);

describe("qué hora es en la clínica", () => {
  it("a las 22:30 UTC de un 25 de septiembre, en Madrid ya es 26: la llamada de las 00:30", () => {
    expect(enZona(utc("2026-09-25T22:30:00Z"), MAD)).toEqual({ fecha: "2026-09-26", hora: "00:30", minutos: 30 });
    expect(hoy(MAD, utc("2026-09-25T22:30:00Z"))).toBe("2026-09-26");
  });

  it("en verano el día cambia a las 22:00 UTC; en invierno, a las 23:00 UTC", () => {
    expect(enZona(utc("2026-09-25T21:59:00Z"), MAD).fecha).toBe("2026-09-25");
    expect(enZona(utc("2026-09-25T22:00:00Z"), MAD).fecha).toBe("2026-09-26");
    expect(enZona(utc("2026-12-15T22:30:00Z"), MAD)).toMatchObject({ fecha: "2026-12-15", hora: "23:30" });
    expect(enZona(utc("2026-12-15T23:00:00Z"), MAD)).toMatchObject({ fecha: "2026-12-16", hora: "00:00" });
  });

  it("minuto a minuto por la franja de 23:00 a 01:00, el día de la clínica nunca va por detrás", () => {
    for (let m = 0; m <= 120; m++) {
      const t = new Date(Date.UTC(2026, 8, 25, 21, m)); // 23:00 → 01:00 en Madrid
      const e = enZona(t, MAD);
      expect(e.fecha).toBe(m < 60 ? "2026-09-25" : "2026-09-26");
    }
  });

  it("el desfase es +2 en verano y +1 en invierno en Madrid, y una hora menos en Canarias", () => {
    expect(desfase(utc("2026-07-01T12:00:00Z"), MAD)).toBe(120);
    expect(desfase(utc("2026-12-01T12:00:00Z"), MAD)).toBe(60);
    expect(desfase(utc("2026-07-01T12:00:00Z"), CAN)).toBe(60);
    expect(desfase(utc("2026-12-01T12:00:00Z"), CAN)).toBe(0);
  });
});

describe("el instante de una cita", () => {
  it("las 00:30 del 26 de septiembre en Madrid son las 22:30 UTC del 25", () => {
    expect(instante("2026-09-26", "00:30", MAD).toISOString()).toBe("2026-09-25T22:30:00.000Z");
  });

  it("se usa el desfase DEL DÍA DE LA CITA: una cita de noviembre pedida en septiembre va en horario de invierno", () => {
    expect(instante("2026-10-24", "10:00", MAD).toISOString()).toBe("2026-10-24T08:00:00.000Z");
    expect(instante("2026-10-26", "10:00", MAD).toISOString()).toBe("2026-10-26T09:00:00.000Z");
    expect(instante("2026-11-10", "17:00", MAD).toISOString()).toBe("2026-11-10T16:00:00.000Z");
  });

  it("y al revés en primavera", () => {
    expect(instante("2026-03-28", "10:00", MAD).toISOString()).toBe("2026-03-28T09:00:00.000Z");
    expect(instante("2026-03-29", "10:00", MAD).toISOString()).toBe("2026-03-29T08:00:00.000Z");
  });

  it("la hora que no existe (las 02:30 del 29 de marzo) se detecta", () => {
    expect(existe("2026-03-29", "02:30", MAD)).toBe(false);
    expect(existe("2026-03-29", "03:30", MAD)).toBe(true);
    expect(existe("2026-10-25", "02:30", MAD)).toBe(true);
    expect(existe("2026-09-24", "10:00", MAD)).toBe(true);
  });

  it("ida y vuelta: el instante de una fecha y hora vuelve a ser esa fecha y hora", () => {
    for (const [f, h] of [["2026-09-24", "10:00"], ["2026-10-25", "12:00"], ["2026-12-31", "23:45"], ["2027-01-01", "00:15"]] as const) {
      expect(enZona(instante(f, h, MAD), MAD)).toMatchObject({ fecha: f, hora: h });
      expect(enZona(instante(f, h, CAN), CAN)).toMatchObject({ fecha: f, hora: h });
    }
  });
});

describe("fechas de calendario", () => {
  it("sumar días cruza meses y años", () => {
    expect(sumarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(diasEntre("2026-09-24", "2026-10-01")).toBe(7);
    expect(diasEntre("2026-10-24", "2026-10-26")).toBe(2); // aunque en medio haya cambio de hora
  });

  it("el día de la semana sale de la fecha", () => {
    expect(diaDeLaSemana("2026-09-24")).toBe("jueves");
    expect(diaDeLaSemana("2026-09-27")).toBe("domingo");
    expect(diaDeLaSemana("2026-09-28")).toBe("lunes");
  });

  it("una fecha tiene que existir", () => {
    expect(esFecha("2026-09-24")).toBe(true);
    expect(esFecha("2026-02-29")).toBe(false);
    expect(esFecha("2028-02-29")).toBe(true);
    expect(esFecha("2026-06-31")).toBe(false);
    expect(esFecha("24/09/2026")).toBe(false);
  });

  it("las horas se normalizan y las imposibles se rechazan", () => {
    expect(normalizarHora("9:05")).toBe("09:05");
    expect(normalizarHora("10.30")).toBe("10:30");
    expect(normalizarHora("10h30")).toBe("10:30");
    expect(normalizarHora("24:00")).toBeNull();
    expect(normalizarHora("diez")).toBeNull();
    expect(aMinutos("10:30")).toBe(630);
    expect(deMinutos(630)).toBe("10:30");
  });
});
