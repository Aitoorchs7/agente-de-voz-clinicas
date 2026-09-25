// Preparar una hoja que ya está en uso: a una pestaña con datos solo se le añaden las columnas nuevas
// del esquema, al final de la primera fila. Nunca se mueve ni se borra nada.

import { describe, expect, it } from "vitest";
import { PESTANAS } from "../src/hoja/esquema.js";
import { cabecerasQueFaltan, letraDeColumna } from "../src/hoja/preparar.js";

describe("columnas nuevas en una pestaña con datos", () => {
  it("a la Citas de antes de la Fase 3 solo le falta id_llamada, y va detrás de la última (M)", () => {
    const antes = ["fecha_creacion", "fecha_cita", "hora_cita", "duracion_min", "tratamiento", "gabinete", "paciente", "telefono", "quien_llama", "id_evento", "estado", "notas"];
    const r = cabecerasQueFaltan(PESTANAS.citas, antes);
    expect(r).toEqual({ reconocida: true, faltan: [{ columna: "id_llamada", indice: 12 }] });
    expect(letraDeColumna(12)).toBe("M");
  });

  it("si ya las tiene todas, no añade nada, estén en el orden que estén", () => {
    const desordenadas = [...PESTANAS.escalados.columnas].reverse();
    expect(cabecerasQueFaltan(PESTANAS.escalados, desordenadas).faltan).toEqual([]);
  });

  it("reconoce las cabeceras con tildes o mayúsculas como las del esquema", () => {
    const r = cabecerasQueFaltan(PESTANAS.escalados, ["Fecha", "Teléfono", "NOMBRE", "motivo", "detalle", "Estado"]);
    expect(r.faltan.map((f) => f.columna)).toEqual(["id_llamada"]);
  });

  it("una cabecera de la clínica que no conoce se respeta: la nueva va detrás de ella", () => {
    const r = cabecerasQueFaltan(PESTANAS.escalados, ["fecha", "telefono", "nombre", "motivo", "detalle", "estado", "revisado por"]);
    expect(r.faltan).toEqual([{ columna: "id_llamada", indice: 7 }]);
  });

  it("una primera fila sin ninguna cabecera conocida no se toca: son datos (la Llamadas de la Fase 1)", () => {
    const filaDeDatos = ["2026-09-24 16:57", "666666666", "Carolina Fernandez", "extraccion", "cita", "2026-09-28", "18:00", "Cita para extraccion de muela"];
    expect(cabecerasQueFaltan(PESTANAS.llamadas, filaDeDatos)).toEqual({ reconocida: false, faltan: [] });
  });

  it("las letras de columna pasan de Z a AA", () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(letraDeColumna)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
  });
});
