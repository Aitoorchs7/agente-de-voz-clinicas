# ESTADO — Fase 3: Las herramientas propias

> **ESTADO: EN CURSO** (arrancada el 25-sep-2026). Todavía no es un traspaso.
>
> Si eres el agente de la Fase 4 y encuentras este fichero así, **para y dilo**: tu punto de partida no
> existe todavía. No supongas lo que habría aquí ni lo reconstruyas leyendo el código — pregunta al humano.

---

## ⏳ Lo que necesito de ti ahora

### 1. Dos decisiones tras la llamada 1 (hecha el 26-sep, 13:51)

La llamada 1 dio lo que buscaba (el contrato, abajo) y **tres fallos que tú oíste**. Los tres tienen la
misma raíz: **dejarle al modelo algo que el servidor sabe hacer mejor.**

| Lo que oíste | Qué pasó de verdad (del registro de Vapi) |
| --- | --- |
| **Tardó en procesar al principio** (casi 13 s de «un segundo») | Acabaste de hablar en el segundo 21,8 y la respuesta llegó en el 34,6. En medio, **cuatro herramientas una detrás de otra**: `anotar` ×3 (tratamiento, fecha, hora) y la comprobación del calendario. Cada una es un turno del modelo, con su «un segundo». Las tres `anotar` sobraban: las provoqué yo con la descripción de la herramienta de captura. |
| **Ofreció «este mismo número»** en una llamada web, sin número | El modelo **vio** la línea `«{{customer.number}}»` y la regla de que un texto entre llaves significa que no hay número, y **aun así lo ofreció**. El arreglo de la `v15` **no funciona**: es una regla que el modelo tiene que aplicar él solo, lejos del momento en que la necesita. |
| **Leyó el teléfono «6 1 2 coma 3 coma 4…»** | El bloque 50 dice «los nueve, uno por uno, **separados por comas**». El modelo escribió la palabra «coma» y las cifras en número. |

**Decisión A — el diseño de las herramientas (recomiendo el sí).** Tres cambios sobre lo aprobado:

1. `consultar_huecos` **apunta ella misma** el tratamiento, el día y la hora que pide el paciente. Para
   eso no hay `anotar`. En esta llamada, eso deja una sola herramienta al principio en vez de cuatro.
2. `anotar` acepta **varios datos en una sola llamada** (nombre y apellidos juntos) en vez de uno solo.
3. **El servidor decide lo del teléfono y lo dice en el momento.** Al anotar los apellidos, la respuesta
   dice «Esta llamada no trae número: pídeselo» o «Viene del 612…: pregúntale si le llamamos a ese».
   Al anotar un teléfono, la respuesta trae **las cifras ya escritas en palabras** («seis, uno, dos, …»)
   y la orden de leerlas tal cual. El bloque 50 deja de hablar de `{{customer.number}}` y de «comas».

**Decisión B — Diego mientras tanto.** Diego tiene ahora mismo los dos fallos del teléfono en cada demo
por el navegador. Recomiendo **no parchearlo**: el cambio a las herramientas propias es de esta fase y
los arregla de raíz, y un parche de prompt ya falló una vez. Si tienes una demo antes, dímelo y le pongo
un `v17` mínimo: pedir siempre el teléfono y leerlo en palabras.


### 2. «Gabinete 2»: la cuenta de servicio solo puede VER, no escribir

Los IDs ya están dados de alta y apuntados en `fichas/dentalvis/ficha.json` (el segundo que me pasaste
como «Gabinete 1» es, según Google, **«Gabinete 3 »**: lo he comprobado por su nombre). Lo que ve ahora
la cuenta de servicio:

| Calendario | Permiso | ¿Vale? |
| --- | --- | --- |
| Gabinete 1 | `writer` | ✅ |
| Gabinete 2 | `reader` | ❌ **solo lectura**: no podría crear citas de ortodoncia (`ORT`) |
| Gabinete 3 | `writer` | ✅ |

**Qué hacer:** Google Calendar → ⚙ Configuración → «Gabinete 2» → **Compartir con determinadas personas**
→ la cuenta de servicio → cambiar el permiso a **«Hacer cambios en eventos»**. Avísame y lo compruebo.
No corre prisa: lo necesito cuando escriba en calendarios, no para la llamada 1.

---

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
- **Pendientes, ya aprobadas:** reescribir en el §6 la frase del formato del webhook con lo que diga el
  fixture; marcar en el §5 el `70` y `{{hoja_id}}` como retirados, al cerrar la fase.
