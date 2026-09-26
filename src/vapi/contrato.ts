// El contrato del webhook de Vapi: lo que llega y lo que se contesta. Fijado con los POST reales de la
// llamada 1 (26-sep-2026), guardados en fixtures/vapi/. La documentación de Vapi se contradice; esto no:
// tests/contrato.test.ts lee esos fixtures y falla si la forma cambia.
//
// Lo que llegó de verdad:
// - `tool-calls`: las herramientas en `message.toolCallList[]`, cada una { id, type, function: { name,
//   arguments } }, con `arguments` como OBJETO. (También vienen en `toolCalls` y en
//   `toolWithToolCallList[].toolCall`, con lo mismo; se lee una sola, `toolCallList`.)
// - `end-of-call-report`: coste real en `message.cost` (`message.call.cost` es la foto del principio: 0),
//   duración en `durationSeconds`, `startedAt`, `endedAt`, `endedReason`, la transcripción en `transcript`.
// - La llamada en `message.call` ({ id, type, assistantId, … }). En una llamada web NO hay `customer`.
//
// Aquí solo se lee: sin red, sin hoja, sin decidir nada.

export class ErrorDeContrato extends Error {
  override name = "ErrorDeContrato";
}

export interface LlamadaVapi {
  id: string;
  /** «webCall», «inboundPhoneCall», «outboundPhoneCall»… */
  tipo: string;
  asistenteId: string;
  /** El número desde el que llaman, tal como lo da Vapi. No existe en las llamadas web ni con número oculto. */
  numeroCliente?: string;
}

export interface PeticionHerramienta {
  /** El `toolCallId` que hay que devolver en la respuesta. */
  id: string;
  nombre: string;
  argumentos: Record<string, unknown>;
}

export type MensajeVapi =
  | { tipo: "tool-calls"; llamada: LlamadaVapi; herramientas: PeticionHerramienta[] }
  | {
      tipo: "end-of-call-report";
      llamada: LlamadaVapi;
      /** En dólares. null si Vapi no lo manda. */
      coste: number | null;
      duracionSegundos: number | null;
      inicio: string | null;
      fin: string | null;
      motivoFin: string;
      transcripcion: string;
    }
  | { tipo: "otro"; nombre: string; llamada: LlamadaVapi | null };

export interface ResultadoHerramienta {
  toolCallId: string;
  name: string;
  result: string;
}

/** La respuesta a un `tool-calls`: un resultado por cada herramienta pedida, con su id y su nombre. */
export function respuestaHerramientas(resultados: ResultadoHerramienta[]): { results: ResultadoHerramienta[] } {
  return { results: resultados };
}

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function leerLlamada(m: Objeto): LlamadaVapi | null {
  const call = esObjeto(m.call) ? m.call : null;
  const id = texto(call?.id);
  if (!call || !id) return null;
  const asistente = esObjeto(m.assistant) ? m.assistant : {};
  const cliente = esObjeto(call.customer) ? call.customer : esObjeto(m.customer) ? m.customer : {};
  const asistenteId = texto(call.assistantId) ?? texto(asistente.id);
  if (!asistenteId) throw new ErrorDeContrato("El mensaje de Vapi no dice de qué asistente es (ni call.assistantId ni assistant.id).");
  const numeroCliente = texto(cliente.number);
  return { id, tipo: texto(call.type) ?? "desconocido", asistenteId, ...(numeroCliente ? { numeroCliente } : {}) };
}

function leerArgumentos(bruto: unknown, nombre: string): Record<string, unknown> {
  if (bruto === undefined || bruto === null || bruto === "") return {};
  if (esObjeto(bruto)) return bruto;
  // En el historial de la llamada van como texto JSON; si algún día llegan así al webhook, también valen.
  if (typeof bruto === "string") {
    try {
      const v: unknown = JSON.parse(bruto);
      if (esObjeto(v)) return v;
    } catch {
      // cae al error de abajo
    }
  }
  throw new ErrorDeContrato(`Los argumentos de «${nombre}» no son un objeto: ${JSON.stringify(bruto).slice(0, 120)}`);
}

/** Lee el cuerpo de un POST de Vapi. Falla con ErrorDeContrato si la forma no es la del fixture. */
export function leerMensaje(cuerpo: unknown): MensajeVapi {
  const m = esObjeto(cuerpo) && esObjeto(cuerpo.message) ? cuerpo.message : null;
  if (!m) throw new ErrorDeContrato("El cuerpo no trae `message`.");
  const tipo = texto(m.type);
  if (!tipo) throw new ErrorDeContrato("El mensaje no trae `type`.");

  if (tipo === "tool-calls") {
    const llamada = leerLlamada(m);
    if (!llamada) throw new ErrorDeContrato("Un tool-calls sin `call.id`.");
    if (!Array.isArray(m.toolCallList)) throw new ErrorDeContrato("Un tool-calls sin `toolCallList`: la forma ha cambiado.");
    const herramientas = m.toolCallList.map((t: unknown, i): PeticionHerramienta => {
      const f = esObjeto(t) && esObjeto(t.function) ? t.function : null;
      const id = esObjeto(t) ? texto(t.id) : undefined;
      const nombre = texto(f?.name);
      if (!id || !nombre) throw new ErrorDeContrato(`toolCallList[${i}] sin \`id\` o sin \`function.name\`: la forma ha cambiado.`);
      return { id, nombre, argumentos: leerArgumentos(f!.arguments, nombre) };
    });
    return { tipo, llamada, herramientas };
  }

  if (tipo === "end-of-call-report") {
    const llamada = leerLlamada(m);
    if (!llamada) throw new ErrorDeContrato("Un end-of-call-report sin `call.id`.");
    const artefacto = esObjeto(m.artifact) ? m.artifact : {};
    const desglose = esObjeto(m.costBreakdown) ? m.costBreakdown : {};
    return {
      tipo,
      llamada,
      coste: numero(m.cost) ?? numero(desglose.total),
      duracionSegundos: numero(m.durationSeconds),
      inicio: texto(m.startedAt) ?? null,
      fin: texto(m.endedAt) ?? null,
      motivoFin: texto(m.endedReason) ?? "",
      transcripcion: texto(m.transcript) ?? texto(artefacto.transcript) ?? "",
    };
  }

  return { tipo: "otro", nombre: tipo, llamada: leerLlamada(m) };
}
