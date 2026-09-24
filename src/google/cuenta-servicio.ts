// Autenticación con la cuenta de servicio de Google, sin librerías: se firma el JWT con node:crypto
// y se cambia por un token de acceso. En esta máquina Python no tiene certificados raíz, pero Node
// trae los suyos, así que `fetch` funciona sin tocar nada.

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { ruta, variable } from "../entorno.js";

export interface CuentaDeServicio {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export const ALCANCE_HOJAS = "https://www.googleapis.com/auth/spreadsheets";
export const ALCANCE_DRIVE = "https://www.googleapis.com/auth/drive";

/**
 * Dos formas de dar la credencial, por este orden:
 * - GOOGLE_SERVICE_ACCOUNT_FILE: ruta a un .json (en local; `credenciales/` está en .gitignore).
 * - GOOGLE_SERVICE_ACCOUNT_JSON: el JSON entero en UNA línea (así habrá que ponerlo en Vercel).
 */
export function cargarCuentaDeServicio(): CuentaDeServicio {
  const fichero = variable("GOOGLE_SERVICE_ACCOUNT_FILE");
  if (fichero) return validar(JSON.parse(readFileSync(ruta(fichero), "utf8")));
  const enLinea = variable("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (enLinea) {
    try {
      return validar(JSON.parse(enLinea));
    } catch {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON no se puede leer: en el .env va repartida en varias líneas. " +
          "Usa GOOGLE_SERVICE_ACCOUNT_FILE con la ruta a un fichero .json.",
      );
    }
  }
  throw new Error("Falta la cuenta de servicio de Google: pon GOOGLE_SERVICE_ACCOUNT_FILE en el .env");
}

function validar(cuenta: Partial<CuentaDeServicio>): CuentaDeServicio {
  if (!cuenta.client_email || !cuenta.private_key) {
    throw new Error("La credencial de Google no parece una cuenta de servicio (falta client_email o private_key)");
  }
  return cuenta as CuentaDeServicio;
}

const tokens = new Map<string, { valor: string; caduca: number }>();

export async function tokenDeAcceso(alcances: string[], cuenta = cargarCuentaDeServicio()): Promise<string> {
  const clave = alcances.slice().sort().join(" ");
  const guardado = tokens.get(clave);
  if (guardado && guardado.caduca > Date.now() + 60_000) return guardado.valor;

  const ahora = Math.floor(Date.now() / 1000);
  const aud = cuenta.token_uri ?? "https://oauth2.googleapis.com/token";
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sinFirmar = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: cuenta.client_email,
    scope: clave,
    aud,
    iat: ahora,
    exp: ahora + 3600,
  })}`;
  const firma = createSign("RSA-SHA256").update(sinFirmar).sign(cuenta.private_key, "base64url");

  const r = await fetch(aud, {
    signal: AbortSignal.timeout(30_000),
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${sinFirmar}.${firma}`,
    }),
  });
  const cuerpo = (await r.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !cuerpo.access_token) {
    throw new Error(`Google no da token a la cuenta de servicio (${r.status}): ${cuerpo.error_description ?? "sin detalle"}`);
  }
  tokens.set(clave, { valor: cuerpo.access_token, caduca: Date.now() + (cuerpo.expires_in ?? 3600) * 1000 });
  return cuerpo.access_token;
}
