// Registra en Vapi (o pone al día) las herramientas propias y la de colgar. No las engancha a ningún
// asistente: eso lo hacen scripts/asistente-pruebas.ts (pruebas) y el cambio de Diego (al final).
//
//   npm run herramientas               → crea o actualiza, y dice los IDs
//   npm run herramientas -- --simular  → dice qué haría, sin tocar nada

import { sincronizarHerramientas } from "../src/herramientas/registro.js";
import { clienteVapi } from "../src/vapi/cliente.js";

const simular = process.argv.includes("--simular");
const r = await sincronizarHerramientas(clienteVapi(), { simular });
for (const h of r) console.log(`  · ${h.nombre.padEnd(20)} ${h.estado.padEnd(16)} ${h.id}`);
