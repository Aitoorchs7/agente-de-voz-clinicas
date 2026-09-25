// Convierte los POST crudos capturados (registro/capturas/, no se versiona) en los fixtures del
// contrato (fixtures/vapi/, sí se versiona). No se editan a mano: se regeneran capturando otro POST.
//
//   npm run fijar-contrato                 → coge la última captura de cada tipo (tool-calls y end-of-call-report)
//   npm run fijar-contrato -- <fichero>…   → las capturas que se le digan
//
// Qué se quita, y nada más:
// - el valor de las cabeceras de autenticación (ya viene tapado desde el servidor de captura);
// - las cabeceras que añade el túnel (cf-*, x-forwarded-*…): en Vercel no existirán;
// - las URLs de control de la llamada (monitor, webCallUrl…) y la del túnel; los credentialId;
// - cualquier campo que se llame token, secret, password o apiKey.
// El resto —incluido el prompt entero y la conversación, que son de una clínica inventada— se queda:
// es justo lo que el contrato tiene que congelar.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ruta } from "../src/entorno.js";

const TIPOS = ["tool-calls", "end-of-call-report"] as const;
const DEL_TUNEL = /^(cf-|cdn-loop$|x-forwarded-|x-real-ip$|true-client-ip$)/i;
const CLAVE_SECRETA = /(token|secret|password|apikey|api_key)$/i;

export function limpiar(valor: unknown, clave = ""): unknown {
  if (Array.isArray(valor)) return valor.map((v) => limpiar(v));
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiar(v, k)]));
  }
  if (typeof valor !== "string") return valor;
  if (CLAVE_SECRETA.test(clave)) return "<oculto>";
  if (clave === "credentialId") return "<credentialId>";
  if (/^wss?:\/\//i.test(valor)) return "<url de la llamada: no se guarda>";
  if (/trycloudflare\.com/i.test(valor)) return valor.replace(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi, "https://<túnel>");
  if (/url$/i.test(clave) && /^https?:\/\//i.test(valor) && !/docs\.vapi\.ai/.test(valor)) return "<url de la llamada: no se guarda>";
  return valor;
}

function capturas(): string[] {
  const carpeta = ruta("registro", "capturas");
  return readdirSync(carpeta).filter((f) => f.endsWith(".json")).sort().map((f) => join(carpeta, f));
}

const pedidas = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const elegidas = pedidas.length
  ? pedidas
  : TIPOS.map((t) => capturas().filter((f) => basename(f).endsWith(`-${t}.json`)).at(-1)).filter((f): f is string => !!f);
if (!elegidas.length) throw new Error("No hay capturas en registro/capturas/. Haz antes la llamada de captura.");

mkdirSync(ruta("fixtures", "vapi"), { recursive: true });
for (const fichero of elegidas) {
  const c = JSON.parse(readFileSync(fichero, "utf8")) as { recibido: string; cabeceras: Record<string, unknown>; cuerpo: string };
  const cuerpo = JSON.parse(c.cuerpo) as { message?: { type?: string } };
  const tipo = cuerpo.message?.type ?? "desconocido";
  const cabeceras = Object.fromEntries(Object.entries(c.cabeceras).filter(([k]) => !DEL_TUNEL.test(k)));
  const fixture = {
    _nota:
      "POST REAL de Vapi, capturado con una llamada de Talk al asistente de pruebas. Es el contrato del webhook: " +
      "no se edita a mano, se regenera capturando otro (npm run fijar-contrato).",
    capturado: c.recibido,
    cabeceras,
    cuerpo: limpiar(cuerpo),
  };
  const destino = ruta("fixtures", "vapi", `${c.recibido.slice(0, 10)}-${tipo}.json`);
  writeFileSync(destino, JSON.stringify(fixture, null, 2) + "\n", "utf8");
  console.log(`  · ${basename(fichero)} → fixtures/vapi/${basename(destino)}`);
}
