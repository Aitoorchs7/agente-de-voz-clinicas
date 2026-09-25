# ESTADO — Fase 3: Las herramientas propias

> **ESTADO: EN CURSO** (arrancada el 25-sep-2026). Todavía no es un traspaso.
>
> Si eres el agente de la Fase 4 y encuentras este fichero así, **para y dilo**: tu punto de partida no
> existe todavía. No supongas lo que habría aquí ni lo reconstruyas leyendo el código — pregunta al humano.

---

## ⏳ Lo que necesito de ti ahora

### 1. La llamada 1 — captura del contrato + teléfono + migración (lista desde el 25-sep, 22:48)

- **A qué asistente:** **`PRUEBAS F3 · no usar en demos`** (panel de Vapi → Assistants → ese → **Talk**).
  **No a Diego.** Es una copia exacta de Diego (mismo prompt `v16`, voz, modelo y herramientas nativas)
  con dos cosas más: la herramienta `anotar` y el servidor apuntando a mi receptor.
- **Qué hacer:**
  1. Pide cita para **una limpieza**, el día que quieras dentro del horario.
  2. Da un **nombre y un apellido inventados**.
  3. Cuando llegue el teléfono, **fíjate en si te lo PIDE o te ofrece «este mismo número»**. Tiene que
     pedírtelo: en una llamada web no hay número. Dale uno **inventado de nueve cifras**.
  4. Confirma la cita.
  5. **Despídete y deja que cuelgue él.** Si cuelgas tú antes, puede no llegar a apuntar la fila en
     `Llamadas_fase1`, y es una de las tres cosas que compruebo.
- **Qué saco de esta llamada:** (a) que el bot pide el teléfono; (b) los dos POST reales, `tool-calls` y
  `end-of-call-report`, que son el contrato; (c) la fila en `Llamadas_fase1`, con el teléfono en cifras.
- **El receptor y el túnel están corriendo ahora en mi sesión**, y el túnel va **vigilado**: el primero
  murió solo a los 40 minutos (Cloudflare da de baja los túneles rápidos sin avisar), así que si cae se
  levanta otro y el asistente de pruebas se reapunta solo. Si aun así el bot se queda callado tras dar
  el nombre, o dice que no puede apuntar, dímelo: una llamada en curso no sobrevive a un cambio de túnel.
- La cita que cree es de prueba (irá al calendario «Gabinete 1» por la herramienta nativa). La borraré
  al comprobarla, salvo que me digas que la deje.

### 2. Los IDs de «Gabinete 2» y «Gabinete 3»

La cuenta de servicio **no ve** los calendarios que se comparten con ella hasta que se le dan sus IDs:
Google no los añade solos a su lista. Solo ve el que ya había (que ahora se llama «Gabinete 1 », con un
espacio al final; da igual, el nombre no se usa).

Para cada uno: Google Calendar → ⚙ Configuración → el calendario → **Integrar el calendario** → **ID
del calendario** (algo como `…@group.calendar.google.com`). Pégamelos en la conversación: no son
secretos, van a `fichas/dentalvis/ficha.json`.

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

**Dos cosas de Vapi que conviene saber**, vistas en su especificación OpenAPI (`api.vapi.ai/api-json`):

- `endCallFunctionEnabled`, `silenceTimeoutSeconds` y `backgroundDenoisingEnabled` **ya no existen** en la
  API. Diego los conserva de antes y le funcionan, pero un asistente nuevo no puede llevarlos: para colgar
  necesita la herramienta `endCall`. Y a los asistentes nuevos Vapi les añade de oficio un respaldo de
  transcriptor que Diego no tiene.
- `server.timeoutSeconds` vale **20 s** por defecto y, sin `backoffPlan`, **Vapi no reintenta**.

---

### El contrato del webhook
- Ruta del fixture con el POST real:
- Fecha de captura:
- Forma que llegó (`toolCallList` o `toolCalls`):
- Ruta de los tipos generados y del test que falla si cambia:

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
