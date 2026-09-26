# ESTADO — Fase 3: Las herramientas propias

> **ESTADO: EN CURSO** (arrancada el 25-sep-2026). Todavía no es un traspaso.
>
> Si eres el agente de la Fase 4 y encuentras este fichero así, **para y dilo**: tu punto de partida no
> existe todavía. No supongas lo que habría aquí ni lo reconstruyas leyendo el código — pregunta al humano.

---

## ⏳ Lo que necesito de ti ahora

**Nada, por ahora.** Estoy reescribiendo los bloques del prompt para las herramientas propias, en la rama
`fase3-bloques` (Diego sigue en `main` con las nativas, sin tocar). Cuando el asistente de pruebas tenga
el prompt nuevo, te pido aquí la **llamada 2**.

### Decidido el 26-sep-2026, tras la llamada 1

- **A, sí:** `consultar_huecos` apunta ella misma tratamiento y día; `anotar` recibe varios datos a la
  vez; el teléfono lo decide el servidor en su respuesta (si la llamada trae número o no, y las cifras ya
  en palabras para leerlas tal cual). *«Si tú crees que van a mejorar la eficiencia y seguridad del bot.»*
- **B:** a Diego no se le parchea: no hay otra demo antes del cambio.
- Gabinete 2: permisos cambiados. Los tres calendarios responden ahora `owner` (bastaría `writer`,
  «Hacer cambios en eventos»; no bloquea nada).

### Lo que enseñó la llamada 1 (26-sep, 13:51, `01a0dd8e-…`)

| Lo que oíste | Qué pasó de verdad (del registro de Vapi) | Arreglo |
| --- | --- | --- |
| Tardó casi 13 s en contestar al principio | Cuatro herramientas seguidas (`anotar` ×3 + calendario), cada una un turno del modelo con su «un segundo». Las tres `anotar` las provocó la descripción de captura | Decisión A: una sola herramienta al principio |
| Ofreció «este mismo número» sin haberlo | El modelo vio `«{{customer.number}}»` sin rellenar y la regla de la `v15`, y la ignoró | El servidor lo dice en la respuesta de `anotar` |
| Leyó «6 1 2 coma 3 coma 4…» | El bloque 50 decía «separados por comas» | `anotar` devuelve las cifras en palabras; el bloque deja de hablar de comas |

## Lo hecho hasta ahora (25-sep-2026)

| Qué | Cómo se comprobó |
| --- | --- |
| Correcciones aprobadas a `PLAN.md`, `ORQUESTACION.md` y mi `CLAUDE.md` | Commit `206e397` |
| Catálogo de Gemini | `gemini-3.5-flash` y `gemini-3.1-flash-lite` contestan; los `2.5`, `404`. Sin cambios |
| **Migración de `Llamadas`** | La vieja (8 columnas, sin cabecera, 2 filas) es ahora **`Llamadas_fase1`**; la nativa de Diego escribe ahí (`metadata.range` con PATCH completo + GET, y el `70`). `Llamadas` nueva con las columnas del §4 + `id_llamada` |
| Diego `v15 → v16` | GET comparado con la copia de antes: **la única diferencia es la línea del rango**. Modelo, `toolIds`, voz, todo igual. Copia en `registro/asistente-antes-fase3.json` |
| `id_llamada` en `Citas`, `Llamadas`, `Escalados` | En `esquema.ts`, en Dentalvis y en la plantilla. `preparar-hoja` añade ya solo las columnas nuevas a pestañas con datos |
| Upstash Redis | `PING` y un `EVAL` con `SET NX PX` desde aquí: responden |
| `cloudflared` 2026.9.3 | Instalado con `winget` (MSI oficial, hash verificado) |
| Credencial del webhook | Credencial `bearer` en Vapi (`a6492211-…`); el secreto, generado y guardado solo en el `.env` |
| Herramientas propias en Vapi, **sin URL propia** | `consultar_huecos` `b2da16f7-…` · `anotar` `132c5407-…` · `crear_cita` `0b220ead-…` · `escalar_a_recepcion` `deeb0534-…` · colgar (`endCall`) `dea8a9da-…`. **Ninguna enganchada a Diego** |
| Asistente de pruebas `0854f732-…` | Creado como copia de Diego; comparado campo a campo |
| Hora de la clínica, fechas y horas en palabras, validación de teléfono y nombre (de la V1) | Pruebas de la franja 23:00–01:00 minuto a minuto y de los cambios de hora del 29-mar y 25-oct-2026 |
| **Bloqueo temporal** en Redis (scripts Lua atómicos), ficha de la llamada y candado de la hoja | La misma batería en memoria y **contra Upstash de verdad**: 18 de 18, incluidas **diez llamadas a la vez por la misma hora → se la lleva una** |
| Calendarios por gabinete (26-sep) | Los tres dados de alta en la lista de la cuenta de servicio y apuntados en la ficha (`calendarios`, clave = nombre del gabinete de Tratamientos). Gabinete 2 solo en lectura: ver arriba |
| **Llamada 1** (26-sep, 13:51, `01a0dd8e-…`) | (b) contrato capturado ✅ · (c) fila en `Llamadas_fase1` con el teléfono en cifras ✅ (la migración funciona; la cita, a las 18:00 de Madrid, bien) · (a) teléfono ❌: ofreció «este mismo número» sin haberlo. Evento de prueba borrado de «Gabinete 1» (copia en `registro/`) |
| **Las cuatro herramientas, el cierre y el webhook** (26-sep) | `src/herramientas/manejadores.ts`, `src/llamada/cierre.ts`, `src/vapi/webhook.ts`, `api/vapi.ts`. 250 pruebas sin red (incluidas dos llamadas a la vez por la misma hora, bloqueo caducado, compensación si falla la hoja, reintento de Vapi, eventos huérfanos al colgar) |
| **Prueba de humo contra los servicios de verdad** (`npm run humo`) | La cadena entera con los POST que mandaría Vapi: cita en «Gabinete 1», filas en `Citas`, `Escalados` y `Llamadas` (resumen de Gemini en español, coste como número), y todo borrado después con `npm run limpiar-pruebas`. Tiempos: `consultar_huecos` 1,4 s (leyendo la hoja por primera vez) · `anotar` 0,25 s · `crear_cita` 1,8 s · `escalar_a_recepcion` 1,3 s |
| Receptor de desarrollo en un solo comando (26-sep) | `npm run receptor`: servidor + túnel vigilados. Prueba de humo desde fuera con la credencial: `tool-calls` → «Anotado.» |

**Lo que enseñó el primer intento de la llamada 1** (y que va a los bloques y a la configuración del
servidor, no solo a las pruebas): **si nuestro servidor no contesta, el bot se queda mudo.** Vapi le
pasa al modelo, como resultado de la herramienta, un texto en inglés («Your server rejected `tool-calls`
webhook…»); el bot dijo «miro la agenda» y no volvió a hablar. En Vercel esto será raro, pero el bot
tiene que saber salir: los bloques dirán qué hacer cuando una herramienta falla (disculparse, tomar nota
por `escalar_a_recepcion` si se puede, y si no, dar el teléfono de recepción), y el servidor llevará un
`backoffPlan` de Vapi con un reintento para los fallos de red.

**Dos cosas de Vapi que conviene saber**, vistas en su especificación OpenAPI (`api.vapi.ai/api-json`):

- `endCallFunctionEnabled`, `silenceTimeoutSeconds` y `backgroundDenoisingEnabled` **ya no existen** en la
  API. Diego los conserva de antes y le funcionan, pero un asistente nuevo no puede llevarlos: para colgar
  necesita la herramienta `endCall`. Y a los asistentes nuevos Vapi les añade de oficio un respaldo de
  transcriptor que Diego no tiene.
- `server.timeoutSeconds` vale **20 s** por defecto y, sin `backoffPlan`, **Vapi no reintenta**.
- Los webhooks salen de **EE. UU.** (`cf-ipcountry: US` en la captura), y Upstash está en Irlanda. Para la
  región de Vercel: cada herramienta hace varias órdenes a Redis y a Google, y cruzar el Atlántico una
  vez (Vapi → Vercel en la UE) sale más barato que cruzarlo en cada orden. Se mide al desplegar.

---

### El contrato del webhook
- Ruta del fixture con el POST real: `fixtures/vapi/2026-09-26-tool-calls.json` y
  `fixtures/vapi/2026-09-26-end-of-call-report.json` (llamada `01a0dd8e-…` al asistente de pruebas).
  Limpios: sin la credencial, sin las URL de la llamada (control, escucha, registro, grabación) y sin el túnel.
- Fecha de captura: 26-sep-2026, 13:51–13:54.
- Forma que llegó (`toolCallList` o `toolCalls`): **las dos, y además `toolWithToolCallList`**, con lo
  mismo: `{ id, type: "function", function: { name, arguments } }` y **`arguments` como objeto**. Se lee
  `message.toolCallList[].function`. Autorización: `Authorization: Bearer …` de la credencial, correcta.
  El coste real: `message.cost` del `end-of-call-report` (0,2048 $ esta llamada; `message.call.cost` llega a 0).
- Ruta de los tipos generados y del test que falla si cambia: *(pendiente: `src/vapi/contrato.ts`)*

### Los endpoints en Vercel
| Herramienta | URL |
| --- | --- |
| `consultar_huecos` | |
| `anotar` | |
| `crear_cita` | |
| `escalar_a_recepcion` | |
| `end-of-call-report` | |

### Marcha atrás
> Cómo se vuelve a las herramientas nativas si algo falla en mitad de una demo.
-

### El bloqueo temporal
- Cómo funciona:
- **Cuánto tarda en caducar:** ← la Fase 4 cuelga llamadas a mitad; va a chocar con esto
- Resultado de la prueba de dos llamadas simultáneas:

### La pestaña `Llamadas`
- ¿Se está rellenando con el **coste real** de cada llamada? (sí/no)

### La prueba de las 00:30
- Fecha y hora reales de la llamada:
- Resultado:

---

## Contradicciones con PLAN.md detectadas en esta fase

> `PLAN.md` es la fuente de verdad. Si has encontrado que está mal o desactualizado, **no diverjas
> en silencio**: anótalo aquí y en `fases/ORQUESTACION.md` con la corrección concreta que propones
> (qué sección, qué dice, qué debería decir y por qué). Corregir el plan lo decide el humano.

- **Aplicadas el 25-sep-2026, con aprobación del humano:** §6 (Vercel Pro desde el primer despliegue;
  patrón de bloqueo sí, almacén no; la documentación de Vapi se contradice sobre el webhook; qué es el
  «aviso»), §4 (calendarios por gabinete en la ficha, `id_llamada`), §10 (coherente con lo de Vercel) y
  `ORQUESTACION.md` (diez bloques, un solo endpoint).
- **Aplicadas el 26-sep-2026:** §6, el formato del webhook reescrito con el fixture real (aprobado el 25);
  §6, `anotar` ya no es «un dato cada vez, y solo con ese dato», sino lo que el paciente diga en esa frase,
  y el tratamiento y el día los apunta `consultar_huecos` (decisión A del humano, tras la llamada 1).
- **Pendiente, ya aprobada:** marcar en el §5 el `70` y `{{hoja_id}}` como retirados, al cerrar la fase.
