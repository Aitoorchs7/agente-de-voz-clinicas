// La agenda contra Google Calendar de VERDAD (npm run test:integracion): un evento de prueba en
// «Gabinete 3», en diciembre de 2027 para no estorbar a nadie, que se borra al acabar.

import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { agendaDeGoogle, idDeEvento } from "../../src/agenda/calendario.js";
import { instante } from "../../src/agenda/tiempo.js";
import { cargarFicha } from "../../src/compilador/ciclo.js";

const calendario = cargarFicha("dentalvis").calendarios["Gabinete 3"]!;
const agenda = agendaDeGoogle();
const llamada = `prueba-${randomUUID()}`;
const inicio = instante("2027-12-14", "10:00", "Europe/Madrid").getTime();
const evento = {
  id: idDeEvento(llamada, calendario, inicio),
  inicio,
  fin: inicio + 45 * 60_000,
  zona: "Europe/Madrid",
  resumen: "PRUEBA automática · se borra sola",
  descripcion: "Prueba de integración de la Fase 3.",
  llamada,
};

afterAll(async () => {
  await agenda.borrar(calendario, evento.id);
});

describe("agenda de Google (de verdad)", () => {
  it("crea, no duplica, se ve ocupada, se encuentra por llamada, se borra y se puede revivir", async () => {
    expect(await agenda.crear(calendario, evento)).toBe("creado");
    expect(await agenda.crear(calendario, evento)).toBe("ya estaba");
    const ocupado = await agenda.ocupado(calendario, inicio - 3_600_000, inicio + 3_600_000);
    expect(ocupado).toContainEqual({ inicio, fin: evento.fin });
    expect(await agenda.deLaLlamada(calendario, llamada)).toEqual([evento.id]);
    await agenda.borrar(calendario, evento.id);
    expect(await agenda.deLaLlamada(calendario, llamada)).toEqual([]);
    expect(await agenda.ocupado(calendario, inicio - 3_600_000, inicio + 3_600_000)).not.toContainEqual({ inicio, fin: evento.fin });
    expect(await agenda.crear(calendario, evento)).toBe("creado");
    expect(await agenda.deLaLlamada(calendario, llamada)).toEqual([evento.id]);
  });

  it("un evento con ese ID de otra llamada no se toca", async () => {
    await expect(agenda.crear(calendario, { ...evento, llamada: "otra" })).rejects.toThrow(/no es de esta llamada/);
  });
});
