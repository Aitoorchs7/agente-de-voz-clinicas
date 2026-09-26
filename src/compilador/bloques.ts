// Lectura de lo que el bot ES (PLAN.md §1): los bloques del prompt, las plantillas de los mensajes
// fijos del asistente y la descripción de la herramienta nativa de Sheets. Todo vive en `contenido/`
// y nada de ello lleva datos de una clínica: los datos llegan por huecos.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ruta } from "../entorno.js";

export class ErrorDeContenido extends Error {
  override name = "ErrorDeContenido";
}

export interface Bloque {
  fichero: string;
  orden: number;
  activo: boolean;
  titulo: string;
  cuerpo: string;
}

/** Sin estos, activos, no se publica: el aviso inicial, los dos bloques que son el producto y los datos. */
export const BLOQUES_OBLIGATORIOS = [5, 25, 30, 90] as const;

function separarFrontmatter(fichero: string, texto: string): { cabecera: Record<string, string>; cuerpo: string } {
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = limpio.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new ErrorDeContenido(`${fichero}: falta el frontmatter (--- orden / activo ---)`);
  const cabecera: Record<string, string> = {};
  for (const linea of m[1]!.split("\n")) {
    const kv = linea.match(/^\s*([a-záéíóúñ_]+)\s*:\s*(.*?)\s*$/i);
    if (kv) cabecera[kv[1]!.toLowerCase()] = kv[2]!;
  }
  return { cabecera, cuerpo: m[2]!.trim() };
}

function siONo(fichero: string, valor: string | undefined): boolean {
  const v = (valor ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (v === "si" || v === "true") return true;
  if (v === "no" || v === "false") return false;
  throw new ErrorDeContenido(`${fichero}: «activo» tiene que ser «si» o «no», y es «${valor ?? ""}»`);
}

export function interpretarBloque(fichero: string, texto: string): Bloque {
  const { cabecera, cuerpo } = separarFrontmatter(fichero, texto);
  const orden = Number(cabecera.orden);
  if (!Number.isInteger(orden)) throw new ErrorDeContenido(`${fichero}: «orden» tiene que ser un número entero`);
  return { fichero, orden, activo: siONo(fichero, cabecera.activo), titulo: cabecera.titulo ?? "", cuerpo };
}

/** Los bloques activos, ordenados. Los ficheros que empiezan por `_` no entran. */
export function leerBloques(carpeta = ruta("contenido", "bloques")): Bloque[] {
  const bloques = readdirSync(carpeta)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => interpretarBloque(f, readFileSync(join(carpeta, f), "utf8")))
    .filter((b) => b.activo)
    .sort((a, b) => a.orden - b.orden);

  const vistos = new Map<number, string>();
  for (const b of bloques) {
    const otro = vistos.get(b.orden);
    if (otro) throw new ErrorDeContenido(`Dos bloques activos con el mismo orden ${b.orden}: «${otro}» y «${b.fichero}»`);
    vistos.set(b.orden, b.fichero);
  }
  const faltan = BLOQUES_OBLIGATORIOS.filter((o) => !vistos.has(o));
  if (faltan.length) {
    throw new ErrorDeContenido(`Faltan bloques obligatorios activos (orden ${faltan.join(", ")}). No se publica un prompt sin ellos.`);
  }
  return bloques;
}

// ---------------------------------------------------------------------------------------------
// Mensajes fijos del asistente: una variante por trato.

export type Trato = "usted" | "tú";

export interface PlantillaMensaje {
  campo: "firstMessage" | "endCallMessage" | "voicemailMessage";
  variantes: Record<Trato, string>;
}

const CAMPOS = ["firstMessage", "endCallMessage", "voicemailMessage"] as const;

export function interpretarMensaje(fichero: string, texto: string): PlantillaMensaje {
  const { cabecera, cuerpo } = separarFrontmatter(fichero, texto);
  const campo = CAMPOS.find((c) => c === cabecera.campo);
  if (!campo) throw new ErrorDeContenido(`${fichero}: «campo» tiene que ser ${CAMPOS.join(", ")}`);
  const variantes: Partial<Record<Trato, string>> = {};
  for (const trozo of cuerpo.split(/^## /m).slice(1)) {
    const [titulo = "", ...resto] = trozo.split("\n");
    const clave = titulo.trim().toLowerCase() === "usted" ? "usted" : ["tú", "tu"].includes(titulo.trim().toLowerCase()) ? "tú" : null;
    if (clave) variantes[clave] = resto.join("\n").trim();
  }
  if (!variantes.usted || !variantes["tú"]) {
    throw new ErrorDeContenido(`${fichero}: tiene que tener las dos variantes, «## usted» y «## tú»`);
  }
  return { campo, variantes: variantes as Record<Trato, string> };
}

export function leerMensajes(carpeta = ruta("contenido", "mensajes")): PlantillaMensaje[] {
  const mensajes = readdirSync(carpeta)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => interpretarMensaje(f, readFileSync(join(carpeta, f), "utf8")));
  for (const campo of CAMPOS) {
    if (mensajes.filter((m) => m.campo === campo).length !== 1) {
      throw new ErrorDeContenido(`Tiene que haber exactamente una plantilla para ${campo} en contenido/mensajes/`);
    }
  }
  return mensajes;
}

