// La forma de la hoja de una clínica (PLAN.md §4). Es la única definición: la usan el lector, el
// compilador y el script que prepara hojas nuevas. Si la Fase 3 necesita una columna más, se añade
// AQUÍ y en la hoja, no en un segundo sitio.
//
// Las columnas se encuentran por el texto de la cabecera, no por su posición: si la clínica mueve
// una columna, el lector la sigue encontrando. La comparación ignora mayúsculas, tildes, espacios y
// guiones bajos, así que «Público», «publico» y «PÚBLICO » son la misma columna.

export interface Pestana {
  nombre: string;
  /** Cabeceras tal como se escriben en una hoja nueva, en este orden. */
  columnas: readonly string[];
  /** Las que tienen que estar sí o sí para poder leer la pestaña. */
  obligatorias: readonly string[];
}

export const PESTANAS = {
  config: {
    nombre: "Config",
    columnas: ["clave", "valor", "público", "comentario"],
    obligatorias: ["clave", "valor", "público"],
  },
  tratamientos: {
    nombre: "Tratamientos",
    columnas: ["código", "nombre", "duracion_min", "gabinete", "frase_para_el_bot", "público"],
    obligatorias: ["nombre", "duracion_min", "público"],
  },
  faq: {
    nombre: "FAQ",
    columnas: ["pregunta", "respuesta", "categoría", "público"],
    obligatorias: ["pregunta", "respuesta", "público"],
  },
  horarios: {
    nombre: "Horarios",
    columnas: ["día", "de", "a"],
    obligatorias: ["día", "de", "a"],
  },
  citas: {
    nombre: "Citas",
    columnas: [
      "fecha_creacion", "fecha_cita", "hora_cita", "duracion_min", "tratamiento", "gabinete",
      "paciente", "telefono", "quien_llama", "id_evento", "estado", "notas",
    ],
    obligatorias: [],
  },
  llamadas: {
    nombre: "Llamadas",
    columnas: ["fecha", "duracion", "telefono", "resumen", "transcripcion", "motivo_fin", "coste"],
    obligatorias: [],
  },
  escalados: {
    nombre: "Escalados",
    columnas: ["fecha", "telefono", "nombre", "motivo", "detalle", "estado"],
    obligatorias: [],
  },
} as const satisfies Record<string, Pestana>;

export const PESTANA_LEEME = "LÉEME";

/** Claves de `Config`. Las obligatorias hacen falta para compilar; las demás son opcionales. */
export const CLAVES_CONFIG = {
  nombre_clinica: { obligatoria: true, ayuda: "El nombre de la clínica, tal como lo dirá el asistente" },
  nombre_bot: { obligatoria: true, ayuda: "Cómo se llama el asistente" },
  trato: { obligatoria: true, ayuda: "usted o tú" },
  zona_horaria: { obligatoria: true, ayuda: "Zona horaria de la clínica. En la península: Europe/Madrid" },
  telefono_recepcion: { obligatoria: true, ayuda: "El teléfono que el asistente da cuando pasa a una persona" },
  privacidad: {
    obligatoria: true,
    ayuda: "Una frase corta para decir en voz alta sobre la política de privacidad. NO un enlace: por teléfono no se puede leer",
  },
  direccion: { obligatoria: false, ayuda: "Dirección de la clínica" },
  parking: { obligatoria: false, ayuda: "Dónde aparcar" },
  accesibilidad: { obligatoria: false, ayuda: "Escalones, ascensor, silla de ruedas" },
  mensaje_urgencia: { obligatoria: false, ayuda: "Qué decir si alguien llama con algo grave" },
} as const;

/** Claves que el compilador usa en su propio hueco y que por eso no se repiten en `{{datos}}`. */
export const CLAVES_CON_HUECO_PROPIO = ["nombre_clinica", "nombre_bot", "trato", "zona_horaria", "privacidad"] as const;

export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
export type Dia = (typeof DIAS)[number];

/** «Público», «publico », «PÚBLICO» → «publico». «duracion_min», «Duración (min)» → «duracionmin». */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
