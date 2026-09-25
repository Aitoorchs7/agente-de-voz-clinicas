// Lo que devuelven las herramientas se dice en voz alta: números, horas y fechas en palabras.

import { describe, expect, it } from "vitest";
import { anio, digitoADigito, fechaEnPalabras, horaEnPalabras, numero } from "../src/agenda/palabras.js";

describe("números", () => {
  it.each([
    [0, false, "cero"], [1, false, "uno"], [1, true, "una"], [16, false, "dieciséis"], [21, true, "veintiuna"],
    [22, false, "veintidós"], [30, false, "treinta"], [31, false, "treinta y uno"], [45, false, "cuarenta y cinco"], [99, false, "noventa y nueve"],
  ])("%i (femenino: %s) → %s", (n, f, texto) => expect(numero(n, f)).toBe(texto));

  it("años y dígitos", () => {
    expect(anio(2026)).toBe("dos mil veintiséis");
    expect(anio(2027)).toBe("dos mil veintisiete");
    expect(digitoADigito("666111222")).toBe("seis, seis, seis, uno, uno, uno, dos, dos, dos");
  });
});

describe("horas, como se dicen al teléfono", () => {
  it.each([
    ["10:30", "a las diez y media de la mañana"],
    ["09:05", "a las nueve y cinco de la mañana"],
    ["12:00", "a las doce del mediodía"],
    ["12:45", "a la una menos cuarto de la tarde"],
    ["13:00", "a la una de la tarde"],
    ["16:45", "a las cinco menos cuarto de la tarde"],
    ["17:20", "a las cinco y veinte de la tarde"],
    ["18:40", "a las siete menos veinte de la tarde"],
    ["20:00", "a las ocho de la tarde"],
    ["21:30", "a las nueve y media de la noche"],
    ["00:30", "a las doce y media de la madrugada"],
    ["10:37", "a las diez y treinta y siete de la mañana"],
  ])("%s → %s", (h, texto) => expect(horaEnPalabras(h)).toBe(texto));
});

describe("fechas", () => {
  it("con el día de la semana y el mes", () => {
    expect(fechaEnPalabras("2026-09-24")).toBe("el jueves veinticuatro de septiembre");
    expect(fechaEnPalabras("2026-10-01")).toBe("el jueves uno de octubre");
  });

  it("hoy y mañana se dicen así", () => {
    expect(fechaEnPalabras("2026-09-24", "2026-09-24")).toBe("hoy, jueves veinticuatro de septiembre");
    expect(fechaEnPalabras("2026-09-25", "2026-09-24")).toBe("mañana, viernes veinticinco de septiembre");
    expect(fechaEnPalabras("2026-09-28", "2026-09-24")).toBe("el lunes veintiocho de septiembre");
  });

  it("si es de otro año, lleva el año: en diciembre, enero es del siguiente", () => {
    expect(fechaEnPalabras("2027-01-04", "2026-12-20")).toBe("el lunes cuatro de enero de dos mil veintisiete");
  });
});
