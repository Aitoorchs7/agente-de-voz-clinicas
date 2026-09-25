// La batería del bloqueo temporal, compartida: la corre la versión en memoria en cada `npm test`, y la
// de Redis contra Upstash de verdad en `npm run test:integracion`. Si las dos pasan lo mismo, las
// herramientas se pueden probar sin red sabiendo que en producción se comportan igual.

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CADUCIDAD_MS, type Bloqueos, type Intervalo } from "../../src/bloqueo/bloqueos.js";

const MIN = 60_000;
/** Las 10:00 del 28-sep-2026 en Madrid. */
const BASE = Date.UTC(2026, 8, 28, 8, 0);

export function pruebasDeBloqueos(nombre: string, fabrica: () => Bloqueos): void {
  describe(`bloqueo temporal (${nombre})`, () => {
    // Nombres únicos en cada prueba: en Redis no se pisan con nada de verdad ni entre ellas.
    const nuevo = () => {
      const cal = `prueba-${randomUUID()}@calendario`;
      const otroCal = `prueba-${randomUUID()}@calendario`;
      const de = (desde: number, hasta: number, c = cal): Intervalo => ({ calendario: c, fecha: "2026-09-28", inicio: BASE + desde * MIN, fin: BASE + hasta * MIN });
      return { b: fabrica(), de, otroCal, a: `llamada-${randomUUID()}`, z: `llamada-${randomUUID()}` };
    };
    const t0 = BASE - 60 * MIN;

    it("dos llamadas, la misma hora: la primera se la lleva y la segunda no", async () => {
      const { b, de, a, z } = nuevo();
      expect(await b.reservar(a, [de(0, 45)], 1, t0)).toEqual([0]);
      expect(await b.reservar(z, [de(0, 45)], 1, t0)).toEqual([]);
    });

    it("dos gabinetes distintos a la misma hora caben los dos", async () => {
      const { b, de, otroCal, a, z } = nuevo();
      expect(await b.reservar(a, [de(0, 45)], 1, t0)).toEqual([0]);
      expect(await b.reservar(z, [de(0, 45, otroCal)], 1, t0)).toEqual([0]);
    });

    it("solaparse un poco también choca; tocarse no", async () => {
      const { b, de, a, z } = nuevo();
      await b.reservar(a, [de(0, 45)], 1, t0);
      expect(await b.reservar(z, [de(30, 60)], 1, t0)).toEqual([]);
      expect(await b.reservar(z, [de(45, 90)], 1, t0)).toEqual([0]);
    });

    it("una llamada no choca consigo misma: volver a pedir lo suyo vale", async () => {
      const { b, de, a } = nuevo();
      expect(await b.reservar(a, [de(0, 45)], 1, t0)).toEqual([0]);
      expect(await b.reservar(a, [de(0, 45)], 1, t0)).toEqual([0]);
    });

    it("salta lo que tiene otra llamada y coge los siguientes, en orden, hasta los que pide", async () => {
      const { b, de, a, z } = nuevo();
      await b.reservar(a, [de(0, 45)], 1, t0);
      expect(await b.reservar(z, [de(0, 45), de(60, 105), de(120, 165), de(180, 225)], 2, t0)).toEqual([1, 2]);
    });

    it("dentro de un mismo lote no se cogen dos horas que se pisen entre sí", async () => {
      const { b, de, z } = nuevo();
      expect(await b.reservar(z, [de(0, 45), de(15, 60), de(60, 105)], 2, t0)).toEqual([0, 2]);
    });

    it("caduca solo: hasta el último instante sigue cogido; pasado el plazo, está libre", async () => {
      const { b, de, a, z } = nuevo();
      await b.reservar(a, [de(0, 45)], 1, t0);
      expect(await b.reservar(z, [de(0, 45)], 1, t0 + CADUCIDAD_MS - 1)).toEqual([]);
      expect(await b.reservar(z, [de(0, 45)], 1, t0 + CADUCIDAD_MS + 1)).toEqual([0]);
      expect(await b.esMio(a, de(0, 45), t0 + CADUCIDAD_MS + 1)).toBe(false);
    });

    it("cada herramienta renueva el plazo: cuenta desde la última", async () => {
      const { b, de, a, z } = nuevo();
      await b.reservar(a, [de(0, 45)], 1, t0);
      expect(await b.renovar(a, t0 + 3 * MIN)).toBe(1);
      expect(await b.reservar(z, [de(0, 45)], 1, t0 + 3 * MIN + CADUCIDAD_MS - 1)).toEqual([]);
      expect(await b.reservar(z, [de(0, 45)], 1, t0 + 3 * MIN + CADUCIDAD_MS + 1)).toEqual([0]);
    });

    it("renovar no resucita lo que ya caducó", async () => {
      const { b, de, a } = nuevo();
      await b.reservar(a, [de(0, 45)], 1, t0);
      expect(await b.renovar(a, t0 + CADUCIDAD_MS + 1)).toBe(0);
      expect(await b.esMio(a, de(0, 45), t0 + CADUCIDAD_MS + 2)).toBe(false);
    });

    it("soltar libera en el acto; soltar «salvo» deja la hora elegida y libera las demás", async () => {
      const { b, de, a, z } = nuevo();
      await b.reservar(a, [de(0, 45), de(60, 105)], 2, t0);
      expect(await b.soltar(a, [de(60, 105)])).toBe(1);
      expect(await b.reservar(z, [de(0, 45)], 1, t0)).toEqual([0]);
      expect(await b.reservar(z, [de(60, 105)], 1, t0)).toEqual([]);
      expect(await b.esMio(a, de(60, 105), t0)).toBe(true);
      expect(await b.soltar(a)).toBe(1);
      expect(await b.reservar(z, [de(60, 105)], 1, t0)).toEqual([0]);
    });

    it("soltar una llamada que no tiene nada no falla", async () => {
      const { b, a } = nuevo();
      expect(await b.soltar(a)).toBe(0);
      expect(await b.renovar(a, t0)).toBe(0);
    });

    it("diez llamadas a la vez por la misma hora: se la lleva UNA", async () => {
      const { b, de } = nuevo();
      const llamadas = Array.from({ length: 10 }, () => `llamada-${randomUUID()}`);
      const r = await Promise.all(llamadas.map((l) => b.reservar(l, [de(0, 45)], 1, t0)));
      expect(r.filter((x) => x.length === 1)).toHaveLength(1);
    });

    it("un intervalo imposible se rechaza antes de tocar nada", async () => {
      const { b, de, a } = nuevo();
      await expect(b.reservar(a, [de(45, 0)], 1, t0)).rejects.toThrow(RangeError);
    });
  });
}
