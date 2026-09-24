// El disparo manual: el «botón» del punto 3 de la demo (PLAN.md §7).
//
//   npm run compilar                       → compila y publica la ficha de dentalvis
//   npm run compilar -- otra-clinica       → la de otra clínica (fichas/otra-clinica/ficha.json)
//   npm run compilar -- --simular          → enseña el contador y lo que cambiaría, sin publicar
//
// Sale con código 1 si no ha publicado por un problema, para que se note.

import { cicloDeCompilacion } from "../src/compilador/ciclo.js";

const args = process.argv.slice(2);
const simular = args.includes("--simular");
const clinica = args.find((a) => !a.startsWith("--")) ?? "dentalvis";

const r = await cicloDeCompilacion(clinica, { simular });
console.log(`\n${clinica} · ${r.resumen}`);
for (const l of r.lineas) console.log(`    ${l}`);
if (simular && r.ok) console.log(`\n    El texto completo está en registro/simulacion-${clinica}.md`);
process.exitCode = r.ok ? 0 : 1;
