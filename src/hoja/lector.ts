// El lector de la hoja de una clínica. Lo usan el compilador (Fase 2) y las herramientas (Fase 3):
// hay UN solo lector para que la misma columna no se interprete de dos formas.
//
// Lo que garantiza:
// - Las columnas se encuentran por su cabecera (primera fila), no por su letra.
// - Solo se leen las columnas conocidas. Una columna que la clínica añada por su cuenta («margen»,
//   «comentarios») no sale nunca de aquí, y por tanto nunca llega al prompt.
// - Una nota suelta en una columna sin cabecera se ignora. Una fila en blanco se salta.
// - NO filtra por `público`: devuelve el valor tal cual. Filtrar es cosa del compilador, que es
//   donde se cuenta (src/compilador/filtro.ts). Las herramientas de la Fase 3 también deben pasar
//   por ese filtro antes de decirle nada al paciente.

import { tokenDeAcceso, ALCANCE_HOJAS } from "../google/cuenta-servicio.js";
import { DIAS, PESTANAS, normalizar, type Dia, type Pestana } from "./esquema.js";

export class ErrorDeHoja extends Error {
  override name = "ErrorDeHoja";
}

export interface FilaConfig {
  fila: number;
  clave: string;
  valor: string;
  publico: string;
  comentario: string;
}

export interface Tratamiento {
  fila: number;
  codigo: string;
  nombre: string;
  /** null si la celda no es un número de minutos. */
  duracionMin: number | null;
  duracionTexto: string;
  gabinete: string;
  frase: string;
  publico: string;
}

export interface Pregunta {
  fila: number;
  pregunta: string;
  respuesta: string;
  categoria: string;
  publico: string;
}

export interface Tramo {
  fila: number;
  dia: Dia;
  /** «09:00» */
  de: string;
  a: string;
  /** Minutos desde medianoche, para comparar. */
  deMin: number;
  aMin: number;
}

export interface FichaLeida {
  spreadsheetId: string;
  titulo: string;
  config: FilaConfig[];
  tratamientos: Tratamiento[];
  faq: Pregunta[];
  horarios: Tramo[];
  /** Cosas raras que no impiden leer, para el registro. */
  avisos: string[];
}

export interface FilaCruda {
  /** Número de fila en la hoja (la cabecera es la 1). */
  numero: number;
  /** Clave: cabecera normalizada. Valor: texto de la celda, recortado. */
  valores: Record<string, string>;
}

/**
 * Convierte la matriz de valores de una pestaña en filas con nombre de columna. Pura, sin red: es la
 * parte que se prueba con notas sueltas, columnas movidas y cabeceras duplicadas.
 */
export function interpretarTabla(pestana: Pestana, valores: string[][]): FilaCruda[] {
  const cabeceras = (valores[0] ?? []).map((c) => normalizar(String(c ?? "")));
  const conocidas = new Map(pestana.columnas.map((c) => [normalizar(c), c]));

  const posicion = new Map<string, number>();
  cabeceras.forEach((c, i) => {
    if (!conocidas.has(c)) return;
    if (posicion.has(c)) {
      throw new ErrorDeHoja(
        `La pestaña ${pestana.nombre} tiene dos columnas «${conocidas.get(c)}». No sé cuál vale, así que no sigo.`,
      );
    }
    posicion.set(c, i);
  });

  const faltan = pestana.obligatorias.filter((c) => !posicion.has(normalizar(c)));
  if (faltan.length) {
    throw new ErrorDeHoja(
      `A la pestaña ${pestana.nombre} le falta la columna ${faltan.map((c) => `«${c}»`).join(", ")} ` +
        `en la primera fila. Sin ella no se puede leer con seguridad.`,
    );
  }

  const filas: FilaCruda[] = [];
  valores.slice(1).forEach((linea, i) => {
    const fila: Record<string, string> = {};
    let algo = false;
    for (const [clave, pos] of posicion) {
      const texto = String(linea[pos] ?? "").trim();
      fila[clave] = texto;
      if (texto) algo = true;
    }
    if (algo) filas.push({ numero: i + 2, valores: fila });
  });
  return filas;
}

const c = (fila: FilaCruda, columna: string) => fila.valores[normalizar(columna)] ?? "";

export function leerConfig(filas: FilaCruda[]): FilaConfig[] {
  return filas.map((f) => ({
    fila: f.numero,
    clave: c(f, "clave"),
    valor: c(f, "valor"),
    publico: c(f, "público"),
    comentario: c(f, "comentario"),
  }));
}

export function leerTratamientos(filas: FilaCruda[]): Tratamiento[] {
  return filas.map((f) => ({
    fila: f.numero,
    codigo: c(f, "código"),
    nombre: c(f, "nombre"),
    duracionMin: minutos(c(f, "duracion_min")),
    duracionTexto: c(f, "duracion_min"),
    gabinete: c(f, "gabinete"),
    frase: c(f, "frase_para_el_bot"),
    publico: c(f, "público"),
  }));
}

export function leerFaq(filas: FilaCruda[]): Pregunta[] {
  return filas.map((f) => ({
    fila: f.numero,
    pregunta: c(f, "pregunta"),
    respuesta: c(f, "respuesta"),
    categoria: c(f, "categoría"),
    publico: c(f, "público"),
  }));
}

/**
 * `Horarios` no tiene columna `público`: todo lo que hay se publica. Por eso aquí se es estricto.
 * Una fila con día y horas mal escritos para la compilación. La única excepción es una nota suelta
 * (texto en la columna del día y las dos horas vacías), que se ignora con aviso.
 */
export function leerHorarios(filas: FilaCruda[], avisos: string[]): Tramo[] {
  const tramos: Tramo[] = [];
  for (const f of filas) {
    const diaTexto = c(f, "día");
    const deTexto = c(f, "de");
    const aTexto = c(f, "a");
    const dia = DIAS.find((d) => normalizar(d) === normalizar(diaTexto));
    if (!dia && !deTexto && !aTexto) {
      avisos.push(`Horarios, fila ${f.numero}: «${diaTexto}» parece una nota suelta; no se ha tenido en cuenta.`);
      continue;
    }
    if (!dia) throw new ErrorDeHoja(`Horarios, fila ${f.numero}: «${diaTexto}» no es un día de la semana.`);
    const de = hora(deTexto);
    const a = hora(aTexto);
    if (!de || !a) {
      throw new ErrorDeHoja(`Horarios, fila ${f.numero}: las horas tienen que ir como 9:00 o 16:30 (hay «${deTexto}» y «${aTexto}»).`);
    }
    if (de.minutos >= a.minutos) {
      throw new ErrorDeHoja(`Horarios, fila ${f.numero}: el tramo de ${de.texto} a ${a.texto} acaba antes de empezar.`);
    }
    tramos.push({ fila: f.numero, dia, de: de.texto, a: a.texto, deMin: de.minutos, aMin: a.minutos });
  }
  return tramos;
}

export function minutos(texto: string): number | null {
  const m = texto.match(/^\s*(\d{1,3})(?:[.,]0+)?\s*(?:min|minutos)?\s*$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? n : null;
}

export function hora(texto: string): { texto: string; minutos: number } | null {
  const m = texto.trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { texto: `${String(h).padStart(2, "0")}:${m[2]}`, minutos: h * 60 + min };
}

// ---------------------------------------------------------------------------------------------
// Lectura de verdad, contra la API de Google Sheets.

export interface OpcionesLectura {
  token?: () => Promise<string>;
  fetch?: typeof fetch;
}

const PESTANAS_QUE_LEE_EL_COMPILADOR = [PESTANAS.config, PESTANAS.tratamientos, PESTANAS.faq, PESTANAS.horarios];

export async function leerFicha(spreadsheetId: string, opciones: OpcionesLectura = {}): Promise<FichaLeida> {
  const f = opciones.fetch ?? fetch;
  const token = await (opciones.token ?? (() => tokenDeAcceso([ALCANCE_HOJAS])))();
  const cabeceras = { Authorization: `Bearer ${token}` };
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;

  const meta = await pedir<{ properties: { title: string }; sheets: { properties: { title: string } }[] }>(
    f, `${base}?fields=properties.title,sheets.properties.title`, cabeceras,
  );
  const existentes = meta.sheets.map((s) => s.properties.title);
  const ausentes = PESTANAS_QUE_LEE_EL_COMPILADOR.filter((p) => !existentes.includes(p.nombre));
  if (ausentes.length) {
    throw new ErrorDeHoja(`A la hoja «${meta.properties.title}» le falta la pestaña ${ausentes.map((p) => p.nombre).join(", ")}.`);
  }

  // Rango cerrado de columnas (A:Z) y de filas: nunca «hasta donde haya datos».
  const rangos = PESTANAS_QUE_LEE_EL_COMPILADOR.map((p) => `'${p.nombre}'!A1:Z1000`);
  const params = new URLSearchParams({ valueRenderOption: "FORMATTED_VALUE", majorDimension: "ROWS" });
  for (const r of rangos) params.append("ranges", r);
  const lote = await pedir<{ valueRanges: { values?: string[][] }[] }>(f, `${base}/values:batchGet?${params}`, cabeceras);
  const [config, tratamientos, faq, horarios] = lote.valueRanges.map((v) => v.values ?? []);

  const avisos: string[] = [];
  return {
    spreadsheetId,
    titulo: meta.properties.title,
    config: leerConfig(interpretarTabla(PESTANAS.config, config ?? [])),
    tratamientos: leerTratamientos(interpretarTabla(PESTANAS.tratamientos, tratamientos ?? [])),
    faq: leerFaq(interpretarTabla(PESTANAS.faq, faq ?? [])),
    horarios: leerHorarios(interpretarTabla(PESTANAS.horarios, horarios ?? []), avisos),
    avisos,
  };
}

async function pedir<T>(f: typeof fetch, url: string, headers: Record<string, string>): Promise<T> {
  const r = await f(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) {
    const texto = await r.text();
    const detalle = texto.match(/"message":\s*"([^"]+)"/)?.[1] ?? texto.slice(0, 200);
    throw new ErrorDeHoja(`Google Sheets respondió ${r.status} al leer la hoja: ${detalle}`);
  }
  return (await r.json()) as T;
}
