// El escritor de la hoja: fila libre calculada (nunca append), columnas por cabecera, lo ajeno intacto,
// sin duplicados, la pestaña crece si hace falta, dos a la vez no se pisan y lo escrito se relee.

import { describe, expect, it } from "vitest";
import { candadosEnMemoria } from "../src/bloqueo/candado.js";
import { PESTANAS } from "../src/hoja/esquema.js";
import { escritorDeHoja } from "../src/hoja/escritor.js";
import { sheetsFalso } from "./comun/sheets-falso.js";

const llamadas = PESTANAS.llamadas;
const cabecera = [...llamadas.columnas];
const escritor = (s: ReturnType<typeof sheetsFalso>) =>
  escritorDeHoja("hoja-falsa", { candados: candadosEnMemoria(), token: async () => "t", fetch: s.fetch });

describe("escritor de la hoja", () => {
  it("escribe en la fila siguiente a la última con algo, por cabecera, con RAW y rango cerrado", async () => {
    const s = sheetsFalso({ Llamadas: { valores: [cabecera, ["2026-09-25 10:00", 60, "", "", "", "", 0.1, "a"]] } });
    const r = await escritor(s).escribir(llamadas, { fecha: "2026-09-26 13:51", telefono: "612345666", coste: 0.2048, id_llamada: "b" });
    expect(r).toEqual({ fila: 3, yaEstaba: false });
    expect(s.matriz("Llamadas")[2]).toEqual(["2026-09-26 13:51", "", "612345666", "", "", "", 0.2048, "b"]);
    const put = s.peticiones.find((p) => p.metodo === "PUT")!;
    expect(decodeURIComponent(put.url)).toContain("'Llamadas'!A3:H3?valueInputOption=RAW");
    expect(s.peticiones.some((p) => p.url.includes(":append"))).toBe(false);
  });

  it("con las columnas movidas y una columna de la clínica en medio: cada dato a su columna, lo ajeno sin tocar", async () => {
    const s = sheetsFalso({
      Llamadas: { valores: [["id_llamada", "comentario de la clínica", "coste", "fecha"], ["x", "llamar el lunes", 0.1, "ayer"]] },
    });
    await escritor(s).escribir(llamadas, { fecha: "hoy", coste: 0.3, id_llamada: "y" });
    expect(s.matriz("Llamadas")[2]).toEqual(["y", "", 0.3, "hoy"]);
    expect(s.matriz("Llamadas")[1]).toEqual(["x", "llamar el lunes", 0.1, "ayer"]);
  });

  it("una nota suelta debajo de la tabla no se pisa: se escribe después de ella", async () => {
    const s = sheetsFalso({ Llamadas: { valores: [cabecera, ["f1"], [], [], ["ojo: revisar las de ayer"]] } });
    const r = await escritor(s).escribir(llamadas, { fecha: "f2", id_llamada: "z" });
    expect(r.fila).toBe(6);
    expect(s.matriz("Llamadas")[4]).toEqual(["ojo: revisar las de ayer"]);
  });

  it("si ya hay una fila de esa llamada, no escribe otra", async () => {
    const s = sheetsFalso({ Llamadas: { valores: [cabecera, ["f1", "", "", "", "", "", "", "llam-1"]] } });
    const r = await escritor(s).escribir(llamadas, { fecha: "otra vez", id_llamada: "llam-1" }, { igual: ["id_llamada"] });
    expect(r).toEqual({ fila: 2, yaEstaba: true });
    expect(s.matriz("Llamadas")).toHaveLength(2);
  });

  it("si la pestaña está llena, le añade filas y escribe", async () => {
    const s = sheetsFalso({ Llamadas: { filas: 2, valores: [cabecera, ["f1"]] } });
    const r = await escritor(s).escribir(llamadas, { fecha: "f2" });
    expect(r.fila).toBe(3);
    expect(s.hojas.get("Llamadas")!.filas).toBeGreaterThanOrEqual(3);
    expect(s.matriz("Llamadas")[2]).toEqual(["f2"]);
  });

  it("dos escrituras a la vez van a filas distintas", async () => {
    const s = sheetsFalso({ Llamadas: { valores: [cabecera] } });
    const e = escritor(s);
    const [a, b, c] = await Promise.all([
      e.escribir(llamadas, { fecha: "a" }), e.escribir(llamadas, { fecha: "b" }), e.escribir(llamadas, { fecha: "c" }),
    ]);
    expect(new Set([a.fila, b.fila, c.fila])).toEqual(new Set([2, 3, 4]));
    expect(s.matriz("Llamadas").slice(1).map((f) => f[0]).sort()).toEqual(["a", "b", "c"]);
  });

  it("sin cabeceras, o sin la columna, no escribe a ciegas", async () => {
    await expect(escritor(sheetsFalso({ Llamadas: {} })).escribir(llamadas, { fecha: "x" })).rejects.toThrow(/no tiene cabeceras/);
    const s = sheetsFalso({ Llamadas: { valores: [["fecha", "coste"]] } });
    await expect(escritor(s).escribir(llamadas, { fecha: "x", id_llamada: "y" })).rejects.toThrow(/le falta la columna «id_llamada»/);
    await expect(escritor(s).escribir(llamadas, { inventada: "x" })).rejects.toThrow(/no tiene la columna inventada/);
  });

  it("si al releer la fila no está como se escribió, es un error", async () => {
    const s = sheetsFalso({ Llamadas: { valores: [cabecera] } });
    const original = s.fetch;
    const tramposo: typeof fetch = async (u, init) => {
      if (init?.method === "PUT") {
        const cuerpo = JSON.parse(String(init.body));
        cuerpo.values[0][0] = "otra cosa";
        return original(u, { ...init, body: JSON.stringify(cuerpo) });
      }
      return original(u, init);
    };
    const e = escritorDeHoja("hoja-falsa", { candados: candadosEnMemoria(), token: async () => "t", fetch: tramposo });
    await expect(e.escribir(llamadas, { fecha: "f" })).rejects.toThrow(/no ha quedado como se escribió \(columnas A\)/);
  });
});
