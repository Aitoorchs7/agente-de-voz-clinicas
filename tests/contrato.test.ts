// El contrato del webhook contra los POST REALES de la llamada 1 (fixtures/vapi/). Si Vapi cambia la
// forma de lo que manda, esto falla antes de que falle una llamada.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ErrorDeContrato, leerMensaje, respuestaHerramientas } from "../src/vapi/contrato.js";

const fixture = (nombre: string) => JSON.parse(readFileSync(new URL(`../fixtures/vapi/${nombre}`, import.meta.url), "utf8"));
const herramientas = fixture("2026-09-26-tool-calls.json");
const informe = fixture("2026-09-26-end-of-call-report.json");

describe("el contrato del webhook de Vapi (fixtures del 26-sep-2026)", () => {
  it("los fixtures guardan el POST con su autorización marcada, no con su valor", () => {
    expect(herramientas.cabeceras.authorization).toBe("[no se guarda · autorización correcta]");
    expect(JSON.stringify(herramientas)).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{20,}/);
  });

  it("tool-calls: se lee toolCallList[].function, con los argumentos como objeto", () => {
    const m = leerMensaje(herramientas.cuerpo);
    expect(m.tipo).toBe("tool-calls");
    if (m.tipo !== "tool-calls") return;
    expect(m.llamada).toEqual({ id: "01a0dd8e-b774-7224-ab4f-12271165cc86", tipo: "webCall", asistenteId: "0854f732-b5f0-4224-9fd6-2edc60829c81" });
    expect(m.herramientas).toEqual([{ id: "call_12938", nombre: "anotar", argumentos: { valor: "612345666", campo: "telefono" } }]);
  });

  it("tool-calls: las tres formas que manda Vapi traen lo mismo (si dejan de coincidir, hay que mirar cuál vale)", () => {
    const msg = herramientas.cuerpo.message;
    const deLista = msg.toolCallList.map((t: { id: string; function: unknown }) => [t.id, t.function]);
    expect(msg.toolCalls.map((t: { id: string; function: unknown }) => [t.id, t.function])).toEqual(deLista);
    expect(msg.toolWithToolCallList.map((t: { toolCall: { id: string; function: unknown } }) => [t.toolCall.id, t.toolCall.function])).toEqual(deLista);
    expect(typeof msg.toolCallList[0].function.arguments).toBe("object");
  });

  it("una llamada web no trae número: no se inventa ninguno", () => {
    const m = leerMensaje(herramientas.cuerpo);
    expect(m.llamada && "numeroCliente" in m.llamada).toBe(false);
  });

  it("end-of-call-report: el coste real está en message.cost, no en message.call.cost", () => {
    const m = leerMensaje(informe.cuerpo);
    expect(m.tipo).toBe("end-of-call-report");
    if (m.tipo !== "end-of-call-report") return;
    expect(m.coste).toBe(0.2048);
    expect(informe.cuerpo.message.call.cost).toBe(0);
    expect(m.duracionSegundos).toBeCloseTo(153.5, 0);
    expect(m.inicio).toBe("2026-09-26T11:51:53.242Z");
    expect(m.fin).toBe("2026-09-26T11:54:26.753Z");
    expect(m.motivoFin).toBe("assistant-ended-call");
    expect(m.transcripcion).toMatch(/^AI: .*Diego/);
    expect(m.llamada.id).toBe("01a0dd8e-b774-7224-ab4f-12271165cc86");
  });

  it("si los argumentos llegan como texto JSON, también se leen; si no son un objeto, se rechaza", () => {
    const base = structuredClone(herramientas.cuerpo);
    base.message.toolCallList[0].function.arguments = '{"telefono":"612345666"}';
    const m = leerMensaje(base);
    expect(m.tipo === "tool-calls" && m.herramientas[0]!.argumentos).toEqual({ telefono: "612345666" });
    base.message.toolCallList[0].function.arguments = "[1,2]";
    expect(() => leerMensaje(base)).toThrow(ErrorDeContrato);
  });

  it("si desaparece toolCallList, falla diciendo que la forma ha cambiado", () => {
    const base = structuredClone(herramientas.cuerpo);
    delete base.message.toolCallList;
    expect(() => leerMensaje(base)).toThrow(/la forma ha cambiado/);
  });

  it("un tipo que no se atiende se lee como «otro», sin fallar", () => {
    const m = leerMensaje({ message: { type: "status-update", call: { id: "x", assistantId: "a" } } });
    expect(m).toEqual({ tipo: "otro", nombre: "status-update", llamada: { id: "x", tipo: "desconocido", asistenteId: "a" } });
  });

  it("la respuesta lleva el toolCallId y el nombre de cada herramienta", () => {
    expect(respuestaHerramientas([{ toolCallId: "call_1", name: "anotar", result: "Anotado." }])).toEqual({
      results: [{ toolCallId: "call_1", name: "anotar", result: "Anotado." }],
    });
  });
});
