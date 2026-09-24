// Variables de entorno y rutas del repo.
//
// Se lee primero `process.env` (así funcionará en Vercel) y, si no está ahí, el `.env` de la raíz.
// El `.env` se lee a mano, línea a línea, porque tiene una variable repartida en trece líneas
// (GOOGLE_SERVICE_ACCOUNT_JSON) que los lectores habituales no entienden: aquí esas líneas sueltas
// simplemente no casan con CLAVE=valor y se ignoran.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const RAIZ = fileURLToPath(new URL("..", import.meta.url));

export function ruta(...partes: string[]): string {
  return resolve(RAIZ, ...partes);
}

let dotEnv: Record<string, string> | undefined;

function leerDotEnv(): Record<string, string> {
  if (dotEnv) return dotEnv;
  dotEnv = {};
  const fichero = ruta(".env");
  if (!existsSync(fichero)) return dotEnv;
  for (const linea of readFileSync(fichero, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m) dotEnv[m[1]!] = m[2]!.trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return dotEnv;
}

export function variable(nombre: string): string | undefined {
  const valor = process.env[nombre] || leerDotEnv()[nombre];
  return valor ? valor : undefined;
}

export function variableObligatoria(nombre: string): string {
  const valor = variable(nombre);
  if (!valor) throw new Error(`Falta la variable ${nombre}, ni en el entorno ni en .env`);
  return valor;
}
