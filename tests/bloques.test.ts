// Los bloques: que los dos que son el producto no se han tocado más de lo decidido, y que en el `90`
// no hay ni un dato escrito a mano.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { interpretarBloque, leerBloques, BLOQUES_OBLIGATORIOS } from "../src/compilador/bloques.js";
import { herramientasNombradas } from "../src/compilador/publicar.js";
import { ruta } from "../src/entorno.js";
import { HERRAMIENTAS } from "../src/herramientas/definiciones.js";

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
    // Fase 3: la V1 ya nombraba las herramientas propias. Solo cambia la línea de la hora concreta
    // («llama a crear_cita con esa hora» → consultar_huecos, decidido el 25-sep) y las dos del horario.
    expect(quitadas.length).toBe(3);
    expect(puestas.length).toBe(4);
    expect(quitadas[0]).toContain("llama a crear_cita con esa hora");
    expect(puestas[0]).toBe(quitadas[0]!.replace("crear_cita", "consultar_huecos"));
    for (const l of quitadas.slice(1)) expect(l).toMatch(/lunes a viernes|sábado/);
  });

  it("el 30 ya no fija ningún día de la semana a mano", () => {
    const t = leer(ruta("contenido/bloques/30 - Que no puede decir.md")).toLowerCase();
    for (const d of ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]) expect(t).not.toContain(d);
    expect(t).toContain("{{horario}}");
  });

  it("el 30 nombra las herramientas propias de la V1, y ninguna nativa", () => {
    const t = leer(ruta("contenido/bloques/30 - Que no puede decir.md"));
    expect(t).toContain("llamas a escalar_a_recepcion");
    expect(t).toContain("los horarios salen solo de consultar_huecos");
    expect(t).not.toMatch(/google_|crear_cita/);
  });
});

describe("todos los bloques", () => {
  it("están los obligatorios, activos y sin órdenes repetidos", () => {
    const b = leerBloques();
    for (const o of BLOQUES_OBLIGATORIOS) expect(b.some((x) => x.orden === o)).toBe(true);
  });

  it("ninguno nombra herramientas nativas de Vapi, ni una que no exista", () => {
    const propias = new Set(HERRAMIENTAS.map((h) => h.name));
    for (const b of leerBloques()) {
      expect(b.cuerpo).not.toMatch(/google_calendar|google_sheets|transferir_llamada|no_te_entiendo/);
      for (const n of herramientasNombradas(b.cuerpo)) expect(propias.has(n)).toBe(true);
    }
    const todo = leerBloques().map((b) => b.cuerpo).join("\n");
    for (const n of propias) expect(todo).toContain(n);
  });

  it("lo que salió mal en la llamada 1 no vuelve: ni {{customer.number}} ni teléfonos «separados por comas»", () => {
    for (const b of leerBloques()) {
      expect(b.cuerpo).not.toContain("customer.number");
      expect(b.cuerpo).not.toMatch(/separad[oa]s por comas/);
    }
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
