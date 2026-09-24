// Prepara la hoja de una clínica: crea las pestañas que falten con sus cabeceras, la validación de
// `público` (solo «sí» o «no»), la pestaña LÉEME y, si se le da, una semilla de filas.
//
// Es idempotente y conservador: una pestaña que ya existe y tiene datos NO se toca. Así se puede
// pasar sobre la hoja de una clínica que ya está en uso sin miedo a pisarle nada.

import { tokenDeAcceso, ALCANCE_HOJAS } from "../google/cuenta-servicio.js";
import { PESTANAS, PESTANA_LEEME, normalizar } from "./esquema.js";
import { TEXTO_LEEME } from "./leeme.js";

type Fila = Record<string, string>;

export interface Semilla {
  config: Fila[];
  tratamientos: Fila[];
  faq: Fila[];
  horarios: Fila[];
}

interface PropiedadesPestana {
  sheetId: number;
  title: string;
  index: number;
}

const ORDEN = [PESTANA_LEEME, ...Object.values(PESTANAS).map((p) => p.nombre)];

export async function prepararHoja(spreadsheetId: string, semilla?: Semilla): Promise<string[]> {
  const token = await tokenDeAcceso([ALCANCE_HOJAS]);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  const api = async <T>(metodo: string, camino: string, cuerpo?: unknown): Promise<T> => {
    const r = await fetch(`${base}${camino}`, {
      signal: AbortSignal.timeout(60_000),
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!r.ok) throw new Error(`Google Sheets ${r.status} en ${metodo} ${camino}: ${(await r.text()).slice(0, 300)}`);
    return (await r.json()) as T;
  };
  const hecho: string[] = [];

  const meta = await api<{ sheets: { properties: PropiedadesPestana }[] }>("GET", "?fields=sheets.properties(sheetId,title,index)");
  const existentes = new Map(meta.sheets.map((s) => [s.properties.title, s.properties]));

  // ¿Qué pestañas existentes tienen datos? Esas no se tocan.
  const conDatos = new Set<string>();
  if (existentes.size) {
    const params = new URLSearchParams();
    const titulos = [...existentes.keys()];
    for (const t of titulos) params.append("ranges", `'${t}'!A1:Z3`);
    const lote = await api<{ valueRanges: { values?: string[][] }[] }>("GET", `/values:batchGet?${params}`);
    lote.valueRanges.forEach((v, i) => {
      if ((v.values ?? []).some((fila) => fila.some((celda) => String(celda).trim()))) conDatos.add(titulos[i]!);
    });
  }

  // 1. Crear las que faltan, en su orden.
  const nuevas = ORDEN.filter((t) => !existentes.has(t));
  if (nuevas.length) {
    const r = await api<{ replies: { addSheet: { properties: PropiedadesPestana } }[] }>("POST", ":batchUpdate", {
      requests: nuevas.map((title) => ({ addSheet: { properties: { title } } })),
    });
    for (const rep of r.replies) existentes.set(rep.addSheet.properties.title, rep.addSheet.properties);
    hecho.push(`Pestañas creadas: ${nuevas.join(", ")}`);
  }
  for (const t of ORDEN.filter((t) => conDatos.has(t))) hecho.push(`${t}: ya tenía datos, no se ha tocado`);

  // 2. Escribir cabeceras, semilla y LÉEME solo en las pestañas vacías.
  const vacias = ORDEN.filter((t) => !conDatos.has(t));
  const datos: { range: string; values: string[][] }[] = [];
  for (const pestana of Object.values(PESTANAS)) {
    if (!vacias.includes(pestana.nombre)) continue;
    const filas = semilla ? semillaDe(pestana.nombre, semilla) : [];
    datos.push({
      range: `'${pestana.nombre}'!A1`,
      values: [[...pestana.columnas], ...filas.map((f) => pestana.columnas.map((c) => valorDe(f, c)))],
    });
    hecho.push(`${pestana.nombre}: cabeceras${filas.length ? ` y ${filas.length} filas` : ""}`);
  }
  if (vacias.includes(PESTANA_LEEME)) {
    datos.push({ range: `'${PESTANA_LEEME}'!A1`, values: TEXTO_LEEME.map((l) => [l]) });
    hecho.push(`${PESTANA_LEEME}: texto para recepción`);
  }
  if (datos.length) await api("POST", "/values:batchUpdate", { valueInputOption: "RAW", data: datos });

  // 3. Formato, validación y protección suave, solo en lo que se acaba de escribir.
  const peticiones: unknown[] = [];
  for (const pestana of Object.values(PESTANAS)) {
    if (!vacias.includes(pestana.nombre)) continue;
    const sheetId = existentes.get(pestana.nombre)!.sheetId;
    peticiones.push(
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.91, green: 0.93, blue: 0.96 } } },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      // Avisa (no impide) si alguien va a cambiar una cabecera: el lector encuentra las columnas por ellas.
      {
        addProtectedRange: {
          protectedRange: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            description: "Nombres de columna: el asistente los necesita tal cual",
            warningOnly: true,
          },
        },
      },
      { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: pestana.columnas.length } } },
    );
    const colPublico = pestana.columnas.findIndex((c) => normalizar(c) === "publico");
    if (colPublico >= 0) {
      peticiones.push({
        setDataValidation: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: colPublico, endColumnIndex: colPublico + 1 },
          rule: {
            condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "sí" }, { userEnteredValue: "no" }] },
            strict: true,
            showCustomUi: true,
            inputMessage: "sí = el asistente lo sabe · no = el asistente no lo ve nunca",
          },
        },
      });
    }
    if (["Citas", "Llamadas", "Escalados"].includes(pestana.nombre)) {
      peticiones.push({
        addProtectedRange: {
          protectedRange: { range: { sheetId }, description: "Se rellena sola: no hace falta tocarla", warningOnly: true },
        },
      });
    }
  }
  if (vacias.includes(PESTANA_LEEME)) {
    const sheetId = existentes.get(PESTANA_LEEME)!.sheetId;
    peticiones.push(
      { updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 900 }, fields: "pixelSize" } },
      {
        repeatCell: {
          range: { sheetId, startColumnIndex: 0, endColumnIndex: 1 },
          cell: { userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" } },
          fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
        },
      },
    );
    TEXTO_LEEME.forEach((l, i) => {
      if (l && l === l.toUpperCase()) {
        peticiones.push({
          repeatCell: {
            range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        });
      }
    });
  }

  // Orden de las pestañas: LÉEME primero y luego las siete. Solo se mueven, no se tocan sus datos.
  ORDEN.forEach((titulo, index) => {
    const p = existentes.get(titulo);
    if (p) peticiones.push({ updateSheetProperties: { properties: { sheetId: p.sheetId, index }, fields: "index" } });
  });

  // 4. La pestaña que Google crea por defecto («Hoja 1»), si está vacía, sobra.
  for (const [titulo, p] of existentes) {
    if (/^(hoja|sheet)\s?1$/i.test(titulo) && !conDatos.has(titulo) && !ORDEN.includes(titulo)) {
      peticiones.push({ deleteSheet: { sheetId: p.sheetId } });
      hecho.push(`«${titulo}» (vacía, la de por defecto): borrada`);
    }
  }
  if (peticiones.length) await api("POST", ":batchUpdate", { requests: peticiones });
  return hecho;
}

function semillaDe(pestana: string, s: Semilla): Fila[] {
  if (pestana === PESTANAS.config.nombre) return s.config;
  if (pestana === PESTANAS.tratamientos.nombre) return s.tratamientos;
  if (pestana === PESTANAS.faq.nombre) return s.faq;
  if (pestana === PESTANAS.horarios.nombre) return s.horarios;
  return [];
}

function valorDe(fila: Fila, columna: string): string {
  const clave = Object.keys(fila).find((k) => normalizar(k) === normalizar(columna));
  return clave ? fila[clave]! : "";
}
