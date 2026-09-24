// Prepara la hoja de una clínica (pestañas, cabeceras, validación de `público`, LÉEME).
//
//   npm run preparar-hoja -- <spreadsheetId> --semilla=plantilla
//   npm run preparar-hoja -- <spreadsheetId> --semilla=dentalvis
//   npm run preparar-hoja -- <spreadsheetId>                      → solo estructura, sin filas
//
// La hoja tiene que existir ya y estar compartida con la cuenta de servicio como Editor: la cuenta
// de servicio no tiene espacio en Drive y no puede crear hojas suyas. Las pestañas que ya tengan
// datos no se tocan.

import { prepararHoja } from "../src/hoja/preparar.js";
import { DENTALVIS, PLANTILLA } from "./semillas.js";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const nombreSemilla = args.find((a) => a.startsWith("--semilla="))?.split("=")[1];
if (!id) throw new Error("Falta el spreadsheetId: npm run preparar-hoja -- <spreadsheetId> [--semilla=plantilla|dentalvis]");
const semillas = { plantilla: PLANTILLA, dentalvis: DENTALVIS };
if (nombreSemilla && !(nombreSemilla in semillas)) throw new Error(`Semilla desconocida: ${nombreSemilla}`);

const hecho = await prepararHoja(id, nombreSemilla ? semillas[nombreSemilla as keyof typeof semillas] : undefined);
for (const l of hecho) console.log(`  · ${l}`);
