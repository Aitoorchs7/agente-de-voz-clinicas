---
name: fijar-contrato-webhook-vapi
description: Captura un POST real de tool-calls de Vapi, lo guarda como fixture, genera los tipos y deja un test que falla si el formato cambia — para saber si llega message.toolCalls o toolCallList ANTES de escribir el manejador. Úsala antes de escribir cualquier manejador de webhook de Vapi, cuando una herramienta no reciba los argumentos o Vapi rechace la respuesta, cuando se hable del contrato del webhook, de toolCalls frente a toolCallList, de serverUrl o del formato de results, y cuando Vapi cambie de versión de API. Proyecto "Agente de voz para clínicas dentales", Fase 3.
---

# Fijar el contrato del webhook de Vapi

## Por qué esto va antes que nada

El `PLAN.md` §8 lo pone como primer punto de la Fase 3 y le añade un paréntesis: *(antes de nada)*.
Y el §9 le dedica una fila entera de la tabla de riesgos. El motivo, del §6:

> ⚠️ **Ojo con las plantillas del curso.** Usan `message.toolCalls[0].id` y `.function.arguments`.
> La documentación actual de Vapi usa **`toolCallList`**, con `id`, `name` y `arguments`
> directamente. Los flujos de n8n de `PAGO` siguen siendo válidos como **arquitectura**, pero las
> rutas de los campos hay que verificarlas contra un webhook real antes de dar nada por bueno.

Escribir el manejador contra la forma equivocada no da un error claro: da una herramienta que
recibe `undefined` donde esperaba el nombre del paciente, y un bot que pregunta lo mismo tres veces
sin que nada parezca roto. Media tarde perdida por no haber mirado un POST de verdad durante cinco
minutos.

La conclusión práctica: **los JSON de `PAGO` se leen como arquitectura, nunca como esquema de
campos.** La arquitectura sigue siendo buena; las rutas, no necesariamente.

## El procedimiento

### 1. Levanta un receptor que no interprete nada

Un endpoint temporal en el `serverUrl` que acepte el POST y lo vuelque **crudo**. Sin parsear, sin
validar, sin quedarse solo con lo que crees que importa. Lo que buscas es precisamente lo que no
esperas.

### 2. Provoca una `tool-call` real

Con una llamada de prueba que use una herramienta. No sirve un POST inventado ni un ejemplo de la
documentación: el objetivo es saber qué manda **tu** Vapi, con **tu** configuración de asistente, en
**esta** versión de su API.

### 3. Guarda el POST como fixture

En `fixtures/vapi/`, con la fecha de captura en el nombre o dentro del fichero. Un contrato «fijado»
que vive en la cabeza de alguien no está fijado: está recordado, que es otra cosa y peor.

### 4. Di cuál de las dos formas ha llegado

Déjalo escrito explícitamente, porque es la pregunta que alguien va a volver a hacer dentro de tres
semanas:

| Forma | Ruta de los campos |
| --- | --- |
| Plantillas del curso | `message.toolCalls[0].id`, `.function.arguments` |
| Documentación actual | `message.toolCallList[]` con `id`, `name` y `arguments` directamente |

Anota también `message.type` (debería ser `"tool-calls"`) y qué más viaja en el sobre que pueda
servirte: identificadores de llamada, número del paciente, metadatos del asistente.

### 5. Genera los tipos desde el fixture

Que los tipos salgan del POST capturado, no de lo que dice la documentación. Si los dos coinciden,
perfecto. Si no, el que manda es el POST: es lo que va a llegar.

### 6. Fija también la respuesta

Vapi espera **exactamente** esta forma de vuelta (§6):

```json
{ "results": [ { "toolCallId": "...", "result": "..." } ] }
```

Verifícalo contra `docs.vapi.ai/tools/custom-tools` **y** contra el comportamiento real: manda una
respuesta y comprueba que el bot la usa en la conversación. Un `200 OK` no significa que Vapi haya
entendido lo que le mandaste.

El `toolCallId` que devuelves es el que vino, y si hay varias `tool-calls` en un mismo POST,
`results` lleva una entrada por cada una. Devolver una sola cuando llegaron dos deja al bot
esperando algo que no va a llegar.

### 7. Deja un test que falle cuando el formato cambie

Contra el fixture. Es la única forma de que un cambio de versión de la API te lo cuente un test y no
una demo con un cliente delante.

## Cuándo volver a pasarla

- Antes de escribir cualquier manejador nuevo.
- Cuando Vapi anuncie un cambio de versión de su API.
- Cuando una herramienta deje de recibir sus argumentos, antes de tocar el código de la herramienta:
  lo más probable es que el sobre haya cambiado, no tu función.

## Una nota sobre el plan

El §8 y el §9 del `PLAN.md` sitúan esta tarea en la **Fase 3**, con *(antes de nada)*. El §6 dice en
un punto *«Primera tarea de la fase 2»*, lo que contradice a los otros dos y a la propia lista de
tareas de la Fase 2, que no la incluye. **La asignación buena es Fase 3.** Está señalado en
`fases/ORQUESTACION.md` para que se corrija en `PLAN.md`; mientras tanto, no des por hecho que la
Fase 2 lo dejó resuelto sin comprobarlo.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §6 (*«El formato del webhook, que ha cambiado»*) y
§9 (tabla de riesgos, fila «Contrato del webhook»). Dueña: **Fase 3**.

Documentación oficial: `docs.vapi.ai/tools/custom-tools`, `docs.vapi.ai/server-url/events`.

Arquitectura a copiar (no las rutas de campos):
`C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\10 - 10. Agente de Voz - Profesional - Plantilla\Agente de reservas.json`
