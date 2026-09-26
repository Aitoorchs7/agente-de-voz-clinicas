// Borra lo que dejaron unas llamadas de PRUEBA, por su ID de llamada: los eventos de los calendarios de
// la clínica (los encuentra por su propiedad privada `id_llamada`), las filas de Citas, Llamadas y
// Escalados con ese `id_llamada`, y su ficha y sus bloqueos en Redis.
//
//   npm run limpiar-pruebas -- <idLlamada> [<idLlamada>…]            → dice qué borraría (no borra)
//   npm run limpiar-pruebas -- --borrar <idLlamada> [<idLlamada>…]   → lo borra
//
// Solo toca lo que lleva esos IDs exactos. Cada fila se vuelve a leer justo antes de borrarla, bajo el
// mismo candado que usa el escritor, y se borran de abajo arriba para que no se muevan los números.

import { pathToFileURL } from "node:url";
import { agendaDeGoogle } from "../src/agenda/calendario.js";
import { bloqueosEnRedis } from "../src/bloqueo/bloqueos.js";
import { candadosEnRedis } from "../src/bloqueo/candado.js";
import { redisUpstash } from "../src/bloqueo/redis.js";
import { cargarFicha } from "../src/compilador/ciclo.js";
import { tokenDeAcceso, ALCANCE_HOJAS } from "../src/google/cuenta-servicio.js";
import { normalizar, PESTANAS } from "../src/hoja/esquema.js";
import { posicionesDeColumnas } from "../src/hoja/lector.js";
import { fichasEnRedis } from "../src/llamada/ficha.js";

export async function limpiarLlamadas(clinica: string, llamadas: readonly string[], borrar: boolean): Promise<string[]> {
  const ficha = cargarFicha(clinica);
  const informe: string[] = [];
  const agenda = agendaDeGoogle();
  for (const [gabinete, calendario] of Object.entries(ficha.calendarios)) {
    for (const llamada of llamadas) {
      for (const id of await agenda.deLaLlamada(calendario, llamada)) {
        informe.push(`${borrar ? "borrado" : "borraría"}: evento ${id.slice(0, 10)}… de ${gabinete} (${llamada})`);
        if (borrar) await agenda.borrar(calendario, id);
      }
    }
  }

  const redis = redisUpstash();
  const candados = candadosEnRedis(redis);
  const token = await tokenDeAcceso([ALCANCE_HOJAS]);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(ficha.spreadsheetId)}`;
  const pedir = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error(`Google Sheets respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()) as T;
  };
  const meta = await pedir<{ sheets: { properties: { sheetId: number; title: string } }[] }>(`${base}?fields=sheets.properties(sheetId,title)`);

  for (const pestana of [PESTANAS.citas, PESTANAS.llamadas, PESTANAS.escalados]) {
    const hoja = meta.sheets.find((s) => s.properties.title === pestana.nombre);
    if (!hoja) continue;
    await candados.con(`hoja:${ficha.spreadsheetId}:${pestana.nombre}`, async () => {
      const leido = await pedir<{ values?: unknown[][] }>(`${base}/values/${encodeURIComponent(`'${pestana.nombre}'!A1:Z5000`)}?valueRenderOption=UNFORMATTED_VALUE`);
      const filas = leido.values ?? [];
      const pos = posicionesDeColumnas(pestana, filas[0] ?? []).get(normalizar("id_llamada"));
      if (pos === undefined) return;
      const aBorrar = filas.flatMap((f, i) => (i > 0 && llamadas.includes(String(f[pos] ?? "")) ? [i] : [])).reverse();
      for (const i of aBorrar) informe.push(`${borrar ? "borrada" : "borraría"}: ${pestana.nombre}, fila ${i + 1} (${String(filas[i]![pos])})`);
      if (!borrar || !aBorrar.length) return;
      await pedir(`${base}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: aBorrar.map((i) => ({ deleteDimension: { range: { sheetId: hoja.properties.sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } })),
        }),
      });
    });
  }

  if (borrar) {
    const bloqueos = bloqueosEnRedis(redis);
    const fichas = fichasEnRedis(redis);
    for (const llamada of llamadas) {
      await bloqueos.soltar(llamada);
      await fichas.borrar(llamada);
    }
    informe.push(`ficha y bloqueos en Redis borrados (${llamadas.length} llamadas)`);
  }
  return informe;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const borrar = args.includes("--borrar");
  const clinica = args.find((a) => a.startsWith("--clinica="))?.slice(10) ?? "dentalvis";
  const ids = args.filter((a) => !a.startsWith("--"));
  if (!ids.length) {
    console.error("Uso: npm run limpiar-pruebas -- [--borrar] [--clinica=dentalvis] <idLlamada> [<idLlamada>…]");
    process.exit(1);
  }
  const informe = await limpiarLlamadas(clinica, ids, borrar);
  console.log(informe.length ? informe.join("\n") : "No hay nada de esas llamadas.");
  if (!borrar && informe.length) console.log("\n(No se ha borrado nada. Para borrarlo: --borrar)");
}
