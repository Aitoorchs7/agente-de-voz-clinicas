// La batería del filtro de `público`: la pieza con más riesgo del proyecto. Cada caso de la lista del
// CLAUDE.md de la Fase 2 (§9) tiene aquí su prueba.

import { describe, expect, it } from "vitest";
import { PESTANAS } from "../src/hoja/esquema.js";
import { ErrorDeHoja, interpretarTabla, leerFaq } from "../src/hoja/lector.js";
import { clasificarPublico, comprobarQueNoSeCuela, describirContador, ErrorDeFiltro, filtrar } from "../src/compilador/filtro.js";

const faq = (valores: string[][]) => leerFaq(interpretarTabla(PESTANAS.faq, valores));
const CAB = ["pregunta", "respuesta", "categoría", "público"];

describe("clasificar el valor de «público»", () => {
  it.each([
    ["sí", "sí"], ["si", "sí"], ["SÍ", "sí"], ["Si", "sí"], ["  sí  ", "sí"], ["sí ", "sí"],
    ["no", "no"], ["NO", "no"], [" No ", "no"],
    ["", "vacío"], ["   ", "vacío"],
    ["pendiente", "desconocido"], ["x", "desconocido"], ["TRUE", "desconocido"], ["FALSE", "desconocido"],
    ["sí, pero", "desconocido"], ["s", "desconocido"], ["1", "desconocido"], ["yes", "desconocido"],
  ])("«%s» → %s", (valor, esperado) => {
    expect(clasificarPublico(valor)).toBe(esperado);
  });
});

describe("filtrar y contar son la misma pieza", () => {
  const filas = faq([
    CAB,
    ["¿Precio limpieza?", "55 €", "precios", "sí"],
    ["¿Horario?", "De 9 a 14", "", "Sí"],
    ["Coste laboratorio corona", "Nos cuesta 140 € y margen del 60 %", "interno", "no"],
    ["Acuerdo mutua", "Descuento pactado del 15 %", "interno", "NO"],
  ]);

  it("carga solo las «sí» y cuenta las demás", () => {
    const r = filtrar("FAQ", filas);
    expect(r.cargadas.map((f) => f.pregunta)).toEqual(["¿Precio limpieza?", "¿Horario?"]);
    expect(r.contador).toEqual({ pestana: "FAQ", leidas: 4, cargadas: 2, confidenciales: 2, sinMarcar: 0 });
  });

  it("el contador se lee en voz alta como en el §8 del plan", () => {
    const r = filtrar("Tratamientos", Array.from({ length: 12 }, (_, i) => ({ fila: i + 2, publico: i === 5 ? "no" : "sí" })));
    expect(describirContador(r.contador)).toBe("Tratamientos: 12 leídas, 11 cargadas · 1 confidencial");
  });

  it("un valor que no es ni sí ni no ABORTA, y dice la fila", () => {
    const raras = faq([CAB, ["a", "b", "", "sí"], ["c", "d", "", "pendiente"]]);
    expect(() => filtrar("FAQ", raras)).toThrow(ErrorDeFiltro);
    expect(() => filtrar("FAQ", raras)).toThrow(/fila 3 \(«pendiente»\)/);
  });

  it("una casilla de verificación (TRUE/FALSE) también aborta: no es sí ni no", () => {
    expect(() => filtrar("FAQ", faq([CAB, ["a", "b", "", "TRUE"]]))).toThrow(ErrorDeFiltro);
  });

  it("una celda de «público» vacía no se carga: se cuenta como sin marcar", () => {
    const r = filtrar("FAQ", faq([CAB, ["a", "b", "", "sí"], ["c", "d", "", ""]]));
    expect(r.cargadas).toHaveLength(1);
    expect(r.sinMarcar.map((f) => f.fila)).toEqual([3]);
    expect(describirContador(r.contador)).toBe("FAQ: 2 leídas, 1 cargada · 1 sin marcar");
  });
});

describe("el lector sobrevive a lo que hace la gente con una hoja", () => {
  it("falta la columna «público» → no se lee", () => {
    expect(() => faq([["pregunta", "respuesta", "categoría"], ["a", "b", "c"]])).toThrow(ErrorDeHoja);
    expect(() => faq([["pregunta", "respuesta", "categoría"], ["a", "b", "c"]])).toThrow(/público/);
  });

  it("«publico» sin tilde, en mayúsculas o con espacios es la misma columna", () => {
    for (const cab of ["publico", "PÚBLICO", " Público ", "Publico"]) {
      const f = faq([["pregunta", "respuesta", cab], ["a", "b", "sí"]]);
      expect(f[0]!.publico).toBe("sí");
    }
  });

  it("dos columnas «público» → no se lee: no se sabe cuál vale", () => {
    expect(() => faq([["pregunta", "respuesta", "público", "publico"], ["a", "b", "sí", "no"]])).toThrow(/dos columnas/);
  });

  it("columnas movidas de sitio: se encuentran por la cabecera", () => {
    const f = faq([["público", "respuesta", "pregunta"], ["no", "secreto", "¿algo?"]]);
    expect(f[0]).toMatchObject({ pregunta: "¿algo?", respuesta: "secreto", publico: "no" });
  });

  it("una columna que no conoce (por ejemplo «margen») no sale nunca del lector", () => {
    const f = faq([["pregunta", "respuesta", "margen", "público"], ["a", "b", "60 %", "sí"]]);
    expect(JSON.stringify(f)).not.toContain("60 %");
  });

  it("filas enteras en blanco se saltan y no cuentan como leídas", () => {
    const f = faq([CAB, ["a", "b", "", "sí"], ["", "", "", ""], [], ["c", "d", "", "sí"]]);
    expect(f.map((x) => x.fila)).toEqual([2, 5]);
  });

  it("una nota suelta debajo de la tabla no se carga y no desplaza nada", () => {
    const f = faq([
      CAB,
      ["¿Precio limpieza?", "55 €", "precios", "sí"],
      [],
      ["OJO: en enero subimos la limpieza a 70 €"],
    ]);
    const r = filtrar("FAQ", f);
    expect(r.cargadas.map((x) => x.respuesta)).toEqual(["55 €"]);
    expect(r.sinMarcar).toHaveLength(1);
  });

  it("una nota en una columna sin cabecera se ignora del todo", () => {
    const f = faq([CAB, ["a", "b", "", "sí", "", "nota: margen 60 %"]]);
    expect(f).toHaveLength(1);
    expect(JSON.stringify(f)).not.toContain("margen");
  });
});

describe("la segunda red: nada excluido en lo publicado", () => {
  it("para si el texto de una fila confidencial aparece en la salida", () => {
    expect(() =>
      comprobarQueNoSeCuela("… la corona nos cuesta 140 € y margen del 60 % …", [{ donde: "FAQ fila 4", texto: "nos cuesta 140 € y margen del 60 %" }]),
    ).toThrow(/FAQ fila 4/);
  });

  it("no salta con textos cortos que pueden coincidir por casualidad", () => {
    expect(() => comprobarQueNoSeCuela("dura 45 minutos, sí", [{ donde: "x", texto: "45" }, { donde: "y", texto: "sí" }])).not.toThrow();
  });
});
