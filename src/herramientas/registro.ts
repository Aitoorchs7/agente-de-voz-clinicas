// Registrar en Vapi las herramientas propias y la de colgar, sin duplicarlas y sin romperlas.
//
// - Se buscan por nombre (las de función) o por tipo (`endCall`). Si hay dos con el mismo nombre, no se
//   sigue: no se sabe cuál usan los asistentes.
// - Si una ya existe y es distinta, se manda el objeto `function` COMPLETO: PATCH /tool reemplaza los
//   objetos anidados, y un `function` a medias borraría la descripción o los parámetros.
// - Ninguna puede tener URL propia: mandaría sobre la del asistente, y Diego y el asistente de pruebas
//   dejarían de poder compartirlas.

import { isDeepStrictEqual } from "node:util";
import type { ClienteVapiCompleto, Herramienta } from "../vapi/cliente.js";
import { HERRAMIENTAS, HERRAMIENTA_COLGAR, type DefinicionFuncion } from "./definiciones.js";

export class ErrorDeRegistro extends Error {
  override name = "ErrorDeRegistro";
}

export interface HerramientaRegistrada {
  nombre: string;
  id: string;
  estado: "creada" | "actualizada" | "igual" | "se crearía" | "se actualizaría";
}

type Vapi = Pick<ClienteVapiCompleto, "listarHerramientas" | "crearHerramienta" | "actualizarHerramienta" | "leerHerramienta">;

/** Lo que cuenta para decidir si hay que actualizar: solo lo que definimos nosotros. */
const loNuestro = (f: Herramienta["function"]) => ({ name: f?.name, description: f?.description, parameters: f?.parameters });

export async function sincronizarHerramientas(vapi: Vapi, opciones: { simular?: boolean } = {}): Promise<HerramientaRegistrada[]> {
  const todas = await vapi.listarHerramientas();
  const hechas: HerramientaRegistrada[] = [];

  for (const def of HERRAMIENTAS) {
    const iguales = todas.filter((h) => h.type === "function" && h.function?.name === def.name);
    if (iguales.length > 1) {
      throw new ErrorDeRegistro(`Hay ${iguales.length} herramientas llamadas «${def.name}» en Vapi. Deja solo una y vuelve a intentarlo.`);
    }
    const existente = iguales[0];
    if (!existente) {
      if (opciones.simular) {
        hechas.push({ nombre: def.name, id: "—", estado: "se crearía" });
        continue;
      }
      const creada = await vapi.crearHerramienta({ type: "function", function: def });
      hechas.push({ nombre: def.name, id: creada.id, estado: "creada" });
      continue;
    }
    if (existente.server) {
      throw new ErrorDeRegistro(
        `La herramienta «${def.name}» tiene URL propia; mandaría sobre la del asistente. Quítasela en el panel de Vapi.`,
      );
    }
    if (isDeepStrictEqual(loNuestro(existente.function), loNuestro(def))) {
      hechas.push({ nombre: def.name, id: existente.id, estado: "igual" });
      continue;
    }
    if (opciones.simular) {
      hechas.push({ nombre: def.name, id: existente.id, estado: "se actualizaría" });
      continue;
    }
    await actualizarFuncion(vapi, existente, def);
    hechas.push({ nombre: def.name, id: existente.id, estado: "actualizada" });
  }

  const colgar = todas.find((h) => h.type === HERRAMIENTA_COLGAR.type);
  if (colgar) hechas.push({ nombre: "endCall", id: colgar.id, estado: "igual" });
  else if (opciones.simular) hechas.push({ nombre: "endCall", id: "—", estado: "se crearía" });
  else hechas.push({ nombre: "endCall", id: (await vapi.crearHerramienta({ ...HERRAMIENTA_COLGAR })).id, estado: "creada" });

  return hechas;
}

async function actualizarFuncion(vapi: Vapi, existente: Herramienta, def: DefinicionFuncion): Promise<void> {
  // Completo: lo que Vapi guarda de más (por ejemplo `strict`) se conserva, lo nuestro se pisa.
  const funcion = { ...existente.function, ...def };
  await vapi.actualizarHerramienta(existente.id, { function: funcion });
  const despues = await vapi.leerHerramienta(existente.id);
  if (!isDeepStrictEqual(loNuestro(despues.function), loNuestro(def)) || despues.type !== existente.type) {
    await vapi.actualizarHerramienta(existente.id, { function: existente.function }).catch(() => undefined);
    throw new ErrorDeRegistro(`La herramienta «${def.name}» no quedó como se mandó; se ha intentado dejar como estaba.`);
  }
}

/** Los IDs por nombre, para enganchar las herramientas a un asistente. */
export function idsPorNombre(registradas: readonly HerramientaRegistrada[]): Record<string, string> {
  return Object.fromEntries(registradas.map((r) => [r.nombre, r.id]));
}
