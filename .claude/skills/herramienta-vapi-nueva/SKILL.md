---
name: herramienta-vapi-nueva
description: Monta una herramienta propia de Vapi entera y sin que falte nada — manejador en Vercel leyendo por el contrato fijado, respuesta con la forma results/toolCallId exacta, declaración de la herramienta en el asistente y test contra el fixture. Úsala siempre que haya que crear, cambiar o depurar una custom tool de Vapi (consultar_huecos, anotar, crear_cita, escalar_a_recepcion o cualquier otra), cuando se hable de webhooks de herramientas, del serverUrl o de registrar una herramienta en el asistente. Proyecto "Agente de voz para clínicas dentales", Fase 3.
---

# Montar una herramienta propia de Vapi

## Antes de empezar

**Necesitas el contrato del webhook ya fijado.** Si no hay un POST real capturado en
`fixtures/vapi/`, pasa primero la skill `fijar-contrato-webhook-vapi`. Escribir un manejador contra
las rutas de campos de las plantillas del curso es el fallo documentado en el §9 del `PLAN.md`, y no
falla de forma visible: falla dando `undefined` donde esperabas un nombre.

## Las cuatro partes

Una herramienta no está montada hasta que están las cuatro. Se olvida siempre la tercera, y el
síntoma es desconcertante: el endpoint funciona, los tests pasan, y el bot nunca la llama porque
para él no existe.

### 1. El manejador

En el servicio de Vercel. Lee los argumentos **por las rutas del contrato fijado**, no por las de las
plantillas. Comprueba `message.type === "tool-calls"` antes de nada.

Si llegan varias `tool-calls` en el mismo POST, atiéndelas todas: `results` lleva una entrada por
cada una.

### 2. La respuesta

Exactamente esta forma, con el `toolCallId` que vino:

```json
{ "results": [ { "toolCallId": "...", "result": "..." } ] }
```

Y el contenido de `result` se escribe **para ser dicho en voz alta**, porque el modelo lo va a leer y
convertir en habla:

- **En lenguaje natural**, no un JSON ni una lista de slots. `consultar_huecos` devuelve *«el jueves
  a las diez o el viernes a las cinco y media»*, no un array de timestamps.
- **Números en palabras**, sin emojis y sin listas: no hay pantalla (§5).
- **Dos o tres opciones como mucho.** Por voz, una cuarta opción ya no se retiene.

### 3. La declaración en el asistente

Registra la herramienta en Vapi: nombre, parámetros y descripción. **La descripción la lee el
modelo** para decidir cuándo llamarla, así que se escribe pensando en eso: cuándo usarla, cuándo no,
y qué espera recibir. Una descripción vaga produce un bot que llama a la herramienta a destiempo o
no la llama nunca, y desde fuera parece un problema del prompt.

`transferir_llamada` y `finalizar_llamada` se quedan **nativas de Vapi**: no se reimplementan (§6).

### 4. El test contra el fixture

Contra el POST real capturado. Así, cuando Vapi cambie el sobre, te lo dice un test y no una demo.

## Cómo se comportan los errores

Esta es la parte que separa una herramienta que funciona de una que sirve.

**Devuelve el problema concreto, no un `false`.** El bot necesita poder explicarle al paciente qué
pasa. Del §6, sobre `anotar`: *«Si vuelve con un problema —un teléfono de ocho dígitos, un nombre
que no se entiende— el bot lo pide otra vez explicando qué pasa: "creo que falta un número, ¿me lo
repite?". Nunca lo apunta a medias y nunca lo completa él.»*

Un `false` obliga al bot a inventarse el motivo, y el bot se inventa bien: dirá algo plausible y
equivocado.

**Nunca afirmes que una hora está ocupada si eso no consta.** Del §5, bloque `30`: *«El bot no ve la
agenda; la ven las herramientas.»* Eso te convierte a ti en la única fuente fiable de esa
información, y te obliga a distinguir dos cosas que el paciente nota:

- **Cerrado** — la clínica no abre a esa hora (sale de `Horarios`).
- **Ocupado** — hay una cita o un bloqueo (sale de Calendar).

Si tu herramienta las mezcla en un «no puede ser», el bot dirá una de las dos al azar.

## Las cuatro herramientas de la fase

| Herramienta | Qué hace | Devuelve |
| --- | --- | --- |
| `consultar_huecos` | Huecos reales según **duración del tratamiento** y **gabinete**. No es un free/busy pelado | 2–3 opciones, en lenguaje natural |
| `anotar` | Valida **un dato cada vez** (nombre, teléfono, tratamiento, día) | OK, o el problema concreto |
| `crear_cita` | Evento en Calendar **+** fila en `Citas`, de forma atómica | Confirmación o el motivo del fallo |
| `escalar_a_recepcion` | Fila en `Escalados` + aviso | Confirmación |

Dos cosas que no se improvisan al escribirlas:

- **Las duraciones, los gabinetes y el horario salen de la hoja**, no del código. Están en
  `Tratamientos` y `Horarios`. Escribirlos en el código rompe el §1 del plan y obliga a la clínica a
  llamarte para cambiar una duración.
- **`anotar` valida un dato cada vez, y solo ese.** Es lo que evita *«el fallo más caro del agente de
  voz: llegar al final de la conversación con cuatro datos y descubrir que uno está mal»* (§6).

Si la herramienta reserva una hora, necesita **bloqueo temporal**: mira la skill
`bloqueo-temporal-citas`.

## Reutiliza el lector de la hoja

El compilador de la Fase 2 ya lee la hoja y ese lector se comparte (§6: *«El compilador y las
herramientas comparten el lector de la hoja»*). No montes un segundo camino de lectura: dos lectores
acaban interpretando la misma columna de dos formas distintas, y el día que pase, el síntoma
aparecerá en el sitio equivocado.

Al escribir en la hoja, usa **rango de columnas cerrado** (§9): si alguien dejó una nota suelta bajo
una tabla, «la siguiente fila libre» calculada a ojo escribe donde no debe.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §6 (*«Las herramientas del agente»*) y §5 (bloque
`30`, y las reglas del canal de voz). Dueña: **Fase 3**.

Documentación oficial: `docs.vapi.ai/tools/custom-tools`, `docs.vapi.ai/server-url/events`,
`docs.vapi.ai/tools/google-calendar`, `docs.vapi.ai/tools/google-sheets`.

Arquitectura a copiar (no las rutas de campos):
`C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\13 - 13. Agente telefónico reservas avanzado\Reserva_restaurante.json`
Lógica de negocio ya peleada en Python: `C:\Users\chica\Desktop\Bot Clinica Demo V1\herramientas\`
