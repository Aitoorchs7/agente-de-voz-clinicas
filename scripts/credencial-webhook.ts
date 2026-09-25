// Prepara la credencial con la que Vapi se autentica ante nuestro servidor (una sola para todos los
// asistentes). Idempotente:
//   - si falta VAPI_WEBHOOK_SECRET en el .env, genera uno aleatorio y lo AÑADE al .env;
//   - si falta VAPI_WEBHOOK_CREDENTIAL_ID, crea la credencial en Vapi con ese secreto y añade el id;
//   - si ya están, comprueba que la credencial sigue existiendo en Vapi.
// Nunca imprime el secreto. El .env no se versiona.
//
//   npm run credencial-webhook

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { ruta, variable } from "../src/entorno.js";
import { cuerpoCredencial } from "../src/vapi/autenticacion.js";
import { clienteVapi } from "../src/vapi/cliente.js";

const fichero = ruta(".env");
function anadirAlEnv(clave: string, valor: string): void {
  const actual = existsSync(fichero) ? readFileSync(fichero, "utf8") : "";
  const salto = actual && !actual.endsWith("\n") ? "\n" : "";
  appendFileSync(fichero, `${salto}${clave}=${valor}\n`, "utf8");
}

const vapi = clienteVapi();
let secreto = variable("VAPI_WEBHOOK_SECRET");
if (!secreto) {
  secreto = randomBytes(32).toString("base64url");
  anadirAlEnv("VAPI_WEBHOOK_SECRET", secreto);
  console.log("· VAPI_WEBHOOK_SECRET: generado y añadido al .env (no se muestra)");
} else console.log("· VAPI_WEBHOOK_SECRET: ya estaba en el .env");

let id = variable("VAPI_WEBHOOK_CREDENTIAL_ID");
if (!id) {
  const creada = await vapi.crearCredencial(cuerpoCredencial(secreto));
  id = creada.id;
  anadirAlEnv("VAPI_WEBHOOK_CREDENTIAL_ID", id);
  console.log(`· credencial creada en Vapi (${id}) y su id añadido al .env`);
} else {
  const existe = (await vapi.listarCredenciales()).find((c) => c.id === id);
  if (!existe) throw new Error(`VAPI_WEBHOOK_CREDENTIAL_ID apunta a una credencial que ya no existe en Vapi (${id}).`);
  console.log(`· credencial ${id}: existe en Vapi (${existe.provider})`);
}
