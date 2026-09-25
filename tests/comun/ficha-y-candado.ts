// La ficha de la llamada y el candado de la hoja: batería compartida por la versión en memoria
// (npm test) y la de Redis de verdad (npm run test:integracion).

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ErrorDeCandado, type Candados } from "../../src/bloqueo/candado.js";
import type { Fichas } from "../../src/llamada/ficha.js";

export function pruebasDeFicha(nombre: string, fabrica: () => Fichas): void {
  describe(`ficha de la llamada (${nombre})`, () => {
    it("apunta, lee, olvida lo de una cita y conserva el teléfono, y se borra al colgar", async () => {
      const f = fabrica();
      const llamada = `llamada-${randomUUID()}`;
      expect(await f.leer(llamada)).toEqual({});
      await f.anotar(llamada, { tratamiento: "LIM", fecha: "2026-09-28" });
      await f.anotar(llamada, { nombre: "Ana", apellidos: "Pérez", telefono: "666111222" });
      expect(await f.leer(llamada)).toEqual({ tratamiento: "LIM", fecha: "2026-09-28", nombre: "Ana", apellidos: "Pérez", telefono: "666111222" });
      await f.anotar(llamada, { nombre: "Anabel" });
      expect((await f.leer(llamada)).nombre).toBe("Anabel");
      await f.olvidar(llamada, ["tratamiento", "fecha", "nombre", "apellidos"]);
      expect(await f.leer(llamada)).toEqual({ telefono: "666111222" });
      await f.borrar(llamada);
      expect(await f.leer(llamada)).toEqual({});
    });

    it("las fichas de dos llamadas no se mezclan", async () => {
      const f = fabrica();
      const [a, b] = [`llamada-${randomUUID()}`, `llamada-${randomUUID()}`];
      await f.anotar(a, { nombre: "Ana" });
      await f.anotar(b, { nombre: "Luis" });
      expect((await f.leer(a)).nombre).toBe("Ana");
      expect((await f.leer(b)).nombre).toBe("Luis");
      await Promise.all([f.borrar(a), f.borrar(b)]);
    });
  });
}

export function pruebasDeCandado(nombre: string, fabrica: () => Candados): void {
  describe(`candado de escritura (${nombre})`, () => {
    it("dos escrituras a la vez sobre la misma pestaña van una detrás de otra, nunca juntas", async () => {
      const c = fabrica();
      const pestana = `prueba-${randomUUID()}`;
      let dentro = 0;
      let maximo = 0;
      const trabajo = async () => {
        dentro++;
        maximo = Math.max(maximo, dentro);
        await new Promise((r) => setTimeout(r, 150));
        dentro--;
      };
      await Promise.all([c.con(pestana, trabajo), c.con(pestana, trabajo), c.con(pestana, trabajo)]);
      expect(maximo).toBe(1);
    });

    it("pestañas distintas no se esperan entre sí", async () => {
      const c = fabrica();
      let dentro = 0;
      let maximo = 0;
      const trabajo = async () => {
        dentro++;
        maximo = Math.max(maximo, dentro);
        await new Promise((r) => setTimeout(r, 150));
        dentro--;
      };
      await Promise.all([c.con(`p-${randomUUID()}`, trabajo), c.con(`p-${randomUUID()}`, trabajo)]);
      expect(maximo).toBe(2);
    });

    it("si no lo consigue a tiempo, falla sin hacer el trabajo; y si el trabajo falla, lo suelta", async () => {
      const c = fabrica();
      const pestana = `prueba-${randomUUID()}`;
      let hecho = false;
      const largo = c.con(pestana, () => new Promise((r) => setTimeout(r, 1_500)));
      await new Promise((r) => setTimeout(r, 100));
      await expect(c.con(pestana, async () => { hecho = true; }, { esperaMs: 300 })).rejects.toThrow(ErrorDeCandado);
      expect(hecho).toBe(false);
      await largo;
      await expect(c.con(pestana, async () => { throw new Error("falla"); })).rejects.toThrow("falla");
      await c.con(pestana, async () => { hecho = true; }, { esperaMs: 1_000 });
      expect(hecho).toBe(true);
    });
  });
}
