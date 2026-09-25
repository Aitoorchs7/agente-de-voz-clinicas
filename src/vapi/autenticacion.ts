// Cómo sabe nuestro servidor que un POST viene de Vapi: una credencial de Vapi de tipo `bearer`
// (`server.credentialId`), que manda `Authorization: Bearer <secreto>` en cada petición. El secreto vive
// en VAPI_WEBHOOK_SECRET (en `.env` y, al desplegar, en Vercel); nunca en un `.md` ni en git.

import { timingSafeEqual } from "node:crypto";

export const NOMBRE_CREDENCIAL = "Webhook agente de voz";

/** El cuerpo de POST /credential. Comprobado contra la especificación OpenAPI de Vapi (25-sep-2026). */
export function cuerpoCredencial(secreto: string) {
  return {
    provider: "custom-credential",
    name: NOMBRE_CREDENCIAL,
    authenticationPlan: { type: "bearer", token: secreto, headerName: "Authorization", bearerPrefixEnabled: true },
  } as const;
}

/**
 * ¿La cabecera `Authorization` es la nuestra? Comparación en tiempo constante, para no dar pistas sobre
 * el secreto por lo que tarda en contestar. Sin secreto configurado no se autentica nada: se rechaza.
 */
export function autorizado(cabecera: string | null | undefined, secreto: string | undefined): boolean {
  if (!secreto || !cabecera) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(cabecera.trim());
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
