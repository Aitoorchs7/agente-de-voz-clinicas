// Un ciclo completo: leer la hoja → filtrar y contar → compilar → publicar → dejarlo escrito.
// Lo usan los dos disparos: el manual (scripts/compilar.ts) y el bucle (scripts/vigilar.ts).

import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { ruta } from "../entorno.js";
import { leerFicha } from "../hoja/lector.js";
import { clienteVapi, type ClienteVapi } from "../vapi/cliente.js";
import { leerBloques, leerMensajes } from "./bloques.js";
import { describirContador } from "./filtro.js";
import { publicar, type ResultadoPublicacion } from "./publicar.js";
import { compilarFicha, type Compilado } from "./render.js";

/**
 * La «fila de identidad» de una clínica (PLAN.md §4): su hoja, su asistente y sus calendarios de Google,
 * uno por gabinete. La clave de `calendarios` es el nombre del gabinete tal como va en la columna
 * `gabinete` de Tratamientos; el valor, el ID del calendario.
 */
export interface Ficha {
  clinica: string;
  spreadsheetId: string;
  assistantId: string;
  calendarios: Record<string, string>;
}

export function cargarFicha(clinica: string): Ficha {
  const fichero = ruta("fichas", clinica, "ficha.json");
  if (!existsSync(fichero)) throw new Error(`No existe la ficha de «${clinica}» (${fichero})`);
  const f = JSON.parse(readFileSync(fichero, "utf8")) as Partial<Ficha>;
  if (!f.spreadsheetId || !f.assistantId) throw new Error(`La ficha de «${clinica}» tiene que tener spreadsheetId y assistantId`);
  const calendarios: Record<string, string> = {};
  for (const [gabinete, id] of Object.entries(f.calendarios ?? {})) {
    if (typeof id !== "string" || !id.includes("@")) throw new Error(`La ficha de «${clinica}»: el calendario de «${gabinete}» no es un ID de calendario`);
    calendarios[gabinete.trim()] = id.trim();
  }
  return { clinica, spreadsheetId: f.spreadsheetId, assistantId: f.assistantId, calendarios };
}

export interface ResultadoCiclo {
  ok: boolean;
  resumen: string;
  lineas: string[];
  compilado?: Compilado;
  publicacion?: ResultadoPublicacion;
}

export async function cicloDeCompilacion(
  clinica: string,
  opciones: { simular?: boolean; vapi?: ClienteVapi } = {},
): Promise<ResultadoCiclo> {
  const carpeta = ruta("registro");
  mkdirSync(carpeta, { recursive: true });
  const candado = cogerCandado(ruta("registro", `.compilando-${clinica}.lock`));
  if (!candado) {
    const r = { ok: true, resumen: "ya hay una compilación en marcha; esta se salta", lineas: [] };
    registrar(clinica, r.resumen, []);
    return r;
  }
  try {
    const ficha = cargarFicha(clinica);
    const leida = await leerFicha(ficha.spreadsheetId);
    const compilado = compilarFicha(leida, {
      bloques: leerBloques(),
      mensajes: leerMensajes(),
    });
    const lineas = [
      ...compilado.contadores.map(describirContador),
      `Horarios: ${compilado.tramos} tramos`,
      ...compilado.avisos.map((a) => `aviso: ${a}`),
    ];

    if (opciones.simular) writeFileSync(ruta("registro", `simulacion-${clinica}.md`), volcado(compilado), "utf8");

    const publicacion = await publicar(opciones.vapi ?? clienteVapi(), ficha.assistantId, compilado, { simular: opciones.simular });
    // Solo después de publicar (o de comprobar que ya estaba): este fichero dice lo que TIENE el asistente.
    if (!opciones.simular) writeFileSync(ruta("registro", `ultimo-prompt-${clinica}.md`), volcado(compilado), "utf8");
    lineas.push(...publicacion.avisos.map((a) => `aviso: ${a}`));
    const resumen =
      publicacion.estado === "publicado" ? `PUBLICADO (${publicacion.cambios.join(", ")})`
      : publicacion.estado === "simulado" ? `SIMULACIÓN: se publicaría ${publicacion.cambios.join(", ")}`
      : "sin cambios: el asistente ya tiene esto";
    registrar(clinica, resumen, lineas);
    return { ok: true, resumen, lineas, compilado, publicacion };
  } catch (e) {
    const resumen = `NO PUBLICADO — el asistente se queda como estaba. Motivo: ${(e as Error).message}`;
    registrar(clinica, resumen, []);
    return { ok: false, resumen, lineas: [] };
  } finally {
    soltarCandado(candado);
  }
}

function registrar(clinica: string, resumen: string, lineas: string[]): void {
  const cuando = new Date().toLocaleString("sv-SE");
  const texto = [`${cuando} · ${clinica} · ${resumen}`, ...lineas.map((l) => `    ${l}`)].join("\n") + "\n";
  appendFileSync(ruta("registro", "compilaciones.log"), texto, "utf8");
}

function volcado(c: Compilado): string {
  return [
    `<!-- Generado por el compilador. No se edita a mano: se cambia la hoja o los bloques. -->`,
    `## firstMessage\n\n${c.firstMessage}`,
    `## endCallMessage\n\n${c.endCallMessage}`,
    `## voicemailMessage\n\n${c.voicemailMessage}`,
    `## Prompt\n\n${c.prompt}`,
  ].join("\n\n");
}

// Candado para que el bucle y el botón manual no publiquen a la vez. Caduca a los tres minutos por
// si un proceso murió sin soltarlo.
function cogerCandado(fichero: string): string | null {
  for (let intento = 0; intento < 2; intento++) {
    try {
      closeSync(openSync(fichero, "wx"));
      return fichero;
    } catch {
      try {
        if (Date.now() - statSync(fichero).mtimeMs > 3 * 60_000) unlinkSync(fichero);
        else return null;
      } catch {
        // Se soltó justo entre medias: se vuelve a intentar.
      }
    }
  }
  return null;
}

function soltarCandado(fichero: string | null): void {
  if (fichero && existsSync(fichero)) unlinkSync(fichero);
}
