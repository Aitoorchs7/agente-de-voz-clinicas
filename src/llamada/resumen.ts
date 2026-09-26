// El resumen de la llamada, en español, para la pestaña `Llamadas`. El de Vapi sale en inglés
// (`analysis.summary`) y no se usa: se pide uno propio a Gemini con el modelo pequeño, que para esto
// sobra y cuesta una fracción de céntimo. Si falla, la fila se escribe igual, sin resumen.
//
// La clave va en la cabecera, no en la URL: una URL acaba en registros.

import { variable } from "../entorno.js";

export type Resumir = (transcripcion: string) => Promise<string>;

export const MODELO_RESUMEN = "gemini-3.1-flash-lite";

const INSTRUCCIONES =
  "Resume en español de España, en una o dos frases, esta llamada a una clínica dental. Di qué quería " +
  "quien llamaba y cómo acabó: cita (con tratamiento, día y hora), aviso a recepción (y por qué) o sin " +
  "resolver. Usa solo lo que está en la transcripción, sin añadir nada. Nada de saludos ni de comillas. " +
  "En la transcripción, «AI» es el asistente y «User» es quien llama.\n\nTranscripción:\n";

export function resumenConGemini(opciones: { clave?: string; fetch?: typeof fetch; modelo?: string } = {}): Resumir {
  const f = opciones.fetch ?? fetch;
  return async (transcripcion) => {
    const clave = opciones.clave ?? variable("GEMINI_API_KEY");
    if (!clave || !transcripcion.trim()) return "";
    const r = await f(`https://generativelanguage.googleapis.com/v1beta/models/${opciones.modelo ?? MODELO_RESUMEN}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: INSTRUCCIONES + transcripcion.slice(0, 30_000) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) throw new Error(`Gemini respondió ${r.status} al resumir`);
    const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  };
}
