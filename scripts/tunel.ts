// El túnel de desarrollo, vigilado. Los túneles rápidos de cloudflared (sin cuenta) no garantizan nada:
// el 25-sep uno murió a los 40 minutos con «Unauthorized: Tunnel not found» y su dirección dejó de
// existir. Este script arranca cloudflared, apunta el asistente de PRUEBAS a la dirección nueva y, si el
// túnel se cae o deja de contestar, lo vuelve a levantar y a apuntar. Diego no se toca nunca.
//
//   npm run tunel          (con el servidor local ya escuchando en el 8787: npm run servidor -- --captura)
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

let proceso: ChildProcess | null = null;
let direccion: string | null = null;
let fallosSalud = 0;
const hora = () => new Date().toLocaleTimeString("es-ES");

function apuntarAsistente(url: string): Promise<boolean> {
  return new Promise((resolver) => {
    const p = spawn("npx", ["tsx", "scripts/asistente-pruebas.ts", "--url", url], { shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let salida = "";
    p.stdout.on("data", (d) => (salida += d));
    p.stderr.on("data", (d) => (salida += d));
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
    if (proceso) reiniciar(`cloudflared ha terminado (código ${codigo})`);
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

process.on("SIGINT", () => {
  proceso?.kill();
  process.exit(0);
});
console.log(`Túnel vigilado hacia http://localhost:${PUERTO} (${BINARIO}). Ctrl+C para parar.`);
arrancar();
