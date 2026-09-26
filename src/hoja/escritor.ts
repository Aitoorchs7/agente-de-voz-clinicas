// El escritor de la hoja: lo que el asistente apunta en `Citas`, `Llamadas` y `Escalados`. Es el ÚNICO
// sitio que escribe filas, y lo hace como dice PLAN.md §9:
//
// - Bajo un candado por pestaña (dos citas a la vez no calculan la misma fila libre).
// - La fila libre se CALCULA leyendo la pestaña: la siguiente a la última que tenga algo, sea de la tabla
//   o una nota suelta. Nunca `append`: con `append`, Google decide dónde empieza «la tabla», y una nota
//   debajo o una fila en blanco en medio hacen que escriba donde no toca.
// - Rango cerrado: la fila exacta, de la columna A a la última conocida.
// - Las columnas, por su cabecera (la misma función que el lector). Las que la clínica haya añadido por
//   su cuenta no se tocan: en esas celdas va `null`, que Google deja como están.
// - `RAW`: lo escrito se guarda tal cual. Un teléfono no pierde el cero ni se vuelve un número, una fecha
//   no se reinterpreta y un texto que empiece por «=» no se convierte en una fórmula.
// - Google NO pasa la validación de datos de la hoja cuando se escribe por API: la validación es de quien
//   llama (las herramientas validan antes de llegar aquí).
// - Después de escribir, se relee la fila y se compara. Si no ha quedado igual, es un error, no un aviso.
// - `igual`: si ya hay una fila con esos mismos valores en esas columnas (el id de la llamada, el id del
//   evento), no se escribe otra: Vapi puede repetir un aviso.

import type { Candados } from "../bloqueo/candado.js";
import { tokenDeAcceso, ALCANCE_HOJAS } from "../google/cuenta-servicio.js";
import { normalizar, type Pestana } from "./esquema.js";
import { ErrorDeHoja, posicionesDeColumnas } from "./lector.js";

export type Celda = string | number;

export interface Escritor {
  escribir(
    pestana: Pestana,
    valores: Readonly<Record<string, Celda>>,
    opciones?: { igual?: readonly string[] },
  ): Promise<{ fila: number; yaEstaba: boolean }>;
}

/** Filas que se leen como mucho para buscar la libre. Cerrado, como todo rango. */
export const FILAS_LEIDAS = 5000;

const letra = (indice: number): string => {
  let n = indice + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export function escritorDeHoja(
  spreadsheetId: string,
  dependencias: { candados: Candados; token?: () => Promise<string>; fetch?: typeof fetch },
): Escritor {
  const f = dependencias.fetch ?? fetch;
  const token = dependencias.token ?? (() => tokenDeAcceso([ALCANCE_HOJAS]));
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;

  async function pedir<T>(metodo: string, url: string, que: string, cuerpo?: unknown): Promise<T> {
    const r = await f(url, {
      method: metodo,
      headers: { Authorization: `Bearer ${await token()}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      const texto = await r.text();
      const detalle = texto.match(/"message":\s*"([^"]+)"/)?.[1] ?? texto.slice(0, 200);
      throw new ErrorDeHoja(`Google Sheets respondió ${r.status} al ${que}: ${detalle}`);
    }
    return (await r.json()) as T;
  }

  async function crecer(pestana: Pestana, hasta: number): Promise<void> {
    const meta = await pedir<{ sheets: { properties: { sheetId: number; title: string; gridProperties: { rowCount: number } } }[] }>(
      "GET", `${base}?fields=sheets.properties(sheetId,title,gridProperties.rowCount)`, "mirar el tamaño de la pestaña",
    );
    const hoja = meta.sheets.find((s) => s.properties.title === pestana.nombre);
    if (!hoja) throw new ErrorDeHoja(`No existe la pestaña ${pestana.nombre}.`);
    const faltan = hasta - hoja.properties.gridProperties.rowCount;
    if (faltan <= 0) return;
    await pedir("POST", `${base}:batchUpdate`, "añadir filas a la pestaña", {
      requests: [{ appendDimension: { sheetId: hoja.properties.sheetId, dimension: "ROWS", length: Math.max(faltan, 100) } }],
    });
  }

  return {
    async escribir(pestana, valores, opciones = {}) {
      const desconocidas = Object.keys(valores).filter((c) => !pestana.columnas.some((x) => normalizar(x) === normalizar(c)));
      if (desconocidas.length) throw new ErrorDeHoja(`${pestana.nombre} no tiene la columna ${desconocidas.join(", ")} en su esquema.`);

      return dependencias.candados.con(`hoja:${spreadsheetId}:${pestana.nombre}`, async () => {
        const rango = encodeURIComponent(`'${pestana.nombre}'!A1:Z${FILAS_LEIDAS}`);
        const leido = await pedir<{ values?: unknown[][] }>(
          "GET", `${base}/values/${rango}?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`, `leer ${pestana.nombre}`,
        );
        const filas = leido.values ?? [];
        const posicion = posicionesDeColumnas(pestana, filas[0] ?? []);
        if (!posicion.size) {
          throw new ErrorDeHoja(`La pestaña ${pestana.nombre} no tiene cabeceras en la primera fila; no escribo a ciegas (npm run preparar-hoja).`);
        }
        const faltan = Object.keys(valores).filter((c) => !posicion.has(normalizar(c)));
        if (faltan.length) {
          throw new ErrorDeHoja(`A la pestaña ${pestana.nombre} le falta la columna ${faltan.map((c) => `«${c}»`).join(", ")} (npm run preparar-hoja).`);
        }

        if (opciones.igual?.length) {
          const iguales = opciones.igual.map((c) => [posicion.get(normalizar(c))!, String(valores[c] ?? "")] as const);
          const repetida = filas.findIndex((fila, i) => i > 0 && iguales.every(([pos, v]) => v !== "" && String(fila[pos] ?? "") === v));
          if (repetida > 0) return { fila: repetida + 1, yaEstaba: true };
        }

        if (filas.length >= FILAS_LEIDAS) throw new ErrorDeHoja(`La pestaña ${pestana.nombre} tiene ya ${FILAS_LEIDAS} filas: hay que archivar las antiguas.`);
        const numero = filas.length + 1;
        const ultima = Math.max(...posicion.values());
        const linea: (Celda | null)[] = Array.from({ length: ultima + 1 }, () => null);
        for (const [columna, v] of Object.entries(valores)) linea[posicion.get(normalizar(columna))!] = v;

        const destino = encodeURIComponent(`'${pestana.nombre}'!A${numero}:${letra(ultima)}${numero}`);
        const escribir = () =>
          pedir("PUT", `${base}/values/${destino}?valueInputOption=RAW`, `escribir en ${pestana.nombre}`, { majorDimension: "ROWS", values: [linea] });
        try {
          await escribir();
        } catch (e) {
          if (!(e instanceof ErrorDeHoja) || !/exceeds grid limits/i.test(e.message)) throw e;
          await crecer(pestana, numero);
          await escribir();
        }

        const releido = await pedir<{ values?: unknown[][] }>(
          "GET", `${base}/values/${destino}?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`, `comprobar lo escrito en ${pestana.nombre}`,
        );
        const quedo = releido.values?.[0] ?? [];
        const distintas = linea.flatMap((v, i) => (v === null || String(quedo[i] ?? "") === String(v) ? [] : [letra(i)]));
        if (distintas.length) {
          throw new ErrorDeHoja(`La fila ${numero} de ${pestana.nombre} no ha quedado como se escribió (columnas ${distintas.join(", ")}).`);
        }
        return { fila: numero, yaEstaba: false };
      });
    },
  };
}
