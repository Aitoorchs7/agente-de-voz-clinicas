// El ÚNICO webhook de Vapi en Vercel (PLAN.md §6, ORQUESTACION.md): herramientas propias y fin de llamada.
// Todo lo que hace está en src/vapi/webhook.ts; aquí solo se engancha con las dependencias de verdad.
// En local, lo mismo lo sirve scripts/servidor-local.ts detrás del túnel.

import { dependenciasDeVerdad } from "../src/vapi/dependencias.js";
import { atender } from "../src/vapi/webhook.js";

export async function POST(request: Request): Promise<Response> {
  return atender(request, dependenciasDeVerdad());
}
