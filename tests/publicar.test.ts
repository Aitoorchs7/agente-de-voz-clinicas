// La publicación contra un Vapi en memoria que, como el de verdad, REEMPLAZA los objetos anidados.

import { describe, expect, it } from "vitest";
import { leerBloques, leerDescripcionHerramientaHoja, leerMensajes } from "../src/compilador/bloques.js";
import { ErrorDePublicacion, publicar } from "../src/compilador/publicar.js";
import { compilarFicha } from "../src/compilador/render.js";
import { asistenteDeDiego, fichaDentalvis, vapiFalso } from "./ayudas.js";

const compilado = (hoja = "HOJA-NUEVA") =>
  compilarFicha(fichaDentalvis(hoja), { bloques: leerBloques(), mensajes: leerMensajes(), descripcionHerramientaHoja: leerDescripcionHerramientaHoja() });

describe("publicar", () => {
  it("cambia el prompt y los tres mensajes, y conserva TODO lo demás del model", async () => {
    const v = vapiFalso(asistenteDeDiego());
    const c = compilado();
    const r = await publicar(v.cliente, "asistente-1", c);
    expect(r.estado).toBe("publicado");
    const a = v.estado.asistente;
    expect(a.model).toMatchObject({ provider: "google", model: "gemini-3.5-flash", temperature: 0.3, toolIds: ["cal-check", "cal-crear", "hoja"] });
    expect(a.model!.messages).toEqual([{ role: "system", content: c.prompt }]);
    expect(a.firstMessage).toBe(c.firstMessage);
    expect(a.endCallMessage).toBe(c.endCallMessage);
    expect(a.voicemailMessage).toBe(c.voicemailMessage);
    expect(a.voice).toEqual(asistenteDeDiego().asistente.voice);
    expect(a.analysisPlan).toEqual(asistenteDeDiego().asistente.analysisPlan);
  });

  it("pone el spreadsheetId de la ficha en la herramienta de Sheets, sin tocar su rango ni su nombre", async () => {
    const v = vapiFalso(asistenteDeDiego());
    await publicar(v.cliente, "asistente-1", compilado("HOJA-NUEVA"));
    const h = v.estado.herramientas.find((x) => x.id === "hoja")!;
    expect(h.metadata).toEqual({ spreadsheetId: "HOJA-NUEVA", range: "Llamadas!A:Z" });
    expect(h.function!.name).toBe("google_sheets_tool");
    expect(h.function!.description).toContain("EXACTAMENTE HOJA-NUEVA");
    const calendario = v.estado.herramientas.find((x) => x.id === "cal-check")!;
    expect(calendario).toEqual(asistenteDeDiego().herramientas[0]);
  });

  it("si no ha cambiado nada, no hace ningún PATCH", async () => {
    const v = vapiFalso(asistenteDeDiego());
    await publicar(v.cliente, "asistente-1", compilado());
    v.llamadas.length = 0;
    const r = await publicar(v.cliente, "asistente-1", compilado());
    expect(r.estado).toBe("sin-cambios");
    expect(v.llamadas.filter((l) => l.startsWith("PATCH"))).toEqual([]);
  });

  it("en simulación dice qué cambiaría y no toca nada", async () => {
    const v = vapiFalso(asistenteDeDiego());
    const r = await publicar(v.cliente, "asistente-1", compilado(), { simular: true });
    expect(r.estado).toBe("simulado");
    expect(r.cambios).toEqual(["prompt", "firstMessage", "endCallMessage", "voicemailMessage", "herramienta de Sheets (spreadsheetId)"]);
    expect(v.llamadas.filter((l) => l.startsWith("PATCH"))).toEqual([]);
    expect(v.estado.asistente).toEqual(asistenteDeDiego().asistente);
  });

  it("si Vapi pierde los toolIds al guardar (200 OK y bot mudo), lo detecta y lo deja como estaba", async () => {
    const v = vapiFalso(asistenteDeDiego());
    v.estropearElSiguientePatch((a) => delete a.model!.toolIds);
    await expect(publicar(v.cliente, "asistente-1", compilado())).rejects.toThrow(/model.toolIds.*Se ha dejado como estaba/);
    expect(v.estado.asistente.model).toEqual(asistenteDeDiego().asistente.model);
    expect(v.estado.asistente.firstMessage).toBe(asistenteDeDiego().asistente.firstMessage);
  });

  it("si un campo que no se ha mandado cambia (la voz), también vuelve atrás", async () => {
    const v = vapiFalso(asistenteDeDiego());
    v.estropearElSiguientePatch((a) => delete (a.voice as { fallbackPlan?: unknown }).fallbackPlan);
    await expect(publicar(v.cliente, "asistente-1", compilado())).rejects.toThrow(/«voice» ha cambiado/);
  });

  it("no publica encima de un asistente que ya está roto (sin herramientas)", async () => {
    const roto = asistenteDeDiego();
    delete roto.asistente.model!.toolIds;
    const v = vapiFalso(roto);
    await expect(publicar(v.cliente, "asistente-1", compilado())).rejects.toThrow(ErrorDePublicacion);
    expect(v.llamadas.filter((l) => l.startsWith("PATCH"))).toEqual([]);
  });

  it("no cambia la herramienta de Sheets si la comparte otro asistente (otra clínica)", async () => {
    const base = asistenteDeDiego();
    const v = vapiFalso({ ...base, otros: [{ id: "otra-clinica", name: "Otra clínica", model: { toolIds: ["hoja"] } }] });
    await expect(publicar(v.cliente, "asistente-1", compilado())).rejects.toThrow(/Otra clínica/);
    expect(v.llamadas.filter((l) => l.startsWith("PATCH"))).toEqual([]);
  });
});
