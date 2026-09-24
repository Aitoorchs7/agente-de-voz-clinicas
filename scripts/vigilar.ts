// El bucle: recompila cada cinco minutos (PLAN.md §2 y §8). Solo publica si algo ha cambiado en la
// hoja o en los bloques; si no, lo apunta y espera.
//
//   npm run vigilar                        → dentalvis, cada 5 minutos
//   npm run vigilar -- otra-clinica --cada=2
//
// Durante la Fase 2 corre en local (hay que dejar esta ventana abierta). Al final del proyecto se
// sustituye por el cron de Vercel (plan Pro) llamando a api/compilar.ts: ver fases/fase2-compilador/ESTADO.md.

import { cicloDeCompilacion } from "../src/compilador/ciclo.js";

const args = process.argv.slice(2);
const clinica = args.find((a) => !a.startsWith("--")) ?? "dentalvis";
const minutos = Number(args.find((a) => a.startsWith("--cada="))?.split("=")[1] ?? 5);
if (!(minutos >= 1)) throw new Error("--cada tiene que ser un número de minutos, 1 o más");

async function vuelta(): Promise<void> {
  const r = await cicloDeCompilacion(clinica).catch((e: Error) => ({ ok: false, resumen: e.message, lineas: [] as string[] }));
  const cuando = new Date().toLocaleTimeString("es-ES");
  console.log(`${cuando} · ${clinica} · ${r.resumen}`);
  for (const l of r.lineas) console.log(`    ${l}`);
  const siguiente = new Date(Date.now() + minutos * 60_000).toLocaleTimeString("es-ES");
  console.log(`    siguiente vuelta: ${siguiente}\n`);
}

console.log(`Vigilando la hoja de «${clinica}» cada ${minutos} minutos. Ctrl+C para parar.\n`);
await vuelta();
setInterval(vuelta, minutos * 60_000);
