// Los huecos de un día: horario, duración entera dentro del tramo, calendario ocupado, antelación,
// cambio de hora y el orden en que se ofrecen.

import { describe, expect, it } from "vitest";
import { horaExacta, huecosDelDia, ordenParaOfrecer, type DiaDeAgenda } from "../src/agenda/huecos.js";
import { instante } from "../src/agenda/tiempo.js";
import type { Tramo } from "../src/hoja/lector.js";
import type { Dia } from "../src/hoja/esquema.js";

const Z = "Europe/Madrid";
const tramo = (dia: Dia, de: string, a: string): Tramo => {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
  return { fila: 2, dia, de, a, deMin: m(de), aMin: m(a) };
};
const HORARIO = [tramo("martes", "09:00", "14:00"), tramo("martes", "16:00", "20:00"), tramo("miércoles", "09:00", "14:00")];
const t = (fecha: string, hora: string) => instante(fecha, hora, Z).getTime();
const MARTES = "2026-09-29";

const dia = (cambios: Partial<DiaDeAgenda> = {}): DiaDeAgenda => ({
  fecha: MARTES, duracionMin: 45, tramos: HORARIO, zona: Z, ocupado: [], ahora: new Date("2026-09-26T12:00:00Z"), ...cambios,
});
const horas = (d: DiaDeAgenda) => huecosDelDia(d).map((h) => h.hora);

describe("huecos del día", () => {
  it("el tratamiento entero cabe dentro del tramo: una limpieza de 45 min empieza como tarde a las 13:15 y a las 19:15", () => {
    const h = horas(dia());
    expect(h[0]).toBe("09:00");
    expect(h).toContain("13:15");
    expect(h).not.toContain("13:30");
    expect(h).toContain("16:00");
    expect(h.at(-1)).toBe("19:15");
    expect(h).not.toContain("14:00");
    expect(h).not.toContain("15:45");
  });

  it("lo ocupado en el calendario no se ofrece, ni lo que lo pisaría", () => {
    const h = horas(dia({ ocupado: [{ inicio: t(MARTES, "10:00"), fin: t(MARTES, "11:00") }] }));
    expect(h).toContain("09:15"); // acaba justo a las 10:00
    expect(h).not.toContain("09:30");
    expect(h).not.toContain("10:30");
    expect(h).toContain("11:00");
  });

  it("con media hora de antelación: si son las 10:10 del mismo día, la primera es a las 10:45", () => {
    expect(horas(dia({ ahora: new Date(t(MARTES, "10:10")) }))[0]).toBe("10:45");
  });

  it("un día sin tramos no tiene huecos", () => {
    expect(horas(dia({ fecha: "2026-10-04" }))).toEqual([]); // domingo
  });

  it("cada hueco lleva sus instantes: en otoño, la misma hora es una hora UTC más tarde", () => {
    const septiembre = huecosDelDia(dia())[0]!;
    expect(new Date(septiembre.inicio).toISOString()).toBe("2026-09-29T07:00:00.000Z");
    expect(septiembre.fin - septiembre.inicio).toBe(45 * 60_000);
    const noviembre = huecosDelDia(dia({ fecha: "2026-11-03" }))[0]!;
    expect(new Date(noviembre.inicio).toISOString()).toBe("2026-11-03T08:00:00.000Z");
  });

  it("en la noche del cambio de hora de primavera no se ofrece una hora que no existe", () => {
    const madrugada = [tramo("domingo", "01:00", "04:00")];
    const h = horas(dia({ fecha: "2026-03-29", tramos: madrugada, duracionMin: 30, pasoMin: 30, ahora: new Date("2026-03-01T00:00:00Z") }));
    expect(h).toEqual(["01:00", "01:30", "03:00", "03:30"]);
  });
});

describe("una hora concreta", () => {
  it("fuera de la rejilla vale si cabe y está libre", () => {
    const r = horaExacta(dia(), "17:40");
    expect(r.libre && r.hueco.hora).toBe("17:40");
  });

  it("explica por qué no: cerrado, no cabe, ocupado, ya pasada", () => {
    expect(horaExacta(dia(), "15:00")).toEqual({ libre: false, porque: "cerrado" });
    expect(horaExacta(dia(), "13:30")).toEqual({ libre: false, porque: "no cabe" });
    expect(horaExacta(dia({ ocupado: [{ inicio: t(MARTES, "18:30"), fin: t(MARTES, "19:00") }] }), "18:00")).toEqual({ libre: false, porque: "ocupado" });
    expect(horaExacta(dia({ ahora: new Date(t(MARTES, "17:45")) }), "18:00")).toEqual({ libre: false, porque: "pasada" });
    expect(horaExacta(dia({ fecha: "2026-10-04" }), "10:00")).toEqual({ libre: false, porque: "cerrado" });
  });
});

describe("el orden en que se ofrecen", () => {
  it("primero en punto y medias, alternando mañana y tarde", () => {
    const orden = ordenParaOfrecer(huecosDelDia(dia())).map((h) => h.hora);
    expect(orden.slice(0, 4)).toEqual(["09:00", "16:00", "09:30", "16:30"]);
    expect(orden.findIndex((h) => h.endsWith(":15"))).toBeGreaterThan(orden.lastIndexOf("19:00"));
    expect(orden).toHaveLength(huecosDelDia(dia()).length);
  });

  it("si solo hay mañana, la primera mitad con la segunda", () => {
    const orden = ordenParaOfrecer(huecosDelDia(dia({ fecha: "2026-09-30" }))).map((h) => h.hora); // miércoles, 9 a 14
    expect(orden.slice(0, 2)).toEqual(["09:00", "11:30"]);
  });

  it("si pidió una hora ocupada, las más cercanas a esa hora", () => {
    const ocupado = [{ inicio: t(MARTES, "18:00"), fin: t(MARTES, "18:45") }];
    const orden = ordenParaOfrecer(huecosDelDia(dia({ ocupado })), { cerca: "18:00" }).map((h) => h.hora);
    expect(orden.slice(0, 2)).toEqual(["17:15", "18:45"]);
  });
});
