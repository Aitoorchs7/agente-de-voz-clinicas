// Al colgar (`end-of-call-report`), en este orden:
//
// 1. Se sueltan los bloqueos de la llamada: una hora ofrecida y no cogida vuelve a estar libre YA, no a
//    los cuatro minutos.
// 2. Eventos huérfanos: si `crear_cita` creó el evento en Calendar pero no llegó a escribir la fila en
//    `Citas` (la función murió entre medias), el evento se borra. Una cita sin fila no existe para la
//    clínica, y el bot no le dijo al paciente que estaba citado (solo lo dice cuando las dos cosas
//    salen bien). Va bajo el mismo candado que `crear_cita`, para no borrar una que se está creando.
// 3. Se borra la ficha de la llamada.
// 4. Fila en `Llamadas`, con el coste REAL (`message.cost`), una sola vez por llamada.

import { enZona } from "../agenda/tiempo.js";
import type { Clinica } from "../herramientas/clinica.js";
import type { Dependencias } from "../herramientas/manejadores.js";
import { validarTelefono } from "../herramientas/validacion.js";
import { PESTANAS } from "../hoja/esquema.js";
import type { MensajeVapi } from "../vapi/contrato.js";
import type { Resumir } from "./resumen.js";

type Informe = Extract<MensajeVapi, { tipo: "end-of-call-report" }>;

/** Cómo acabó la llamada, en español. Lo que no está aquí se apunta tal cual lo dice Vapi. */
export const MOTIVOS_FIN: Record<string, string> = {
  "assistant-ended-call": "colgó el asistente",
  "customer-ended-call": "colgó quien llamaba",
  "silence-timed-out": "silencio",
  "exceeded-max-duration": "duración máxima",
  "assistant-forwarded-call": "pasada a recepción",
  voicemail: "buzón de voz",
  "customer-did-not-answer": "no contestó",
  "customer-busy": "comunicando",
};

/** Una celda de Sheets admite 50.000 caracteres. */
const MAX_TRANSCRIPCION = 45_000;

export async function cerrarLlamada(
  informe: Informe,
  clinica: Clinica,
  dep: Dependencias & { resumir: Resumir },
): Promise<{ fila: number; yaEstaba: boolean; huerfanos: number }> {
  const llamada = informe.llamada.id;
  const corto = llamada.slice(0, 8);

  const huerfanos = await dep.candados.con(`llamada:${llamada}`, async () => {
    await dep.bloqueos.soltar(llamada);
    let borrados = 0;
    const escritor = dep.escritor(clinica.ficha.spreadsheetId);
    for (const calendario of new Set(Object.values(clinica.ficha.calendarios))) {
      for (const id of await dep.agenda.deLaLlamada(calendario, llamada)) {
        if (await escritor.hay(PESTANAS.citas, "id_evento", id)) continue;
        await dep.agenda.borrar(calendario, id);
        borrados++;
        dep.registrar(`⚠ ${corto} · evento huérfano borrado al colgar (sin fila en Citas)`);
      }
    }
    await dep.fichas.borrar(llamada);
    return borrados;
  }, { esperaMs: 15_000, vidaMs: 30_000 });

  let resumen = "";
  try {
    resumen = await dep.resumir(informe.transcripcion);
  } catch (e) {
    dep.registrar(`⚠ ${corto} · sin resumen: ${(e as Error).message}`);
  }

  const inicio = informe.inicio ? enZona(new Date(informe.inicio), clinica.zona) : null;
  const numero = informe.llamada.numeroCliente ? validarTelefono(informe.llamada.numeroCliente) : null;
  const transcripcion = informe.transcripcion.length > MAX_TRANSCRIPCION
    ? `${informe.transcripcion.slice(0, MAX_TRANSCRIPCION)}\n[… recortada: la entera está en Vapi]`
    : informe.transcripcion;

  const r = await dep.escritor(clinica.ficha.spreadsheetId).escribir(
    PESTANAS.llamadas,
    {
      fecha: inicio ? `${inicio.fecha} ${inicio.hora}` : "",
      duracion: informe.duracionSegundos === null ? "" : Math.round(informe.duracionSegundos),
      telefono: numero?.ok ? numero.valor.cifras : "",
      resumen,
      transcripcion,
      motivo_fin: MOTIVOS_FIN[informe.motivoFin] ?? informe.motivoFin,
      coste: informe.coste === null ? "" : Math.round(informe.coste * 10_000) / 10_000,
      id_llamada: llamada,
    },
    { igual: ["id_llamada"] },
  );
  dep.registrar(`${corto} · al colgar · fila ${r.fila} en Llamadas${r.yaEstaba ? " (ya estaba)" : ""}, coste ${informe.coste ?? "?"} $`);
  return { ...r, huerfanos };
}
