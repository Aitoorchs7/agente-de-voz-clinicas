// Ficha de la llamada y candado de la hoja, en memoria. Contra Redis de verdad: tests/integracion/.

import { candadosEnMemoria } from "../src/bloqueo/candado.js";
import { fichasEnMemoria } from "../src/llamada/ficha.js";
import { pruebasDeCandado, pruebasDeFicha } from "./comun/ficha-y-candado.js";

pruebasDeFicha("en memoria", () => fichasEnMemoria());
pruebasDeCandado("en memoria", () => candadosEnMemoria());
