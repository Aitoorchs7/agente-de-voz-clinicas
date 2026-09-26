// La publicación contra un Vapi en memoria que, como el de verdad, REEMPLAZA los objetos anidados.

import { describe, expect, it } from "vitest";
import { leerBloques, leerMensajes } from "../src/compilador/bloques.js";
import { ErrorDePublicacion, herramientasNombradas, publicar } from "../src/compilador/publicar.js";
import { compilarFicha } from "../src/compilador/render.js";
import { asistenteConNativas, asistenteDeDiego, fichaDentalvis, vapiFalso } from "./ayudas.js";

const compilado = () => compilarFicha(fichaDentalvis("HOJA"), { bloques: leerBloques(), mensajes: leerMensajes() });

describe("publicar", () => {
  it("cambia el prompt y los tres mensajes, y conserva TODO lo demás del model", async () => {
    const v = vapiFalso(asistenteDeDiego());
    const c = compilado();
    const r = await publicar(v.cliente, "asistente-1", c);
    expect(r.estado).toBe("publicado");
    const a = v.estado.asistente;
    expect(a.model).toMatchObject({ provider: "google", model: "gemini-3.5-flash", temperature: 0.3, toolIds: asistenteDeDiego().asistente.model!.toolIds });
    expect(a.model!.messages).toEqual([{ role: "system", content: c.prompt }]);
    expect(a.firstMessage).toBe(c.firstMessage);
    expect(a.endCallMessage).toBe(c.endCallMessage);
    expect(a.voicemailMessage).toBe(c.voicemailMessage);
    expect(a.voice).toEqual(asistenteDeDiego().asistente.voice);
    expect(a.analysisPlan).toEqual(asistenteDeDiego().asistente.analysisPlan);
  });

  it("no toca ninguna herramienta: ya no hay hoja nativa a la que ponerle el spreadsheetId", async () => {
    const v = vapiFalso(asistenteDeDiego());
    await publicar(v.cliente, "asistente-1", compilado());
    expect(v.llamadas.filter((l) => l.startsWith("PATCH herramienta"))).toEqual([]);
    expect(v.estado.herramientas).toEqual(asistenteDeDiego().herramientas);
  });

  it("NO publica el prompt de las herramientas propias en un asistente que tiene las nativas", async () => {
    const v = vapiFalso(asistenteConNativas());
    await expect(publicar(v.cliente, "asistente-1", compilado())).rejects.toThrow(
      /El prompt nombra consultar_huecos, anotar, crear_cita, escalar_a_recepcion y el asistente asistente-1 no las tiene enganchadas/,
    );
    expect(v.llamadas.filter((l) => l.startsWith("PATCH"))).toEqual([]);
    // Y en simulación, lo mismo: se sabe antes de publicar.
    await expect(publicar(v.cliente, "asistente-1", compilado(), { simular: true })).rejects.toThrow(ErrorDePublicacion);
  });

  it("los nombres de herramienta se buscan como palabras enteras", () => {
    expect(herramientasNombradas("llama a anotar con eso; luego crear_cita.")).toEqual(["anotar", "crear_cita"]);
    expect(herramientasNombradas("lo anotaremos y lo reanotar_x")).toEqual([]);
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
    expect(r.cambios).toEqual(["prompt", "firstMessage", "endCallMessage", "voicemailMessage"]);
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
});
