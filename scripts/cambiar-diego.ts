// Pasar a Diego de las herramientas nativas de Vapi (fases 1 y 2) a las propias (fase 3), y la MARCHA
// ATRÁS si algo falla en mitad de una demo.
//
//   npm run cambiar-diego -- --propias --url https://<proyecto>.vercel.app [--simular]
//   npm run cambiar-diego -- --nativas [--simular]
//
// --propias: antes de tocar nada comprueba que el servidor contesta como debe (405 a un GET, 401 sin
//   credencial). Guarda a Diego tal como está en fichas/dentalvis/nativas.json (solo si ahora tiene las
//   nativas: nunca pisa una copia buena con una de las propias). Compila el prompt con los bloques y la
//   hoja, y manda en UN PATCH el `model` entero (mismo proveedor, modelo y temperatura; prompt nuevo; solo
//   las cuatro propias y colgar), el servidor, los tres mensajes y la frase con la que cuelga.
// --nativas: vuelve a dejar el `model` y los mensajes EXACTAMENTE como en esa copia. El servidor se queda
//   apuntando a Vercel: con las nativas no se llama a ninguna herramienta propia, y el aviso de fin de
//   llamada sigue escribiendo la fila de `Llamadas`.
//
// Las dos cosas se comprueban con un GET campo a campo; si --propias no queda como se mandó, vuelve solo
// a la copia. Tarda unos segundos: se puede hacer entre dos llamadas de una demo.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { leerBloques, leerMensajes } from "../src/compilador/bloques.js";
import { cargarFicha } from "../src/compilador/ciclo.js";
import { herramientasNombradas } from "../src/compilador/publicar.js";
import { compilarFicha } from "../src/compilador/render.js";
import { ruta, variableObligatoria } from "../src/entorno.js";
import { idsPorNombre, sincronizarHerramientas } from "../src/herramientas/registro.js";
import { leerFicha } from "../src/hoja/lector.js";
import { clienteVapi, type Asistente } from "../src/vapi/cliente.js";
import { cambiosParaPropias, configuracionDelServidor } from "../src/vapi/servidor.js";

const args = process.argv.slice(2);
const propias = args.includes("--propias");
const nativas = args.includes("--nativas");
const simular = args.includes("--simular");
if (propias === nativas) throw new Error("Di --propias (con --url) o --nativas.");

const ficha = cargarFicha("dentalvis");
const COPIA = ruta("fichas", "dentalvis", "nativas.json");
const vapi = clienteVapi();
const antes = await vapi.leerAsistente(ficha.assistantId);
const tiposDeHerramientas = await Promise.all((antes.model?.toolIds ?? []).map(async (id) => (await vapi.leerHerramienta(id)).type ?? ""));
const conNativas = tiposDeHerramientas.some((t) => t.startsWith("google."));
console.log(`Diego (${ficha.assistantId}) tiene ahora las herramientas ${conNativas ? "NATIVAS" : "propias"} (${tiposDeHerramientas.join(", ")}).`);

let cambios: Partial<Asistente>;
if (propias) {
  const url = args[args.indexOf("--url") + 1];
  if (!url?.startsWith("https://")) throw new Error("Falta la URL del servidor: --url https://…");
  const servidor = configuracionDelServidor(url, variableObligatoria("VAPI_WEBHOOK_CREDENTIAL_ID"));
  // El servidor tiene que estar vivo y cerrado a quien no traiga la credencial, ANTES de apuntar a él.
  const get = await fetch(servidor.url, { signal: AbortSignal.timeout(15_000) }).then((r) => r.status).catch(() => 0);
  const sinCredencial = await fetch(servidor.url, { method: "POST", body: "{}", signal: AbortSignal.timeout(15_000) }).then((r) => r.status).catch(() => 0);
  if (get !== 405 || sinCredencial !== 401) {
    throw new Error(`${servidor.url} no contesta como el webhook (GET → ${get}, esperado 405; POST sin credencial → ${sinCredencial}, esperado 401). No se toca a Diego.`);
  }
  console.log(`· el servidor contesta bien (GET 405, sin credencial 401)`);

  const ids = idsPorNombre(await sincronizarHerramientas(vapi, { simular }));
  const c = compilarFicha(await leerFicha(ficha.spreadsheetId), { bloques: leerBloques(), mensajes: leerMensajes() });
  const sinEnganchar = herramientasNombradas(c.prompt).filter((n) => !(n in ids));
  if (sinEnganchar.length) throw new Error(`El prompt nombra ${sinEnganchar.join(", ")}, que no está entre las herramientas propias.`);
  cambios = cambiosParaPropias(antes, ids, c, servidor);

  if (conNativas && !simular) {
    writeFileSync(COPIA, JSON.stringify(antes, null, 2) + "\n", "utf8");
    console.log(`· copia de Diego con las nativas guardada en fichas/dentalvis/nativas.json`);
  }
} else {
  if (!existsSync(COPIA)) throw new Error("No hay copia de Diego con las nativas (fichas/dentalvis/nativas.json): no sé a qué volver.");
  const copia = JSON.parse(readFileSync(COPIA, "utf8")) as Asistente;
  cambios = {
    model: copia.model,
    firstMessage: copia.firstMessage,
    endCallMessage: copia.endCallMessage,
    voicemailMessage: copia.voicemailMessage,
    endCallPhrases: (copia.endCallPhrases as string[] | undefined) ?? [],
  };
}

const distintos = Object.entries(cambios).filter(([k, v]) => !isDeepStrictEqual(antes[k], v)).map(([k]) => k);
console.log(`· cambiaría: ${distintos.join(", ") || "nada"}`);
if (simular || !distintos.length) process.exit(0);

await vapi.actualizarAsistente(ficha.assistantId, cambios);
const despues = await vapi.leerAsistente(ficha.assistantId);
const igual = (actual: unknown, mandado: unknown): boolean =>
  mandado && typeof mandado === "object" && !Array.isArray(mandado)
    ? Object.entries(mandado).every(([k, v]) => isDeepStrictEqual((actual as Record<string, unknown> | undefined)?.[k], v))
    : isDeepStrictEqual(actual, mandado);
const fallos = Object.entries(cambios).filter(([k, v]) => !igual(despues[k], v)).map(([k]) => k);
const perdidos = Object.keys(antes).filter((k) => !(k in cambios) && !["updatedAt", "latestVersion", "server"].includes(k) && !isDeepStrictEqual(antes[k], despues[k]));
if (fallos.length || perdidos.length) {
  const detalle = [...fallos.map((k) => `«${k}» no quedó como se mandó`), ...perdidos.map((k) => `«${k}» cambió sin tocarlo`)].join("; ");
  if (propias && existsSync(COPIA)) {
    const copia = JSON.parse(readFileSync(COPIA, "utf8")) as Asistente;
    await vapi.actualizarAsistente(ficha.assistantId, { model: copia.model, firstMessage: copia.firstMessage, endCallMessage: copia.endCallMessage, voicemailMessage: copia.voicemailMessage });
    throw new Error(`${detalle}. Se ha vuelto a la copia con las nativas; compruébalo.`);
  }
  throw new Error(`${detalle}. ⚠ Revisa a Diego a mano YA.`);
}
console.log(`· Diego ya tiene las herramientas ${propias ? "PROPIAS" : "NATIVAS"}; comprobado con GET campo a campo.`);
