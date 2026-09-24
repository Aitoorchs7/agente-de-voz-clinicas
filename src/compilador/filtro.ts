// El filtro de `público` y el contador son la misma pieza (PLAN.md §2: «el filtro no es una promesa,
// es un contador»). El contador no se lleva aparte: sale de contar las listas que produce el filtro,
// y el render solo recibe la lista `cargadas`. No hay forma de activar uno sin el otro.
//
// Reglas, de la más estricta a la menos:
// - Valor escrito que no es ni «sí» ni «no» («pendiente», «x», «TRUE») → se ABORTA todo.
// - «no» → la fila no sale de aquí.
// - Celda vacía en una fila con algo escrito → la fila NO se carga y se cuenta como «sin marcar».
//   Es lo que hace una nota suelta bajo la tabla; el compilador sobrevive a ella sin publicarla.
// - «sí» (con o sin tilde, en mayúsculas, con espacios) → la fila entra.

import { normalizar } from "../hoja/esquema.js";

export class ErrorDeFiltro extends Error {
  override name = "ErrorDeFiltro";
}

export type Clasificacion = "sí" | "no" | "vacío" | "desconocido";

export function clasificarPublico(valor: string): Clasificacion {
  const v = normalizar(valor);
  if (v === "") return "vacío";
  if (v === "si") return "sí";
  if (v === "no") return "no";
  return "desconocido";
}

export interface FilaConPublico {
  fila: number;
  publico: string;
}

export interface Contador {
  pestana: string;
  leidas: number;
  cargadas: number;
  confidenciales: number;
  sinMarcar: number;
}

export interface ResultadoFiltro<T> {
  cargadas: T[];
  confidenciales: T[];
  sinMarcar: T[];
  contador: Contador;
}

export function filtrar<T extends FilaConPublico>(pestana: string, filas: readonly T[]): ResultadoFiltro<T> {
  const cargadas: T[] = [];
  const confidenciales: T[] = [];
  const sinMarcar: T[] = [];
  const raras: string[] = [];

  for (const fila of filas) {
    const clase = clasificarPublico(fila.publico);
    if (clase === "sí") cargadas.push(fila);
    else if (clase === "no") confidenciales.push(fila);
    else if (clase === "vacío") sinMarcar.push(fila);
    else raras.push(`fila ${fila.fila} («${fila.publico}»)`);
  }

  if (raras.length) {
    throw new ErrorDeFiltro(
      `${pestana}: en la columna «público» solo vale «sí» o «no», y hay ${raras.join(", ")}. ` +
        `No publico nada hasta que se corrija.`,
    );
  }

  const contador: Contador = {
    pestana,
    leidas: filas.length,
    cargadas: cargadas.length,
    confidenciales: confidenciales.length,
    sinMarcar: sinMarcar.length,
  };
  if (contador.cargadas + contador.confidenciales + contador.sinMarcar !== contador.leidas) {
    throw new ErrorDeFiltro(`${pestana}: el conteo no cuadra (${JSON.stringify(contador)}). No publico.`);
  }
  return { cargadas, confidenciales, sinMarcar, contador };
}

/** «Tratamientos: 12 leídas, 11 cargadas · 1 confidencial». Pensado para leerse en voz alta. */
export function describirContador(c: Contador): string {
  const n = (cuantas: number, una: string, varias: string) => `${cuantas} ${cuantas === 1 ? una : varias}`;
  const extra: string[] = [];
  if (c.confidenciales) extra.push(n(c.confidenciales, "confidencial", "confidenciales"));
  if (c.sinMarcar) extra.push(`${c.sinMarcar} sin marcar`);
  return `${c.pestana}: ${n(c.leidas, "leída", "leídas")}, ${n(c.cargadas, "cargada", "cargadas")}${extra.length ? " · " + extra.join(" · ") : ""}`;
}

/**
 * Segunda red, después de renderizar: ningún texto de una fila excluida puede aparecer en lo que se
 * va a publicar. Solo se miran textos con cuerpo (≥ 12 letras) para no saltar con un «sí» o un «45».
 * Si una fila confidencial repite el texto de una pública, también para: es ambiguo y se decide a mano.
 */
export function comprobarQueNoSeCuela(publicado: string, excluidos: { donde: string; texto: string }[]): void {
  const salida = normalizar(publicado);
  const colados = excluidos.filter((e) => {
    const t = normalizar(e.texto);
    return t.length >= 12 && salida.includes(t);
  });
  if (colados.length) {
    throw new ErrorDeFiltro(
      `Un texto que no es público aparece en lo que se iba a publicar (${colados.map((c) => c.donde).join(", ")}). ` +
        `Puede que esté repetido en una fila pública. No publico.`,
    );
  }
}
