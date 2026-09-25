// Servidor local para desarrollar las herramientas detrás de un túnel (`cloudflared`), mientras no hay
// Vercel (el plan Pro se contrata al final de la Fase 3).
//
//   npm run servidor -- --captura   → guarda cada POST TAL CUAL en registro/capturas/ y contesta lo mínimo
//
// En modo captura no se interpreta nada: lo que se busca es precisamente lo que no se espera (skill
// fijar-contrato-webhook-vapi). Lo único que no se guarda es el VALOR de la cabecera de autorización:
// en su lugar se apunta si era la correcta. registro/ no se versiona; el fixture limpio sale de aquí.
//
// Puerto: 8787, o la variable PUERTO.

import { createServer, type IncomingMessage } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { ruta, variable } from "../src/entorno.js";
import { autorizado } from "../src/vapi/autenticacion.js";

const args = process.argv.slice(2);
const captura = args.includes("--captura");
const puerto = Number(variable("PUERTO") ?? 8787);
if (!captura) {
  console.error("Por ahora solo existe el modo captura: npm run servidor -- --captura");
  process.exit(1);
}

const carpeta = ruta("registro", "capturas");
mkdirSync(carpeta, { recursive: true });
const secreto = variable("VAPI_WEBHOOK_SECRET");
const CABECERAS_SECRETAS = new Set(["authorization", "cookie", "proxy-authorization", "x-vapi-secret"]);

function leerCuerpo(peticion: IncomingMessage): Promise<string> {
  return new Promise((resolver, fallar) => {
    const trozos: Buffer[] = [];
    peticion.on("data", (t: Buffer) => trozos.push(t));
    peticion.on("end", () => resolver(Buffer.concat(trozos).toString("utf8")));
    peticion.on("error", fallar);
  });
}

/** Todas las herramientas llamadas en el POST, se lean por donde se lean: aún no sabemos cuál vale. */
function llamadasEn(cuerpo: unknown): { id: string; nombre: string }[] {
  const m = (cuerpo as { message?: Record<string, unknown> })?.message ?? {};
  const vistas = new Map<string, string>();
  for (const c of (m.toolCallList as Record<string, any>[] | undefined) ?? []) if (c?.id) vistas.set(c.id, c.function?.name ?? c.name ?? "");
  for (const c of (m.toolCalls as Record<string, any>[] | undefined) ?? []) if (c?.id && !vistas.has(c.id)) vistas.set(c.id, c.function?.name ?? c.name ?? "");
  for (const t of (m.toolWithToolCallList as Record<string, any>[] | undefined) ?? []) {
    const id = t?.toolCall?.id;
    if (id && !vistas.has(id)) vistas.set(id, t?.toolCall?.function?.name ?? t?.function?.name ?? t?.name ?? "");
  }
  return [...vistas].map(([id, nombre]) => ({ id, nombre }));
}

const servidor = createServer(async (peticion, respuesta) => {
  const cuando = new Date();
  if (peticion.method === "GET" && peticion.url === "/salud") {
    respuesta.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("ok");
    return;
  }
  if (peticion.method !== "POST" || !peticion.url?.startsWith("/api/vapi")) {
    respuesta.writeHead(404).end();
    return;
  }
  const crudo = await leerCuerpo(peticion);
  let json: unknown = null;
  try {
    json = JSON.parse(crudo);
  } catch {
    // Se guarda igual: si no es JSON, también es información.
  }
  const tipo = String((json as { message?: { type?: string } })?.message?.type ?? "desconocido");
  const auth = peticion.headers.authorization;
  const estadoAuth = !auth ? "ausente" : autorizado(auth, secreto) ? "correcta" : "incorrecta";
  const cabeceras = Object.fromEntries(
    Object.entries(peticion.headers).map(([k, v]) => [k, CABECERAS_SECRETAS.has(k) ? `[no se guarda · autorización ${estadoAuth}]` : v]),
  );
  const nombre = `${cuando.toISOString().replace(/[:.]/g, "-")}-${tipo}.json`;
  writeFileSync(
    ruta("registro", "capturas", nombre),
    JSON.stringify({ recibido: cuando.toISOString(), metodo: peticion.method, ruta: peticion.url, cabeceras, cuerpo: crudo }, null, 2),
    "utf8",
  );

  let contestacion: unknown = {};
  if (tipo === "tool-calls") {
    // Lo mínimo para que la conversación siga. El contrato de la respuesta también se fija con esta
    // llamada: si el bot usa «Anotado.», Vapi ha entendido la forma.
    contestacion = { results: llamadasEn(json).map((c) => ({ name: c.nombre, toolCallId: c.id, result: "Anotado." })) };
  }
  respuesta.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(contestacion));
  console.log(`${cuando.toLocaleTimeString("es-ES")} · POST ${tipo} · autorización ${estadoAuth} · ${crudo.length} bytes → ${nombre}`);
});

servidor.listen(puerto, () => console.log(`Servidor local en modo CAPTURA en http://localhost:${puerto}/api/vapi (guarda en registro/capturas/)`));
