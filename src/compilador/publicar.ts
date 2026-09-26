// Publicar lo compilado en el asistente de Vapi sin romper nada de lo que ya tiene.
//
// ⚠ La trampa que ya ha pasado dos veces en este proyecto: PATCH /assistant REEMPLAZA los objetos
// anidados, no los fusiona. Un {"model":{"messages":[...]}} a secas borra provider, modelo,
// temperature y toolIds, devuelve 200 OK y deja el bot mudo. Por eso, siempre:
//   GET → copiar el `model` entero → cambiar solo el texto del mensaje de sistema → PATCH completo
//   → GET otra vez y comparar campo a campo → si algo no cuadra, volver a dejarlo como estaba.
// Un 200 OK no es una publicación correcta. La comprobación posterior sí.
//
// Desde la Fase 3 no hay herramienta nativa de Sheets que tocar (la fila de cada llamada la escribe el
// `end-of-call-report`). A cambio, antes de publicar se comprueba que cada herramienta que nombra el
// prompt está enganchada al asistente.

import { isDeepStrictEqual } from "node:util";
import { HERRAMIENTAS } from "../herramientas/definiciones.js";
import type { Asistente, ClienteVapi } from "../vapi/cliente.js";
import type { Compilado } from "./render.js";

export class ErrorDePublicacion extends Error {
  override name = "ErrorDePublicacion";
}

export interface ResultadoPublicacion {
  estado: "publicado" | "sin-cambios" | "simulado";
  /** Qué ha cambiado (o cambiaría, si es una simulación). */
  cambios: string[];
  avisos: string[];
}

const MENSAJES = ["firstMessage", "endCallMessage", "voicemailMessage"] as const;
/** Campos que Vapi cambia solo en cada PATCH y que no cuentan como diferencia. */
const CAMPOS_QUE_CAMBIA_VAPI = new Set(["updatedAt", "latestVersion"]);

/**
 * Los nombres de herramienta que un prompt puede nombrar: las propias (Fase 3) y las nativas que ha
 * habido. Si el prompt nombra una que el asistente no tiene, el bot la llamaría y no pasaría nada: no se
 * publica. Es lo que impide poner el prompt de las herramientas propias en un asistente con las nativas,
 * o al revés.
 */
export const NOMBRES_DE_HERRAMIENTA: readonly string[] = [
  ...HERRAMIENTAS.map((h) => h.name),
  "google_calendar_check",
  "google_calendar_agendamiento",
  "google_sheets_tool",
  "transferir_llamada",
  "finalizar_llamada",
];

export function herramientasNombradas(prompt: string): string[] {
  return NOMBRES_DE_HERRAMIENTA.filter((n) => new RegExp(`(^|[^\\w])${n}([^\\w]|$)`).test(prompt));
}

export async function publicar(
  vapi: ClienteVapi,
  assistantId: string,
  c: Compilado,
  opciones: { simular?: boolean } = {},
): Promise<ResultadoPublicacion> {
  const avisos: string[] = [];
  const antes = await vapi.leerAsistente(assistantId);
  comprobarQueEstaSano(antes);

  // --- Las herramientas que nombra el prompt tienen que estar enganchadas al asistente.
  const tiene = new Set(
    (await Promise.all((antes.model!.toolIds ?? []).map((id) => vapi.leerHerramienta(id)))).map((h) => h.function?.name ?? h.type),
  );
  const faltan = herramientasNombradas(c.prompt).filter((n) => !tiene.has(n));
  if (faltan.length) {
    throw new ErrorDePublicacion(
      `El prompt nombra ${faltan.join(", ")} y el asistente ${assistantId} no ${faltan.length === 1 ? "la tiene enganchada" : "las tiene enganchadas"}. ` +
        "No publico: el bot llamaría a una herramienta que no existe.",
    );
  }

  // --- Qué cambiaría en el asistente
  const cambios: string[] = [];
  const sistemaAntes = antes.model!.messages!.find((m) => m.role === "system")!;
  if (sistemaAntes.content !== c.prompt) cambios.push("prompt");
  for (const campo of MENSAJES) if (antes[campo] !== c[campo]) cambios.push(campo);

  if (!cambios.length) return { estado: "sin-cambios", cambios, avisos };
  if (opciones.simular) return { estado: "simulado", cambios, avisos };

  // --- El asistente, con el objeto `model` COMPLETO.
  const model = structuredClone(antes.model!);
  model.messages = model.messages!.map((m) => (m.role === "system" ? { ...m, content: c.prompt } : m));
  await vapi.actualizarAsistente(assistantId, {
    model,
    firstMessage: c.firstMessage,
    endCallMessage: c.endCallMessage,
    voicemailMessage: c.voicemailMessage,
  });

  const despues = await vapi.leerAsistente(assistantId);
  const fallos = diferencias(antes, despues, {
    model,
    firstMessage: c.firstMessage,
    endCallMessage: c.endCallMessage,
    voicemailMessage: c.voicemailMessage,
  });
  if (fallos.length) {
    const vuelta = await volverAtras(vapi, assistantId, antes);
    throw new ErrorDePublicacion(
      `El asistente no quedó como se mandó: ${fallos.join("; ")}. ` +
        (vuelta ? "Se ha dejado como estaba antes." : "⚠ Y NO se ha podido dejar como estaba: revísalo a mano YA."),
    );
  }
  return { estado: "publicado", cambios, avisos };
}

function comprobarQueEstaSano(a: Asistente): void {
  const m = a.model;
  const problemas: string[] = [];
  if (!m) problemas.push("no tiene `model`");
  else {
    if (!m.provider || !m.model) problemas.push("le falta el proveedor o el modelo");
    if (!Array.isArray(m.toolIds) || !m.toolIds.length) problemas.push("no tiene herramientas (`toolIds`)");
    const sistemas = (m.messages ?? []).filter((x) => x.role === "system");
    if (sistemas.length !== 1 || typeof sistemas[0]!.content !== "string") problemas.push("no tiene exactamente un mensaje de sistema");
  }
  if (problemas.length) {
    throw new ErrorDePublicacion(
      `El asistente ${a.id} no está como se esperaba (${problemas.join(", ")}). No publico encima de algo roto: revísalo a mano.`,
    );
  }
}

/**
 * Compara el asistente después del PATCH con lo que había antes y lo que se mandó. Vapi puede añadir
 * campos por su cuenta; lo que no puede es perder o cambiar ninguno de los que ya estaban.
 */
function diferencias(antes: Asistente, despues: Asistente, mandado: Partial<Asistente>): string[] {
  const fallos: string[] = [];
  for (const [clave, valor] of Object.entries(mandado)) {
    if (clave === "model") continue;
    if (!isDeepStrictEqual(despues[clave], valor)) fallos.push(`«${clave}» no es el que se mandó`);
  }
  const modelMandado = mandado.model!;
  for (const [clave, valor] of Object.entries(modelMandado)) {
    if (!isDeepStrictEqual(despues.model?.[clave], valor)) fallos.push(`model.${clave} ha cambiado`);
  }
  for (const [clave, valor] of Object.entries(antes)) {
    if (clave in mandado || CAMPOS_QUE_CAMBIA_VAPI.has(clave)) continue;
    if (!isDeepStrictEqual(despues[clave], valor)) fallos.push(`«${clave}» ha cambiado sin tocarlo`);
  }
  return fallos;
}

async function volverAtras(vapi: ClienteVapi, assistantId: string, antes: Asistente): Promise<boolean> {
  try {
    const original: Partial<Asistente> = { model: antes.model };
    for (const campo of MENSAJES) if (antes[campo] !== undefined) original[campo] = antes[campo];
    await vapi.actualizarAsistente(assistantId, original);
    const ahora = await vapi.leerAsistente(assistantId);
    return diferencias(antes, ahora, original).length === 0;
  } catch {
    return false;
  }
}
