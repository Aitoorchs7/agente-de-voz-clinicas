# ESTADO — Fase 3: Las herramientas propias

> **ESTADO: EN CURSO** (arrancada el 25-sep-2026). Todavía no es un traspaso.
>
> Si eres el agente de la Fase 4 y encuentras este fichero así, **para y dilo**: tu punto de partida no
> existe todavía. No supongas lo que habría aquí ni lo reconstruyas leyendo el código — pregunta al humano.

---

## ⏳ Lo que necesito de ti ahora

### Vercel Pro (lo siguiente: sin esto no hay llamadas 4 y 5)

Las llamadas 4 (dos a la vez, el entregable) y 5 (las 00:30) son **a Diego**, y Diego no puede depender
de un túnel en mi ordenador. Decidido el 25-sep: Pro se contrata al final de la Fase 3, que es ahora.

1. Entra en **vercel.com** con tu cuenta de GitHub (la del repositorio).
2. Pasa a **Pro** (20 $ al mes por persona, con 20 $ de uso incluidos; el plan gratuito, Hobby, es
   solo para uso personal no comercial).
3. Crea un **token**: vercel.com/account/tokens → *Create Token* → que valga para ese equipo Pro →
   caducidad de 90 días.
4. Pégalo en el **`.env`**, en una línea nueva: `VERCEL_TOKEN=…`. **En el `.env`, no en la
   conversación.**
5. Avísame. Yo creo el proyecto, subo las variables secretas desde el `.env` sin que pasen por la
   conversación, despliego, lo pruebo con la prueba de humo y **te pido el sí** antes de tocar a Diego.

Mientras tanto preparo el cambio de Diego y su **marcha atrás** a las nativas, y la revisión de
seguridad del webhook antes de exponerlo.

*(Opcional, si te apetece antes: la **3 bis** — llega hasta el final, di «sí» a la confirmación y
cuelga en el mismo segundo. Está cubierta por las pruebas, pero en real nunca sobra.)*

### La llamada 3 (26-sep, 15:15, `01a0ddda-…`): colgar a mitad ✅

| Qué | Resultado |
| --- | --- |
| Pediste las 11:00, que no estaba entre las ofrecidas | ✅ no la descartó: volvió a consultar esa hora exacta (regla de la V1) y te la guardó |
| Hora, nombre y apellidos | ✅ en una sola herramienta |
| Colgaste al pedirte el teléfono | ✅ al colgar: ficha y bloqueos borrados de Redis, sin evento, sin fila en `Citas` |
| ¿Queda libre la hora? | ✅ **en el acto**: otra llamada pidió el jueves a las 11:00 justo después y le dijo «Libre» |
| Fila en `Llamadas` | ✅ «colgó quien llamaba», coste real (0,1071 $) y el resumen: *«ha quedado sin resolver al interrumpirse el proceso antes de finalizar la reserva»* |

Datos de prueba borrados.

### La llamada 2 (26-sep, 15:06, `01a0ddd2-…`): bien, salvo que no colgó

| Paso | Resultado |
| --- | --- |
| Limpieza el martes a las tres (cerrado de 14 a 16) | ✅ «A esa hora la clínica está cerrada»; ofreció la una y cuarto o las cuatro |
| Nombre y apellidos a la vez | ✅ una sola herramienta; te los repitió |
| Teléfono | ✅ **lo pidió**, sin ofrecer «este mismo número» |
| Teléfono de ocho cifras | ✅ «le falta algún dígito, solo tiene ocho» |
| Las nueve cifras | ✅ te lo leyó cifra a cifra, sin «coma» |
| Cita creada | ✅ evento en «Gabinete 1» y fila en `Citas`; al colgar, fila en `Llamadas` con resumen en español y **coste real** (0,2489 $) |
| Bizum | ✅ ofreció el aviso; dijiste que no, y no lo dejó (bien hecho) |
| **Colgar** | ❌ **se despidió y no colgó**: 14 s de silencio hasta que colgaste tú. Arreglado: Vapi cuelga ahora en cuanto el bot dice «que vaya muy bien» (`endCallPhrases`), además de la herramienta de colgar |

Tiempos de cada herramienta en el servidor: entre 0,5 y 1,9 s. Lo que tarda el bot en empezar a hablar
después de que tú acabes (sobre todo al dictar números) es de turnos y endpointing: **Fase 4**.
Datos de prueba borrados.

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
| **Bloques para las herramientas propias**, en la rama `fase3-bloques` (26-sep) | 30 = V1 salvo lo decidido; 50 y 60 reescritos; retirados el 70, `{{hoja_id}}`, `google_sheets_tool.md` y la parte de Sheets de `publicar.ts`. El compilador ya no publica un prompt que nombre una herramienta que el asistente no tenga. 253 pruebas |
| **Asistente de pruebas con las herramientas propias** (26-sep) | GET: solo las cuatro + colgar, prompt nuevo (sin `google_` ni `{{customer.number}}`), servidor con 10 s y un reintento. Una petición real por el túnel: 1,6 s ida y vuelta; sin credencial, 401 |
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
- Ruta de los tipos generados y del test que falla si cambia: `src/vapi/contrato.ts` (tipos y lectura
  del POST) y `tests/contrato.test.ts` (lee los dos fixtures; falla si desaparece `toolCallList`, si
  `arguments` deja de ser un objeto o si el coste deja de estar en `message.cost`).

### Los endpoints en Vercel
| Herramienta | URL |
| --- | --- |
| `consultar_huecos` | |
| `anotar` | |
| `crear_cita` | |
| `escalar_a_recepcion` | |
| `end-of-call-report` | |

### Cómo se declaran las herramientas en el asistente
- Las cuatro propias (`consultar_huecos`, `anotar`, `crear_cita`, `escalar_a_recepcion`) y la de colgar
  (`endCall`) están registradas en Vapi **sin URL propia** (`npm run herramientas` las crea o actualiza,
  con PATCH completo y GET). Van a la URL del **asistente** (`server.url`), con la credencial `bearer`.
- En el asistente: `model.toolIds` = esas cinco, el prompt compilado de los bloques, `server` con 10 s de
  límite y un reintento, y `endCallPhrases: ["que vaya muy bien"]`. Lo construye `src/vapi/servidor.ts`.
- El compilador no publica un prompt que nombre una herramienta que el asistente no tenga.

### Marcha atrás
> Cómo se vuelve a las herramientas nativas si algo falla en mitad de una demo.
- **`npm run cambiar-diego -- --nativas`**, desde esta carpeta (hace falta el `.env`). Deja el `model`
  (prompt `v16`, Calendar y Sheets nativas) y los mensajes **exactamente** como en la copia
  `fichas/dentalvis/nativas.json`, que se guarda sola en el primer cambio a las propias. Tarda unos
  segundos y se comprueba con un GET: se puede hacer entre dos llamadas de la demo.
- `--simular` delante dice qué cambiaría sin tocar nada.
- Para volver a las propias: `npm run cambiar-diego -- --propias --url https://<proyecto>.vercel.app`.
  Antes de tocar a Diego comprueba que el servidor contesta (405 a un GET, 401 sin credencial); si no,
  no hace nada.
- Si ni eso funciona: en el panel de Vapi, Diego → *Tools*, quitar las cuatro propias y poner las tres
  nativas (`google_calendar_check`, `google_calendar_agendamiento`, `google_sheets_tool`). El prompt de las
  propias con las nativas no sirve: por eso el script restaura las dos cosas a la vez.

### El bloqueo temporal
- Cómo funciona: Redis (Upstash, UE), un script Lua atómico por reserva; `consultar_huecos` reserva lo
  que ofrece (dos horas como mucho), elegir una suelta la otra, `crear_cita` lo suelta al crear, y **al
  colgar se sueltan todos en el acto**. Detalle y alternativas: `ADR-004-bloqueo-y-atomicidad.md`.
- **Cuánto tarda en caducar:** **4 minutos desde la última herramienta de la llamada** (cada herramienta
  lo renueva). Solo actúa si se pierde el aviso de fin de llamada; al colgar normalmente se suelta en el
  acto (llamada 3). ← la Fase 4 cuelga llamadas a mitad; va a chocar con esto
- Resultado de la prueba de dos llamadas simultáneas: *(pendiente: llamada 4, a Diego en Vercel)*. Sin
  red y contra Upstash: diez reservas a la vez del mismo hueco → una gana.

### La pestaña `Llamadas`
- ¿Se está rellenando con el **coste real** de cada llamada? **Sí** (desde el asistente de pruebas; en
  Diego, desde el cambio): `message.cost` del `end-of-call-report`, como número (0,2489 $ y 0,1071 $ en
  las llamadas 2 y 3), con la duración en segundos, el motivo de fin en español, un resumen en español
  (Gemini `gemini-3.1-flash-lite`) y la transcripción. Una fila por llamada (`id_llamada`).

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
