// Prueba de humo de la cadena ENTERA contra los servicios de verdad (Upstash, Google Calendar, la hoja
// de Dentalvis y Gemini), sin Vapi y sin llamada: se le pasan al webhook los mismos POST que mandaría
// Vapi, con un ID de llamada de prueba, y se mide cuánto tarda cada herramienta (eso es lo que el
// paciente oye como silencio). Al final lo borra todo con limpiar-pruebas, salvo que se diga --dejar.
//
//   npm run humo              (la cita va a un martes de dentro de unas semanas, a las 13:00)
//   npm run humo -- --dejar   (no borra: para mirar el evento y las filas a mano)

import { randomUUID } from "node:crypto";
import { hoy, sumarDias, diaDeLaSemana } from "../src/agenda/tiempo.js";
import { cargarFicha } from "../src/compilador/ciclo.js";
import { variableObligatoria } from "../src/entorno.js";
import { dependenciasDeVerdad } from "../src/vapi/dependencias.js";
import { atender } from "../src/vapi/webhook.js";
import { limpiarLlamadas } from "./limpiar-pruebas.js";

const dejar = process.argv.includes("--dejar");
const asistente = cargarFicha("dentalvis-pruebas").assistantId;
const llamada = `prueba-humo-${randomUUID()}`;
const secreto = variableObligatoria("VAPI_WEBHOOK_SECRET");
const dep = dependenciasDeVerdad();

let fecha = sumarDias(hoy("Europe/Madrid"), 21);
while (diaDeLaSemana(fecha) !== "martes") fecha = sumarDias(fecha, 1);

const call = { id: llamada, type: "webCall", assistantId: asistente };
let n = 0;
async function herramienta(nombre: string, argumentos: Record<string, unknown>): Promise<string> {
  const cuerpo = { message: { type: "tool-calls", call, toolCallList: [{ id: `humo_${++n}`, type: "function", function: { name: nombre, arguments: argumentos } }] } };
  const empieza = Date.now();
  const r = await atender(new Request("http://localhost/api/vapi", { method: "POST", headers: { authorization: `Bearer ${secreto}` }, body: JSON.stringify(cuerpo) }), dep);
  const j = (await r.json()) as { results: { result: string }[] };
  console.log(`\n▶ ${nombre} ${JSON.stringify(argumentos)} — ${Date.now() - empieza} ms\n  ${j.results[0]!.result}`);
  return j.results[0]!.result;
}

console.log(`Llamada de prueba ${llamada} al asistente de pruebas; cita para el ${fecha}.`);
try {
  await herramienta("consultar_huecos", { tratamiento: "limpieza", fecha, hora: "13:00" });
  await herramienta("anotar", { nombre: "Prueba", apellidos: "De Humo", telefono: "600000001" });
  await herramienta("crear_cita", { hora: "13:00" });
  await herramienta("escalar_a_recepcion", { motivo: "sin resolver", detalle: "Prueba de humo: pregunta por el parking" });

  const informe = {
    message: {
      type: "end-of-call-report", call, cost: 0.0123, durationSeconds: 61.4, startedAt: new Date(Date.now() - 61_400).toISOString(),
      endedAt: new Date().toISOString(), endedReason: "assistant-ended-call",
      transcript: `AI: Clínica Dentalvis, le atiende Diego.\nUser: Quería una limpieza el martes ${fecha} a la una.\nAI: Tengo libre a la una. ¿Su nombre?\nUser: Prueba De Humo.\nAI: Queda citado. ¿Algo más?\nUser: ¿Dónde se aparca?\nAI: Le paso el aviso a recepción.`,
    },
  };
  const empieza = Date.now();
  const r = await atender(new Request("http://localhost/api/vapi", { method: "POST", headers: { authorization: `Bearer ${secreto}` }, body: JSON.stringify(informe) }), dep);
  console.log(`\n▶ end-of-call-report — ${r.status} en ${Date.now() - empieza} ms`);

  const quedo = await limpiarLlamadas("dentalvis", [llamada], false);
  console.log(`\nLo que ha quedado escrito:\n  ${quedo.join("\n  ")}`);
} finally {
  if (!dejar) {
    const borrado = await limpiarLlamadas("dentalvis", [llamada], true);
    console.log(`\nLimpieza:\n  ${borrado.join("\n  ")}`);
  } else {
    console.log(`\nNo se borra (--dejar). Para borrarlo: npm run limpiar-pruebas -- --borrar ${llamada}`);
  }
}
