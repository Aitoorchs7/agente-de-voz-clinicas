// Registrar las herramientas en Vapi: crear lo que falta, no tocar lo que ya está igual, y mandar
// el `function` completo cuando cambia (PATCH /tool reemplaza los objetos anidados).

import { describe, expect, it } from "vitest";
import { HERRAMIENTAS } from "../src/herramientas/definiciones.js";
import { ErrorDeRegistro, idsPorNombre, sincronizarHerramientas } from "../src/herramientas/registro.js";
import type { Herramienta } from "../src/vapi/cliente.js";

function vapiDeHerramientas(iniciales: Herramienta[] = []) {
  const herramientas = structuredClone(iniciales);
  const llamadas: string[] = [];
  let n = 0;
  return {
    herramientas,
    llamadas,
    vapi: {
      async listarHerramientas() {
        return structuredClone(herramientas);
      },
      async crearHerramienta(cuerpo: Record<string, unknown>) {
        llamadas.push(`POST ${String((cuerpo.function as { name?: string } | undefined)?.name ?? cuerpo.type)}`);
        const h = { id: `h${++n}`, ...structuredClone(cuerpo) } as Herramienta;
        herramientas.push(h);
        return structuredClone(h);
      },
      async actualizarHerramienta(id: string, cambios: Partial<Herramienta>) {
        llamadas.push(`PATCH ${id}`);
        const h = herramientas.find((x) => x.id === id)!;
        Object.assign(h, structuredClone(cambios)); // como Vapi: cada campo de primer nivel se reemplaza entero
        return structuredClone(h);
      },
      async leerHerramienta(id: string) {
        return structuredClone(herramientas.find((x) => x.id === id)!);
      },
    },
  };
}

const nativas: Herramienta[] = [
  { id: "cal", type: "google.calendar.availability.check", function: { name: "google_calendar_check" } },
  { id: "hoja", type: "google.sheets.row.append", function: { name: "google_sheets_tool" } },
];

describe("sincronizar las herramientas con Vapi", () => {
  it("en una cuenta sin ellas crea las cuatro y la de colgar, sin URL propia", async () => {
    const v = vapiDeHerramientas(nativas);
    const r = await sincronizarHerramientas(v.vapi);
    expect(r.map((x) => [x.nombre, x.estado])).toEqual([
      ["consultar_huecos", "creada"], ["anotar", "creada"], ["crear_cita", "creada"], ["escalar_a_recepcion", "creada"], ["endCall", "creada"],
    ]);
    for (const h of v.herramientas.filter((x) => x.type === "function")) expect(h.server).toBeUndefined();
    expect(Object.keys(idsPorNombre(r))).toContain("endCall");
  });

  it("la segunda vez no hace nada: todo igual", async () => {
    const v = vapiDeHerramientas(nativas);
    await sincronizarHerramientas(v.vapi);
    v.llamadas.length = 0;
    const r = await sincronizarHerramientas(v.vapi);
    expect(r.every((x) => x.estado === "igual")).toBe(true);
    expect(v.llamadas).toEqual([]);
  });

  it("si cambia la descripción manda el function ENTERO y conserva lo que Vapi guardaba de más", async () => {
    const def = HERRAMIENTAS.find((h) => h.name === "anotar")!;
    const v = vapiDeHerramientas([{ id: "a1", type: "function", function: { ...structuredClone(def), description: "vieja", strict: false } }]);
    const r = await sincronizarHerramientas(v.vapi);
    expect(r.find((x) => x.nombre === "anotar")!.estado).toBe("actualizada");
    const h = v.herramientas.find((x) => x.id === "a1")!;
    expect(h.function).toEqual({ ...def, strict: false });
  });

  it("en simulación no crea ni cambia nada", async () => {
    const v = vapiDeHerramientas(nativas);
    const r = await sincronizarHerramientas(v.vapi, { simular: true });
    expect(r.every((x) => x.estado === "se crearía")).toBe(true);
    expect(v.llamadas).toEqual([]);
  });

  it("dos herramientas con el mismo nombre: no sigue", async () => {
    const def = HERRAMIENTAS[0]!;
    const v = vapiDeHerramientas([
      { id: "x1", type: "function", function: structuredClone(def) },
      { id: "x2", type: "function", function: structuredClone(def) },
    ]);
    await expect(sincronizarHerramientas(v.vapi)).rejects.toThrow(ErrorDeRegistro);
  });

  it("una herramienta nuestra con URL propia: no sigue, porque mandaría sobre la del asistente", async () => {
    const def = HERRAMIENTAS[0]!;
    const v = vapiDeHerramientas([{ id: "x1", type: "function", function: structuredClone(def), server: { url: "https://otro" } }]);
    await expect(sincronizarHerramientas(v.vapi)).rejects.toThrow(/URL propia/);
  });
});
