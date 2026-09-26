// De qué clínica es una llamada y lo que las herramientas necesitan de su hoja.
//
// La clínica se encuentra por el asistente que atiende la llamada: cada `fichas/<clínica>/ficha.json`
// dice su asistente, su hoja y sus calendarios. La hoja se lee con EL lector (no hay otro) y se guarda
// un minuto en memoria: el paciente espera al teléfono y la hoja no cambia a mitad de una llamada.
//
// Los tratamientos pasan por `filtrar()`, como en el compilador: una herramienta solo nombra, busca y
// cita lo que tiene `público = sí`. Lo confidencial no se encuentra, así que tampoco se puede decir que
// existe. `zona_horaria` se lee de Config sin mirar `público` porque no se le dice a nadie: solo sirve
// para calcular.

import { existsSync, readdirSync } from "node:fs";
import { cargarFicha, type Ficha } from "../compilador/ciclo.js";
import { filtrar } from "../compilador/filtro.js";
import { ruta } from "../entorno.js";
import { normalizar } from "../hoja/esquema.js";
import { ErrorDeHoja, leerFicha, type FichaLeida, type Tramo, type Tratamiento } from "../hoja/lector.js";

export interface Clinica {
  ficha: Ficha;
  zona: string;
  /** Solo los de `público = sí`. */
  tratamientos: Tratamiento[];
  tramos: Tramo[];
}

export type BuscarClinica = (asistenteId: string) => Promise<Clinica | null>;

export function clinicaDeLaHoja(ficha: Ficha, leida: FichaLeida): Clinica {
  const zona = leida.config.find((c) => normalizar(c.clave) === "zonahoraria")?.valor.trim();
  if (!zona) throw new ErrorDeHoja(`La hoja de ${ficha.clinica} no tiene zona_horaria en Config.`);
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: zona });
  } catch {
    throw new ErrorDeHoja(`La zona_horaria de ${ficha.clinica} («${zona}») no es una zona horaria.`);
  }
  return { ficha, zona, tratamientos: filtrar("Tratamientos", leida.tratamientos).cargadas, tramos: leida.horarios };
}

/** Todas las fichas de `fichas/`, por su asistente. */
export function fichasPorAsistente(): Map<string, Ficha> {
  const carpeta = ruta("fichas");
  const mapa = new Map<string, Ficha>();
  if (!existsSync(carpeta)) return mapa;
  for (const nombre of readdirSync(carpeta)) {
    if (!existsSync(ruta("fichas", nombre, "ficha.json"))) continue;
    const f = cargarFicha(nombre);
    if (mapa.has(f.assistantId)) throw new Error(`Dos fichas con el mismo asistente (${f.assistantId}).`);
    mapa.set(f.assistantId, f);
  }
  return mapa;
}

export function buscadorDeClinicas(
  opciones: { fichas?: () => Map<string, Ficha>; leer?: (spreadsheetId: string) => Promise<FichaLeida>; vidaMs?: number; ahora?: () => number } = {},
): BuscarClinica {
  const vidaMs = opciones.vidaMs ?? 60_000;
  const ahora = opciones.ahora ?? Date.now;
  const leer = opciones.leer ?? ((id: string) => leerFicha(id));
  let fichas: Map<string, Ficha> | null = null;
  const guardadas = new Map<string, { clinica: Promise<Clinica>; hasta: number }>();
  return async (asistenteId) => {
    fichas ??= (opciones.fichas ?? fichasPorAsistente)();
    const ficha = fichas.get(asistenteId);
    if (!ficha) return null;
    const g = guardadas.get(ficha.spreadsheetId);
    if (g && g.hasta > ahora()) return g.clinica;
    const clinica = leer(ficha.spreadsheetId).then((leida) => clinicaDeLaHoja(ficha, leida));
    guardadas.set(ficha.spreadsheetId, { clinica, hasta: ahora() + vidaMs });
    clinica.catch(() => guardadas.delete(ficha.spreadsheetId)); // un fallo no se guarda
    return clinica;
  };
}

// --------------------------------------------------------------------------------------------------
// Encontrar el tratamiento que pide el paciente entre los públicos.

const DEBILES = new Set(["primera", "consulta", "visita", "dental", "bucal", "cita", "tratamiento"]);
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "una", "un", "unos", "para", "por", "o", "y", "a", "en", "con", "mi", "me"]);

const palabras = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 3 && !VACIAS.has(p));
const raiz = (p: string) => p.slice(0, 6);

export type Busqueda = { es: Tratamiento } | { varios: Tratamiento[] } | { ninguno: true };

export function buscarTratamiento(pedido: string, publicos: readonly Tratamiento[]): Busqueda {
  const n = normalizar(pedido);
  if (!n) return { ninguno: true };
  const exacto = publicos.find((t) => normalizar(t.codigo) === n || normalizar(t.nombre) === n);
  if (exacto) return { es: exacto };

  const pedidas = palabras(pedido);
  const puntos = publicos.map((t) => {
    const suyas = new Set(palabras(t.nombre).map(raiz));
    let fuertes = 0;
    let debiles = 0;
    for (const p of pedidas) {
      if (!suyas.has(raiz(p))) continue;
      if (DEBILES.has(p)) debiles++;
      else fuertes++;
    }
    return { t, fuertes, debiles };
  });
  const mejor = Math.max(...puntos.map((p) => p.fuertes));
  if (mejor > 0) {
    const empatados = puntos.filter((p) => p.fuertes === mejor);
    if (empatados.length === 1) return { es: empatados[0]!.t };
    const desempate = Math.max(...empatados.map((p) => p.debiles));
    const quedan = empatados.filter((p) => p.debiles === desempate);
    return quedan.length === 1 ? { es: quedan[0]!.t } : { varios: quedan.map((p) => p.t) };
  }
  const solo = puntos.filter((p) => p.debiles > 0);
  return solo.length ? { varios: solo.map((p) => p.t) } : { ninguno: true };
}
