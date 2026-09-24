// Los bloques: que los dos que son el producto no se han tocado más de lo decidido, y que en el `90`
// no hay ni un dato escrito a mano.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { interpretarBloque, leerBloques, BLOQUES_OBLIGATORIOS } from "../src/compilador/bloques.js";
import { ruta } from "../src/entorno.js";

const V1 = "C:/Users/chica/Desktop/Bot Clinica Demo V1/4 Agente";
const hayV1 = existsSync(V1);
// Se comparan con los finales de línea normalizados: git los convierte al guardar y al sacar ficheros,
// y un \r\n frente a un \n no cambia ni una palabra de lo que lee el modelo.
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

describe("los dos bloques que son el producto", () => {
  it.runIf(hayV1)("el 25 es IDÉNTICO al de la V1, carácter a carácter", () => {
    expect(leer(ruta("contenido/bloques/25 - No interpretes de mas.md"))).toBe(leer(`${V1}/25 - No interpretes de mas.md`));
  });

  it.runIf(hayV1)("el 30 solo cambia en lo decidido: nombres de herramienta y el dato de horario", () => {
    const original = leer(`${V1}/30 - Que no puede decir.md`).split(/\r?\n/);
    const nuevo = leer(ruta("contenido/bloques/30 - Que no puede decir.md")).split(/\r?\n/);
    const quitadas = original.filter((l) => !nuevo.includes(l));
    const puestas = nuevo.filter((l) => !original.includes(l));
    expect(quitadas.length).toBe(5);
    expect(puestas.length).toBe(6);
    // Cada línea quitada lleva un nombre de herramienta de la Fase 3 o el dato de horario.
    for (const l of quitadas) expect(l).toMatch(/escalar_a_recepcion|consultar_huecos|crear_cita|lunes a viernes|sábado/);
    // Y el resto del texto, idéntico: quitando las herramientas, las líneas son las mismas palabras.
    const sinHerramientas = (l: string) => l.replace(/escalar_a_recepcion|consultar_huecos|crear_cita|google_calendar_check|google_sheets_tool/g, "·");
    expect(sinHerramientas(puestas[1]!)).toBe(sinHerramientas(quitadas[1]!));
    expect(sinHerramientas(puestas[2]!)).toBe(sinHerramientas(quitadas[2]!));
  });

  it("el 30 ya no fija ningún día de la semana a mano", () => {
    const t = leer(ruta("contenido/bloques/30 - Que no puede decir.md")).toLowerCase();
    for (const d of ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]) expect(t).not.toContain(d);
    expect(t).toContain("{{horario}}");
  });

  it("ni el 25 ni el 30 nombran herramientas que no existen todavía", () => {
    for (const f of ["25 - No interpretes de mas.md", "30 - Que no puede decir.md"]) {
      expect(leer(ruta("contenido/bloques", f))).not.toMatch(/escalar_a_recepcion|consultar_huecos|crear_cita|anotar\b|no_te_entiendo/);
    }
  });
});

describe("todos los bloques", () => {
  it("están los obligatorios, activos y sin órdenes repetidos", () => {
    const b = leerBloques();
    for (const o of BLOQUES_OBLIGATORIOS) expect(b.some((x) => x.orden === o)).toBe(true);
  });

  it("ninguno nombra herramientas de la Fase 3", () => {
    for (const b of leerBloques()) expect(b.cuerpo).not.toMatch(/escalar_a_recepcion|consultar_huecos|crear_cita|\banotar\b|no_te_entiendo/);
  });

  it("el 90 lleva SOLO huecos: ni una cifra ni un precio", () => {
    const b = leerBloques().find((x) => x.orden === 90)!;
    expect(b.cuerpo).not.toMatch(/\d|€/);
    expect(b.cuerpo).toMatch(/\{\{datos\}\}[\s\S]*\{\{horario\}\}[\s\S]*\{\{tratamientos\}\}[\s\S]*\{\{faq\}\}/);
  });

  it("ninguno lleva el nombre de la clínica ni del bot escritos a mano", () => {
    for (const b of leerBloques()) expect(b.cuerpo).not.toMatch(/Dentalvis|Diego|Europe\/Madrid/);
  });

  it("el frontmatter se valida", () => {
    expect(() => interpretarBloque("x.md", "sin frontmatter")).toThrow(/frontmatter/);
    expect(() => interpretarBloque("x.md", "---\norden: diez\nactivo: si\n---\nhola")).toThrow(/orden/);
    expect(() => interpretarBloque("x.md", "---\norden: 10\nactivo: quizá\n---\nhola")).toThrow(/activo/);
    expect(interpretarBloque("x.md", "---\r\norden: 10\r\nactivo: no\r\n---\r\nhola").activo).toBe(false);
  });
});
