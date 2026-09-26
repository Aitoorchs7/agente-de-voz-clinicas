// Cómo se configura el servidor de un asistente de Vapi y qué cambia al pasar de las herramientas
// nativas a las propias. Lo usan el asistente de pruebas y el cambio de Diego: una sola definición.
//
// ⚠ PATCH /assistant REEMPLAZA los objetos anidados: `server` y `model` se mandan siempre enteros.

import type { Compilado } from "../compilador/render.js";
import { FRASE_PARA_COLGAR } from "../herramientas/definiciones.js";
import type { Asistente } from "./cliente.js";

/**
 * El servidor, COMPLETO. 10 s de límite (las herramientas tardan menos de 2) y un reintento al segundo
 * si falla la red o el servidor, nunca ante 400/401/403/404: las cuatro herramientas aguantan repetirse
 * sin duplicar nada. Sin reintento, un fallo de red deja al bot mudo (llamada del 26-sep).
 */
export function configuracionDelServidor(urlBase: string, credentialId: string) {
  return {
    url: `${urlBase.replace(/\/+$/, "")}/api/vapi`,
    credentialId,
    timeoutSeconds: 10,
    backoffPlan: { type: "fixed", maxRetries: 1, baseDelaySeconds: 1, excludedStatusCodes: [400, 401, 403, 404] },
  };
}

export const NOMBRES_PROPIAS = ["consultar_huecos", "anotar", "crear_cita", "escalar_a_recepcion", "endCall"] as const;

/**
 * Lo que se manda para pasar un asistente a las herramientas propias: el `model` entero copiado del
 * que tiene (proveedor, modelo, temperatura…), con el prompt compilado y SOLO las herramientas propias;
 * el servidor; los tres mensajes; y la frase con la que Vapi cuelga.
 */
export function cambiosParaPropias(
  actual: Asistente,
  ids: Readonly<Record<string, string>>,
  compilado: Pick<Compilado, "prompt" | "firstMessage" | "endCallMessage" | "voicemailMessage">,
  servidor: ReturnType<typeof configuracionDelServidor>,
): Partial<Asistente> {
  if (!actual.model) throw new Error("El asistente no tiene `model`: no se toca.");
  const faltan = NOMBRES_PROPIAS.filter((n) => !ids[n]);
  if (faltan.length) throw new Error(`Faltan herramientas registradas en Vapi: ${faltan.join(", ")} (npm run herramientas).`);
  const sistemas = (actual.model.messages ?? []).filter((m) => m.role === "system");
  if (sistemas.length !== 1) throw new Error("El asistente no tiene exactamente un mensaje de sistema: no se toca.");
  const model = structuredClone(actual.model);
  model.messages = model.messages!.map((m) => (m.role === "system" ? { ...m, content: compilado.prompt } : m));
  model.toolIds = NOMBRES_PROPIAS.map((n) => ids[n]!);
  return {
    model,
    server: servidor,
    firstMessage: compilado.firstMessage,
    endCallMessage: compilado.endCallMessage,
    voicemailMessage: compilado.voicemailMessage,
    endCallPhrases: [FRASE_PARA_COLGAR],
  };
}
