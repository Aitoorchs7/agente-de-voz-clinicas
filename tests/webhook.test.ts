// El webhook entero, con los POST REALES de la llamada 1 (fixtures/vapi/): credencial, reparto por tipo,
// un resultado por herramienta con su id, fallos convertidos en instrucciones, y el cierre de la llamada.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { idDeEvento } from "../src/agenda/calendario.js";
import { instante } from "../src/agenda/tiempo.js";
import { PESTANAS } from "../src/hoja/esquema.js";
import { MOTIVOS_FIN } from "../src/llamada/cierre.js";
import { atender, FALLO_TECNICO, SIN_CLINICA } from "../src/vapi/webhook.js";
import { entorno, MARTES, ZONA } from "./comun/entorno-herramientas.js";

const fixture = (nombre: string) => JSON.parse(readFileSync(new URL(`../fixtures/vapi/${nombre}`, import.meta.url), "utf8")).cuerpo;
const LLAMADA = "01a0dd8e-b774-7224-ab4f-12271165cc86";

const post = (cuerpo: unknown, autorizacion: string | null = "Bearer secreto-de-prueba") =>
  new Request("http://localhost/api/vapi", {
    method: "POST",
    headers: { "content-type": "application/json", ...(autorizacion ? { authorization: autorizacion } : {}) },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });

/** El tool-calls real, con otros argumentos (la llamada 1 usaba aún el `anotar` de un dato cada vez). */
function herramientas(nombre: string, argumentos: Record<string, unknown>) {
  const c = fixture("2026-09-26-tool-calls.json");
  c.message.toolCallList[0].function = { name: nombre, arguments: argumentos };
  return c;
}

describe("webhook: la puerta", () => {
  it("sin la credencial, 401; con otra, 401; sin POST, 405; con basura, 400", async () => {
    const e = entorno();
    expect((await atender(post(herramientas("anotar", {}), null), e.webhook)).status).toBe(401);
    expect((await atender(post(herramientas("anotar", {}), "Bearer otra"), e.webhook)).status).toBe(401);
    expect((await atender(new Request("http://localhost/api/vapi"), e.webhook)).status).toBe(405);
    expect((await atender(post("no es json"), e.webhook)).status).toBe(400);
    expect((await atender(post({ message: { type: "tool-calls", call: { id: "x", assistantId: "a" } } }), e.webhook)).status).toBe(400);
  });

  it("sin secreto configurado no atiende nada", async () => {
    const e = entorno();
    expect((await atender(post(herramientas("anotar", {})), { ...e.webhook, secreto: undefined })).status).toBe(500);
  });

  it("otros tipos de mensaje: 200 y nada", async () => {
    const r = await atender(post({ message: { type: "status-update", call: { id: "x", assistantId: "a" } } }), entorno().webhook);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({});
  });
});

describe("webhook: tool-calls", () => {
  it("el POST real de la llamada 1 → un resultado con su toolCallId y su nombre", async () => {
    const e = entorno();
    const r = await atender(post(herramientas("anotar", { telefono: "612345666" })), e.webhook);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.results).toHaveLength(1);
    expect(j.results[0]).toMatchObject({ toolCallId: "call_12938", name: "anotar" });
    expect(j.results[0].result).toContain("«seis, uno, dos, tres, cuatro, cinco, seis, seis, seis»");
    expect((await e.fichas.leer(LLAMADA)).telefono).toBe("612345666");
  });

  it("dos herramientas en el mismo POST: dos resultados, en orden", async () => {
    const e = entorno();
    const c = herramientas("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" });
    c.message.toolCallList.push({ id: "call_2", type: "function", function: { name: "anotar", arguments: { nombre: "Ana", apellidos: "Pérez" } } });
    const j = await (await atender(post(c), e.webhook)).json();
    expect(j.results.map((x: { toolCallId: string; name: string }) => [x.toolCallId, x.name])).toEqual([["call_12938", "consultar_huecos"], ["call_2", "anotar"]]);
    expect(j.results[1].result).toContain("Para la cita falta el teléfono");
  });

  it("si una herramienta falla, 200 y una instrucción, nunca un error que deje al bot mudo", async () => {
    const e = entorno();
    e.webhook.agenda.ocupado = async () => {
      throw new Error("Google Calendar respondió 503");
    };
    const r = await atender(post(herramientas("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES })), e.webhook);
    expect(r.status).toBe(200);
    expect((await r.json()).results[0].result).toBe(FALLO_TECNICO);
    expect(e.registro.some((l) => l.includes("503"))).toBe(true);
  });

  it("un asistente sin ficha, o una herramienta que no existe: lo dice", async () => {
    const e = entorno();
    const c = herramientas("anotar", { nombre: "Ana" });
    c.message.call.assistantId = "otro";
    expect((await (await atender(post(c), e.webhook)).json()).results[0].result).toBe(SIN_CLINICA);
    expect((await (await atender(post(herramientas("transferir", {})), e.webhook)).json()).results[0].result).toContain("No conozco");
  });
});

describe("webhook: end-of-call-report", () => {
  it("el informe real → fila en Llamadas con el coste real, la duración, el motivo y el resumen; una sola vez", async () => {
    const e = entorno();
    const informe = fixture("2026-09-26-end-of-call-report.json");
    expect((await atender(post(informe), e.webhook)).status).toBe(200);
    expect(e.filas("Llamadas")).toEqual([
      expect.objectContaining({
        fecha: "2026-09-26 13:51", duracion: 154, telefono: "", resumen: "Pidió una limpieza y quedó citado.",
        motivo_fin: MOTIVOS_FIN["assistant-ended-call"], coste: 0.2048, id_llamada: LLAMADA,
      }),
    ]);
    expect(String(e.filas("Llamadas")[0]!.transcripcion)).toMatch(/^AI: Clínica Dental Bis/);
    await atender(post(informe), e.webhook);
    expect(e.filas("Llamadas")).toHaveLength(1);
  });

  it("al colgar: suelta los bloqueos, borra la ficha y limpia el evento huérfano (el que tiene fila se queda)", async () => {
    const e = entorno();
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, { id: LLAMADA, tipo: "webCall", asistenteId: "x" });
    const inicio = (h: string) => instante(MARTES, h, ZONA).getTime();
    const ev = (h: string) => ({ id: idDeEvento(LLAMADA, "cal-g1", inicio(h)), inicio: inicio(h), fin: inicio(h) + 45 * 60_000, zona: ZONA, resumen: "x", descripcion: "", llamada: LLAMADA });
    await e.agenda.crear("cal-g1", ev("10:00")); // con fila en Citas
    await e.agenda.crear("cal-g1", ev("11:00")); // huérfano
    await e.dep.escritor("hoja-falsa").escribir(PESTANAS.citas, { id_evento: ev("10:00").id, id_llamada: LLAMADA });

    await atender(post(fixture("2026-09-26-end-of-call-report.json")), e.webhook);
    expect(await e.agenda.deLaLlamada("cal-g1", LLAMADA)).toEqual([ev("10:00").id]);
    expect(await e.fichas.leer(LLAMADA)).toEqual({});
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, { id: "otra", tipo: "webCall", asistenteId: "x" })).toMatch(/^Libre/);
    expect(e.registro.some((l) => l.includes("huérfano"))).toBe(true);
  });

  it("si el resumen falla, la fila se escribe igual, sin resumen", async () => {
    const e = entorno();
    const r = await atender(post(fixture("2026-09-26-end-of-call-report.json")), {
      ...e.webhook,
      resumir: async () => {
        throw new Error("Gemini respondió 429");
      },
    });
    expect(r.status).toBe(200);
    expect(e.filas("Llamadas")[0]).toMatchObject({ resumen: "", coste: 0.2048 });
  });
});
