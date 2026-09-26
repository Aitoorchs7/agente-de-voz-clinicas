// EL webhook de Vapi (PLAN.md §6; `api/vapi.ts` en Vercel, `scripts/servidor-local.ts` en local). Un
// solo punto de entrada que reparte por `message.type`:
//
// - `tool-calls` → las herramientas propias, una detrás de otra (dos a la vez tocarían la misma ficha),
//   y un resultado por cada una con su `toolCallId` y su `name`.
// - `end-of-call-report` → el cierre de la llamada.
// - Cualquier otro → 200 y nada.
//
// Si una herramienta falla, no se devuelve un error HTTP: Vapi se lo pasaría al modelo como un texto en
// inglés y el bot se queda mudo (llamada del 26-sep). Se devuelve un resultado que dice qué hacer.

import type { BuscarClinica } from "../herramientas/clinica.js";
import { MANEJADORES, type Dependencias } from "../herramientas/manejadores.js";
import { cerrarLlamada } from "../llamada/cierre.js";
import type { Resumir } from "../llamada/resumen.js";
import { autorizado } from "./autenticacion.js";
import { ErrorDeContrato, leerMensaje, respuestaHerramientas, type ResultadoHerramienta } from "./contrato.js";

export interface DependenciasWebhook extends Dependencias {
  clinica: BuscarClinica;
  resumir: Resumir;
  secreto: string | undefined;
}

export const FALLO_TECNICO =
  "No ha funcionado por un fallo técnico, y no es culpa del paciente. No le digas que está hecho. Sigue lo que te dice el prompt para cuando algo falla.";
export const SIN_CLINICA =
  "Esta línea no está configurada para dar citas. Discúlpate y dile que llame a la clínica en su horario.";

const json = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8" } });

export async function atender(peticion: Request, dep: DependenciasWebhook): Promise<Response> {
  if (peticion.method !== "POST") return json(405, { error: "solo POST" });
  if (!dep.secreto) {
    dep.registrar("⚠ falta VAPI_WEBHOOK_SECRET: no se atiende nada");
    return json(500, { error: "servidor sin configurar" });
  }
  if (!autorizado(peticion.headers.get("authorization"), dep.secreto)) {
    dep.registrar("⚠ petición sin la credencial correcta: rechazada");
    return json(401, { error: "no autorizado" });
  }

  let mensaje;
  try {
    mensaje = leerMensaje(await peticion.json());
  } catch (e) {
    dep.registrar(`⚠ mensaje de Vapi ilegible: ${(e as Error).message}`);
    return json(400, { error: e instanceof ErrorDeContrato ? e.message : "cuerpo que no es JSON" });
  }

  if (mensaje.tipo === "tool-calls") {
    const clinica = await dep.clinica(mensaje.llamada.asistenteId).catch((e: Error) => {
      dep.registrar(`⚠ no se ha podido leer la clínica: ${e.message}`);
      return undefined;
    });
    const resultados: ResultadoHerramienta[] = [];
    for (const h of mensaje.herramientas) {
      let result: string;
      const empieza = Date.now();
      const manejador = MANEJADORES[h.nombre];
      if (clinica === null) result = SIN_CLINICA;
      else if (!clinica) result = FALLO_TECNICO;
      else if (!manejador) result = `No conozco la herramienta «${h.nombre}».`;
      else {
        try {
          result = await manejador({ llamada: mensaje.llamada, clinica, dep }, h.argumentos);
        } catch (e) {
          dep.registrar(`⚠ ${mensaje.llamada.id.slice(0, 8)} · ${h.nombre} falló: ${(e as Error).message}`);
          result = FALLO_TECNICO;
        }
      }
      dep.registrar(`${mensaje.llamada.id.slice(0, 8)} · ${h.nombre} · ${Date.now() - empieza} ms`);
      resultados.push({ toolCallId: h.id, name: h.nombre, result });
    }
    return json(200, respuestaHerramientas(resultados));
  }

  if (mensaje.tipo === "end-of-call-report") {
    try {
      const clinica = await dep.clinica(mensaje.llamada.asistenteId);
      if (!clinica) {
        dep.registrar(`⚠ informe de una llamada de un asistente sin ficha (${mensaje.llamada.asistenteId})`);
        return json(200, {});
      }
      await cerrarLlamada(mensaje, clinica, dep);
    } catch (e) {
      // Vapi no reintenta: queda en el registro, y el coste se puede recuperar con GET /call.
      dep.registrar(`⚠ ${mensaje.llamada.id.slice(0, 8)} · al colgar falló: ${(e as Error).message}`);
      return json(500, { error: "no se ha podido cerrar la llamada" });
    }
    return json(200, {});
  }

  return json(200, {});
}
