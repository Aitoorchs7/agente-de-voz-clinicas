// El túnel de desarrollo, vigilado. Los túneles rápidos de cloudflared (sin cuenta) no garantizan nada:
// el 25-sep uno murió a los 40 minutos con «Unauthorized: Tunnel not found» y su dirección dejó de
// existir. Este script arranca cloudflared, apunta el asistente de PRUEBAS a la dirección nueva y, si el
// túnel se cae o deja de contestar, lo vuelve a levantar y a apuntar. Diego no se toca nunca.
//
//   npm run receptor                          → servidor local de captura + túnel, los dos vigilados
//   npm run tunel                             → solo el túnel (el servidor ya escuchando en el 8787)
//
// Todo vive lo que viva este proceso. El 26-sep una llamada de prueba encontró el túnel muerto porque
// la sesión que lo había lanzado ya no existía: si se va a llamar sin nadie delante, se lanza
// `npm run receptor` en una terminal propia y se deja abierta.
//
// Solo es para desarrollo, mientras no hay Vercel (el plan Pro se contrata al final de la Fase 3).

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { variable } from "../src/entorno.js";

const PUERTO = Number(variable("PUERTO") ?? 8787);
const BINARIO =
  variable("CLOUDFLARED") ??
  ["C:\\Program Files (x86)\\cloudflared\\cloudflared.exe", "C:\\Program Files\\cloudflared\\cloudflared.exe"].find(existsSync) ??
  "cloudflared";
const conServidor = process.argv.includes("--con-servidor");

let proceso: ChildProcess | null = null;
let servidor: ChildProcess | null = null;
let direccion: string | null = null;
let fallosSalud = 0;
let parando = false;
const hora = () => new Date().toLocaleTimeString("es-ES");

/** Un script del proyecto con el mismo Node y tsx cargado: sin shell, sin nietos que queden sueltos. */
function script(fichero: string, argumentos: string[]): ChildProcess {
  return spawn(process.execPath, ["--import", "tsx", fichero, ...argumentos], { stdio: ["ignore", "pipe", "pipe"] });
}

function arrancarServidor(): void {
  servidor = script("scripts/servidor-local.ts", ["--captura"]);
  const reenviar = (d: Buffer) => process.stdout.write(d.toString().replace(/^(?=.)/gm, "  [servidor] "));
  servidor.stdout!.on("data", reenviar);
  servidor.stderr!.on("data", reenviar);
  servidor.on("exit", (codigo) => {
    if (parando) return;
    console.log(`${hora()} · ⚠ el servidor local ha terminado (código ${codigo}): se vuelve a arrancar`);
    setTimeout(arrancarServidor, 2_000);
  });
}

function apuntarAsistente(url: string): Promise<boolean> {
  return new Promise((resolver) => {
    const p = script("scripts/asistente-pruebas.ts", ["--url", url]);
    let salida = "";
    p.stdout!.on("data", (d) => (salida += d));
    p.stderr!.on("data", (d) => (salida += d));
    p.on("close", (codigo) => {
      console.log(`${hora()} · asistente de pruebas → ${url}: ${codigo === 0 ? "apuntado y comprobado" : "⚠ FALLÓ"}`);
      if (codigo !== 0) console.log(salida.slice(-600));
      resolver(codigo === 0);
    });
  });
}

function arrancar(): void {
  direccion = null;
  fallosSalud = 0;
  proceso = spawn(BINARIO, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PUERTO}`], { stdio: ["ignore", "ignore", "pipe"] });
  let buffer = "";
  proceso.stderr!.on("data", async (trozo: Buffer) => {
    buffer += trozo.toString();
    const url = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
    if (url && !direccion) {
      direccion = url;
      console.log(`${hora()} · túnel arriba: ${url}`);
      await apuntarAsistente(url);
    }
    if (/Tunnel not found|failed to request quick Tunnel/i.test(trozo.toString())) reiniciar("Cloudflare ha dado de baja el túnel");
    if (buffer.length > 20_000) buffer = buffer.slice(-5_000);
  });
  proceso.on("exit", (codigo) => {
    if (proceso && !parando) reiniciar(`cloudflared ha terminado (código ${codigo})`);
  });
}

function reiniciar(motivo: string): void {
  console.log(`${hora()} · ⚠ ${motivo}: se levanta otro túnel`);
  const viejo = proceso;
  proceso = null;
  viejo?.kill();
  setTimeout(arrancar, 2_000);
}

// Salud: cada minuto, a través del túnel, hasta el servidor local. Dos fallos seguidos → otro túnel.
setInterval(async () => {
  if (!direccion || !proceso) return;
  const ok = await fetch(`${direccion}/salud`, { signal: AbortSignal.timeout(10_000) }).then((r) => r.ok).catch(() => false);
  fallosSalud = ok ? 0 : fallosSalud + 1;
  if (fallosSalud >= 2) reiniciar("el túnel no contesta");
}, 60_000);

function parar(): void {
  parando = true;
  proceso?.kill();
  servidor?.kill();
  process.exit(0);
}
process.on("SIGINT", parar);
process.on("SIGTERM", parar);

console.log(`Túnel vigilado hacia http://localhost:${PUERTO} (${BINARIO})${conServidor ? ", con el servidor de captura" : ""}. Ctrl+C para parar.`);
if (conServidor) arrancarServidor();
arrancar();
