// El asistente de PRUEBAS de la Fase 3: una copia de Diego que apunta a nuestro servidor, para probar
// sin tocar el asistente de la demo. Diego no se toca hasta el cambio final.
//
//   npm run asistente-pruebas -- --captura --url https://<túnel>
//       Copia de Diego tal cual (prompt, voz, modelo, nativas) + `anotar` + colgar, y un añadido al
//       prompt para que llame a `anotar` con el nombre y el teléfono. Sirve para capturar el contrato.
//   npm run asistente-pruebas -- --url https://<túnel>
//       Solo cambia la URL del servidor (el túnel cambia de dirección cada vez que se arranca).
//
// La primera vez lo crea y deja su assistantId en fichas/dentalvis-pruebas/ficha.json. Las siguientes
// lo actualiza con PATCH, mandando `model` y `server` COMPLETOS, y lo comprueba con un GET.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { ruta, variableObligatoria } from "../src/entorno.js";
import { cargarFicha } from "../src/compilador/ciclo.js";
import { idsPorNombre, sincronizarHerramientas } from "../src/herramientas/registro.js";
import { clienteVapi, type Asistente } from "../src/vapi/cliente.js";

const NOMBRE = "PRUEBAS F3 · no usar en demos";
const CARPETA = "dentalvis-pruebas";

const ANADIDO_CAPTURA = `PRUEBA TÉCNICA (solo en este asistente de pruebas)
Cada vez que el paciente te diga su nombre, sus apellidos o un teléfono, llama a la herramienta anotar con ese dato, y solo con ese: en campo pon «nombre», «apellidos» o «telefono», y en valor lo que te haya dicho. Después sigue la conversación con normalidad. Esto no se dice en voz alta.`;

/** Lo que se copia de Diego: solo campos que acepta POST /assistant (los viejos, como `endCallFunctionEnabled`, ya no). */
const CAMPOS_COPIADOS = [
  "transcriber", "voice", "firstMessage", "firstMessageInterruptionsEnabled", "firstMessageMode", "clientMessages",
  "serverMessages", "maxDurationSeconds", "backgroundSound", "voicemailMessage", "endCallMessage", "analysisPlan", "artifactPlan",
] as const;

const args = process.argv.slice(2);
const captura = args.includes("--captura");
const url = args[args.indexOf("--url") + 1];
if (!args.includes("--url") || !url?.startsWith("https://")) throw new Error("Falta la URL del túnel: --url https://…");
const server = { url: `${url.replace(/\/+$/, "")}/api/vapi`, credentialId: variableObligatoria("VAPI_WEBHOOK_CREDENTIAL_ID"), timeoutSeconds: 20 };

const vapi = clienteVapi();
const diego = await vapi.leerAsistente(cargarFicha("dentalvis").assistantId);
const ficheroFicha = ruta("fichas", CARPETA, "ficha.json");
const existente = existsSync(ficheroFicha) ? (JSON.parse(readFileSync(ficheroFicha, "utf8")) as { assistantId?: string }).assistantId : undefined;

const cambios: Partial<Asistente> = { server };
if (captura || !existente) {
  const ids = idsPorNombre(await sincronizarHerramientas(vapi));
  const model = structuredClone(diego.model!);
  const sistema = model.messages!.find((m) => m.role === "system")!;
  sistema.content = `${sistema.content}\n\n---\n\n${ANADIDO_CAPTURA}`;
  model.toolIds = [...(diego.model!.toolIds ?? []), ids.anotar!, ids.endCall!];
  Object.assign(cambios, { name: NOMBRE, model });
}

if (!existente) {
  const cuerpo: Record<string, unknown> = { ...cambios };
  for (const c of CAMPOS_COPIADOS) if (diego[c] !== undefined) cuerpo[c] = structuredClone(diego[c]);
  const creado = await vapi.crearAsistente(cuerpo);
  mkdirSync(ruta("fichas", CARPETA), { recursive: true });
  writeFileSync(
    ficheroFicha,
    JSON.stringify(
      {
        _nota: "Asistente de PRUEBAS de la Fase 3: no usar en demos. Misma hoja que Dentalvis. Lo crea y lo cambia scripts/asistente-pruebas.ts.",
        clinica: "Clínica Dentalvis (pruebas)",
        spreadsheetId: cargarFicha("dentalvis").spreadsheetId,
        assistantId: creado.id,
        calendarios: cargarFicha("dentalvis").calendarios,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`· creado ${NOMBRE} (${creado.id}) y apuntado en fichas/${CARPETA}/ficha.json`);
} else {
  await vapi.actualizarAsistente(existente, cambios);
  console.log(`· actualizado ${existente}: ${Object.keys(cambios).join(", ")}`);
}

// Comprobación: lo que se mandó tiene que estar tal cual (Vapi puede añadir campos suyos; perder o
// cambiar uno de los nuestros, no).
const id = existente ?? (JSON.parse(readFileSync(ficheroFicha, "utf8")) as { assistantId: string }).assistantId;
const ahora = await vapi.leerAsistente(id);
const igual = (actual: unknown, mandado: unknown): boolean =>
  mandado && typeof mandado === "object" && !Array.isArray(mandado)
    ? Object.entries(mandado).every(([k, v]) => isDeepStrictEqual((actual as Record<string, unknown> | undefined)?.[k], v))
    : isDeepStrictEqual(actual, mandado);
const fallos = Object.entries(cambios).filter(([k, v]) => !igual(ahora[k], v)).map(([k]) => k);
if (fallos.length) throw new Error(`El asistente de pruebas no quedó como se mandó: ${fallos.join(", ")}. Revísalo.`);
console.log(`· comprobado con GET · servidor ${ahora.server ? (ahora.server as { url: string }).url : "—"} · herramientas ${ahora.model?.toolIds?.length}`);
