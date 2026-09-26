// Lo que se manda a Vapi para pasar un asistente a las herramientas propias: el `model` ENTERO (PATCH
// reemplaza los objetos anidados), solo las propias, el servidor con su reintento y la frase de colgar.

import { describe, expect, it } from "vitest";
import { FRASE_PARA_COLGAR } from "../src/herramientas/definiciones.js";
import { cambiosParaPropias, configuracionDelServidor, NOMBRES_PROPIAS } from "../src/vapi/servidor.js";
import { asistenteConNativas } from "./ayudas.js";

const ids = Object.fromEntries(NOMBRES_PROPIAS.map((n) => [n, `id-${n}`]));
const compilado = { prompt: "PROMPT NUEVO", firstMessage: "hola", endCallMessage: "adiós", voicemailMessage: "buzón" };
const servidor = configuracionDelServidor("https://ejemplo.vercel.app/", "cred-1");

describe("configuración del servidor", () => {
  it("la URL del webhook, la credencial, 10 s y UN reintento que no se hace ante 4xx de verdad", () => {
    expect(servidor).toEqual({
      url: "https://ejemplo.vercel.app/api/vapi",
      credentialId: "cred-1",
      timeoutSeconds: 10,
      backoffPlan: { type: "fixed", maxRetries: 1, baseDelaySeconds: 1, excludedStatusCodes: [400, 401, 403, 404] },
    });
  });
});

describe("cambios para pasar a las herramientas propias", () => {
  it("copia el model entero y solo cambia el prompt y las herramientas", () => {
    const antes = asistenteConNativas().asistente;
    const c = cambiosParaPropias(antes, ids, compilado, servidor);
    expect(c.model).toEqual({ ...antes.model, messages: [{ role: "system", content: "PROMPT NUEVO" }], toolIds: NOMBRES_PROPIAS.map((n) => `id-${n}`) });
    expect(c.model!.toolIds).not.toContain("hoja");
    expect(c).toMatchObject({ server: servidor, firstMessage: "hola", endCallMessage: "adiós", voicemailMessage: "buzón", endCallPhrases: [FRASE_PARA_COLGAR] });
    expect(antes.model!.toolIds).toEqual(["cal-check", "cal-crear", "hoja"]); // no toca el original
  });

  it("si falta alguna herramienta registrada, o el asistente está raro, no construye nada", () => {
    const antes = asistenteConNativas().asistente;
    expect(() => cambiosParaPropias(antes, { ...ids, crear_cita: "" }, compilado, servidor)).toThrow(/crear_cita/);
    const sinSistema = structuredClone(antes);
    sinSistema.model!.messages = [];
    expect(() => cambiosParaPropias(sinSistema, ids, compilado, servidor)).toThrow(/mensaje de sistema/);
  });
});
