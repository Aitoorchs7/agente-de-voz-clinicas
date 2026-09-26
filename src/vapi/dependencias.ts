// Las dependencias de verdad del webhook: Redis de Upstash, Google Calendar y Sheets con la cuenta de
// servicio, Gemini para el resumen. Se crean una vez por proceso (en Vercel, una instancia atiende muchas
// peticiones seguidas y así reutiliza el token de Google y la hoja leída).

import { agendaDeGoogle } from "../agenda/calendario.js";
import { bloqueosEnRedis } from "../bloqueo/bloqueos.js";
import { candadosEnRedis } from "../bloqueo/candado.js";
import { redisUpstash } from "../bloqueo/redis.js";
import { variable } from "../entorno.js";
import { buscadorDeClinicas } from "../herramientas/clinica.js";
import { escritorDeHoja } from "../hoja/escritor.js";
import { fichasEnRedis } from "../llamada/ficha.js";
import { resumenConGemini } from "../llamada/resumen.js";
import type { DependenciasWebhook } from "./webhook.js";

let unicas: DependenciasWebhook | null = null;

export function dependenciasDeVerdad(): DependenciasWebhook {
  if (unicas) return unicas;
  const redis = redisUpstash();
  const candados = candadosEnRedis(redis);
  unicas = {
    fichas: fichasEnRedis(redis),
    bloqueos: bloqueosEnRedis(redis),
    candados,
    agenda: agendaDeGoogle(),
    escritor: (spreadsheetId) => escritorDeHoja(spreadsheetId, { candados }),
    clinica: buscadorDeClinicas(),
    resumir: resumenConGemini(),
    ahora: () => new Date(),
    registrar: (linea) => console.log(`${new Date().toISOString()} · ${linea}`),
    secreto: variable("VAPI_WEBHOOK_SECRET"),
  };
  return unicas;
}
