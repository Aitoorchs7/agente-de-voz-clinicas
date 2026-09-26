// Del contenido filtrado de la hoja al texto que se publica. Función pura: no lee la red ni el disco.
//
// Dos mundos de {{...}} que comparten sintaxis y no comparten dueño (PLAN.md §5):
// - Los del compilador ({{clinica}}, {{faq}}, …) se rellenan aquí, desde la hoja.
// - Los de Vapi ({{customer.number}}, {{"now" | date: …}}) se dejan INTACTOS: los resuelve Vapi en
//   cada llamada. Si se resolvieran aquí, el bot se quedaría con la hora del momento de compilar.
// Cualquier otro {{...}} que quede es un error y no se publica: Vapi no documenta qué hace con una
// variable que no conoce, y no vamos a averiguarlo con una clínica al teléfono.

import { CLAVES_CONFIG, CLAVES_CON_HUECO_PROPIO, DIAS, normalizar } from "../hoja/esquema.js";
import type { FichaLeida, Pregunta, Tramo, Tratamiento, FilaConfig } from "../hoja/lector.js";
import type { Bloque, PlantillaMensaje, Trato } from "./bloques.js";
import { comprobarQueNoSeCuela, filtrar, type Contador } from "./filtro.js";

export class ErrorDeRender extends Error {
  override name = "ErrorDeRender";
}

export interface Compilado {
  prompt: string;
  firstMessage: string;
  endCallMessage: string;
  voicemailMessage: string;
  contadores: Contador[];
  tramos: number;
  avisos: string[];
}

export interface ContenidoDelBot {
  bloques: Bloque[];
  mensajes: PlantillaMensaje[];
}

export function compilarFicha(ficha: FichaLeida, contenido: ContenidoDelBot): Compilado {
  const avisos = [...ficha.avisos];

  // 1. Filtrar ANTES de construir nada. Lo que no esté en `cargadas` no llega a las funciones de abajo.
  const config = filtrar("Config", ficha.config);
  const tratamientos = filtrar("Tratamientos", ficha.tratamientos);
  const faq = filtrar("FAQ", ficha.faq);
  for (const r of [config, tratamientos, faq]) {
    if (r.sinMarcar.length) {
      avisos.push(
        `${r.contador.pestana}: ${r.sinMarcar.length} fila(s) con algo escrito y la columna «público» vacía ` +
          `(${r.sinMarcar.map((f) => `fila ${f.fila}`).join(", ")}). No se han cargado.`,
      );
    }
  }

  // 2. Rellenar huecos, solo con lo cargado.
  const cfg = leerConfigPublica(config.cargadas);
  const huecos: Record<string, string> = {
    clinica: cfg.nombre_clinica,
    bot: cfg.nombre_bot,
    trato: cfg.trato === "usted" ? "Trata siempre de usted a quien llama." : "Tutea a quien llama.",
    privacidad: cfg.privacidad,
    datos: renderDatos(config.cargadas),
    tratamientos: renderTratamientos(tratamientos.cargadas),
    faq: renderFaq(faq.cargadas),
    horario: renderHorario(ficha.horarios),
    ahora: `{{"now" | date: "%Y-%m-%d %H:%M", "${cfg.zona_horaria}"}}`,
    dia_semana: `{{"now" | date: "%A", "${cfg.zona_horaria}"}}`,
  };

  const prompt = contenido.bloques
    .map((b) => rellenar(b.cuerpo, huecos, `el bloque «${b.fichero}»`))
    .join("\n\n---\n\n");

  const mensaje = (campo: PlantillaMensaje["campo"]) => {
    const p = contenido.mensajes.find((m) => m.campo === campo);
    if (!p) throw new ErrorDeRender(`Falta la plantilla de ${campo}`);
    return rellenar(p.variantes[cfg.trato], huecos, `la plantilla de ${campo}`);
  };

  const compilado: Compilado = {
    prompt,
    firstMessage: mensaje("firstMessage"),
    endCallMessage: mensaje("endCallMessage"),
    voicemailMessage: mensaje("voicemailMessage"),
    contadores: [config.contador, tratamientos.contador, faq.contador],
    tramos: ficha.horarios.length,
    avisos,
  };

  // 3. Segunda red: nada de lo excluido puede aparecer en lo que se va a publicar.
  const excluidos = [
    ...[...config.confidenciales, ...config.sinMarcar].map((f) => ({ donde: `Config fila ${f.fila}`, texto: f.valor })),
    ...[...tratamientos.confidenciales, ...tratamientos.sinMarcar].flatMap((f) => [
      { donde: `Tratamientos fila ${f.fila}`, texto: f.nombre },
      { donde: `Tratamientos fila ${f.fila}`, texto: f.frase },
    ]),
    ...[...faq.confidenciales, ...faq.sinMarcar].flatMap((f) => [
      { donde: `FAQ fila ${f.fila}`, texto: f.respuesta },
      { donde: `FAQ fila ${f.fila}`, texto: f.pregunta },
    ]),
  ];
  comprobarQueNoSeCuela(
    [compilado.prompt, compilado.firstMessage, compilado.endCallMessage, compilado.voicemailMessage].join("\n"),
    excluidos,
  );
  return compilado;
}

// ---------------------------------------------------------------------------------------------

const VARIABLE_DE_VAPI = /^(now|date|time|month|day|year|customer\.number|phoneNumber\.number|phoneNumber\.name|call\.id|call\.type)$/;
const FECHA_DE_VAPI = /^"now"\s*\|\s*date:\s*"[^"]*"\s*,\s*"[A-Za-z_]+(?:\/[A-Za-z_+-]+)*"$/;

export function rellenar(texto: string, huecos: Record<string, string>, donde: string): string {
  if (/\{%|%\}/.test(texto)) throw new ErrorDeRender(`${donde} tiene una etiqueta {% %}; no se usan aquí`);
  const resultado = texto.replace(/\{\{\s*([A-Za-z_][\w.]*)\s*\}\}/g, (entero, nombre: string) => {
    if (Object.hasOwn(huecos, nombre)) return huecos[nombre]!;
    if (VARIABLE_DE_VAPI.test(nombre)) return entero;
    throw new ErrorDeRender(`${donde} tiene un hueco que no existe: {{${nombre}}}`);
  });
  for (const [, dentro] of resultado.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    const t = dentro!.trim();
    if (!VARIABLE_DE_VAPI.test(t) && !FECHA_DE_VAPI.test(t)) {
      throw new ErrorDeRender(`${donde} deja sin resolver {{${t}}}, que no es ni del compilador ni de Vapi`);
    }
  }
  return resultado;
}

/**
 * Todo texto que sale de la hoja pasa por aquí antes de entrar en el prompt. Vapi procesa el prompt
 * con LiquidJS en cada llamada: unas llaves en una respuesta de la FAQ podrían romperlo o ejecutarse.
 */
function deLaHoja(valor: string, donde: string): string {
  if (/\{\{|\}\}|\{%|%\}/.test(valor)) {
    throw new ErrorDeRender(`${donde}: el texto lleva llaves ({{ }} o {% %}), que el asistente interpretaría como código. Quítalas.`);
  }
  return valor.replace(/\s*\n\s*/g, " ").trim();
}

interface ConfigPublica {
  nombre_clinica: string;
  nombre_bot: string;
  trato: Trato;
  zona_horaria: string;
  telefono_recepcion: string;
  privacidad: string;
}

function leerConfigPublica(cargadas: FilaConfig[]): ConfigPublica {
  const porClave = new Map<string, FilaConfig>();
  for (const f of cargadas) {
    if (!f.clave) throw new ErrorDeRender(`Config fila ${f.fila}: es pública pero no tiene clave.`);
    const clave = normalizar(f.clave);
    if (porClave.has(clave)) throw new ErrorDeRender(`Config: la clave «${f.clave}» está dos veces (filas ${porClave.get(clave)!.fila} y ${f.fila}).`);
    porClave.set(clave, f);
  }
  const valor = (clave: string) => {
    const f = porClave.get(normalizar(clave));
    if (!f || !f.valor) {
      throw new ErrorDeRender(`Config: falta «${clave}», o no está marcada como pública. Es obligatoria para compilar.`);
    }
    return deLaHoja(f.valor, `Config fila ${f.fila}`);
  };

  const obligatorias = Object.entries(CLAVES_CONFIG).filter(([, v]) => v.obligatoria).map(([k]) => k);
  const cfg = Object.fromEntries(obligatorias.map((k) => [k, valor(k)])) as Record<string, string>;

  const trato = normalizar(cfg.trato!);
  const tratoOk: Trato | null = trato === "usted" ? "usted" : ["tu", "tutear", "tuteo"].includes(trato) ? "tú" : null;
  if (!tratoOk) throw new ErrorDeRender(`Config: «trato» tiene que ser «usted» o «tú», y es «${cfg.trato}».`);

  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: cfg.zona_horaria });
  } catch {
    throw new ErrorDeRender(`Config: «${cfg.zona_horaria}» no es una zona horaria válida (en la península es Europe/Madrid).`);
  }
  if (/:\/\/|^www\.|https?/i.test(cfg.privacidad!)) {
    throw new ErrorDeRender("Config: «privacidad» tiene que ser una frase para decir en voz alta, no un enlace.");
  }
  return { ...(cfg as unknown as ConfigPublica), trato: tratoOk };
}

const ETIQUETAS: Record<string, string> = {
  telefonorecepcion: "Teléfono de recepción",
  direccion: "Dirección",
  parking: "Parking",
  accesibilidad: "Accesibilidad",
  mensajeurgencia: "Qué decir si alguien llama con algo grave",
};

function renderDatos(cargadas: FilaConfig[]): string {
  const propias = new Set<string>(CLAVES_CON_HUECO_PROPIO.map((k) => normalizar(k)));
  const lineas = cargadas
    .filter((f) => !propias.has(normalizar(f.clave)) && f.valor)
    .map((f) => {
      const k = normalizar(f.clave);
      const etiqueta = ETIQUETAS[k] ?? f.clave.replace(/_/g, " ").replace(/^./, (l) => l.toUpperCase());
      return `- ${etiqueta}: ${deLaHoja(f.valor, `Config fila ${f.fila}`)}`;
    });
  return lineas.join("\n");
}

function renderTratamientos(cargadas: Tratamiento[]): string {
  if (!cargadas.length) throw new ErrorDeRender("Tratamientos: no hay ninguno público. Un asistente sin tratamientos no puede dar citas.");
  return cargadas
    .map((t) => {
      if (!t.nombre) throw new ErrorDeRender(`Tratamientos fila ${t.fila}: es pública pero no tiene nombre.`);
      if (t.duracionMin === null) {
        throw new ErrorDeRender(`Tratamientos fila ${t.fila}: la duración tiene que ser un número de minutos, y es «${t.duracionTexto}».`);
      }
      const frase = t.frase ? ` ${deLaHoja(t.frase, `Tratamientos fila ${t.fila}`)}` : "";
      return `- ${deLaHoja(t.nombre, `Tratamientos fila ${t.fila}`)}: dura ${t.duracionMin} minutos.${frase}`;
    })
    .join("\n");
}

function renderFaq(cargadas: Pregunta[]): string {
  return cargadas
    .map((p) => {
      if (!p.pregunta || !p.respuesta) {
        throw new ErrorDeRender(`FAQ fila ${p.fila}: es pública pero le falta la pregunta o la respuesta aprobada.`);
      }
      return `- Si preguntan: ${deLaHoja(p.pregunta, `FAQ fila ${p.fila}`)}\n  Respuesta aprobada: ${deLaHoja(p.respuesta, `FAQ fila ${p.fila}`)}`;
    })
    .join("\n");
}

function renderHorario(tramos: Tramo[]): string {
  if (!tramos.length) throw new ErrorDeRender("Horarios: está vacío. El asistente diría que la clínica está siempre cerrada.");
  return DIAS.map((dia) => {
    const deHoy = tramos.filter((t) => t.dia === dia).sort((a, b) => a.deMin - b.deMin);
    for (let i = 1; i < deHoy.length; i++) {
      if (deHoy[i]!.deMin < deHoy[i - 1]!.aMin) {
        throw new ErrorDeRender(`Horarios: los tramos del ${dia} se pisan (filas ${deHoy[i - 1]!.fila} y ${deHoy[i]!.fila}).`);
      }
    }
    const nombre = dia[0]!.toUpperCase() + dia.slice(1);
    if (!deHoy.length) return `- ${nombre}: cerrado`;
    return `- ${nombre}: ${deHoy.map((t) => `de ${t.de} a ${t.a}`).join(" y ")}`;
  }).join("\n");
}
