---
name: configurar-asistente-vapi
description: Crea o actualiza el asistente de voz en Vapi (modelo Gemini, voz peninsular, transcriber Deepgram nova-2 español, serverMessages, analysisPlan) y lo cuelga de un número entrante o lo cambia de número sin recrearlo. Úsala siempre que haya que tocar la configuración del asistente de Vapi, montar el asistente por primera vez, cambiar la voz o el modelo, probar el asistente por llamada web desde el panel, colgarlo del número español de Twilio, o registrar herramientas en el asistente. Proyecto "Agente de voz para clínicas dentales", Fase 1.
---

# Configurar el asistente de Vapi

## Qué hace esta skill y qué deja fuera

Mueve **configuración**, no **contenido**. La separación es la decisión que ordena el proyecto
entero (`PLAN.md` §1):

> Lo que el bot *sabe* vive en una hoja de cálculo de la clínica. Lo que el bot *es* vive en el
> código.

Así que esta skill toca el modelo, la voz, el transcriber, los mensajes de servidor y el plan de
análisis. **El prompt no.** En la Fase 1 el prompt es de una pieza y provisional; a partir de la
Fase 2 lo produce el compilador y llega por `PATCH`. Si mezclas las dos cosas aquí, el compilador y
esta skill se van a pisar y nadie sabrá qué versión del prompt está viva.

## Antes de mandar nada

**Verifica el cuerpo de la petición contra `docs.vapi.ai`, no contra las plantillas del curso.** Las
plantillas de `PAGO` son buenas como arquitectura y están desactualizadas en los detalles: el §6 del
plan ya documenta un caso (`toolCalls` frente a `toolCallList`). Un campo renombrado se traduce en
un asistente que se crea pero no habla.

Si vas a elegir o cambiar el modelo, pasa antes la skill `verificar-modelo-gemini`. Que un modelo
esté en el catálogo no significa que conteste.

## Los valores que fija el plan

No son preferencias: están decididos y razonados en `PLAN.md`.

| Qué | Valor | De dónde sale |
| --- | --- | --- |
| Modelo | `provider: "google"`, `gemini-3.5-flash`. **Respaldo: `gemini-3.1-flash-lite`, el único vivo** — los `2.5` están jubilados. **Y se cambia a mano:** Vapi no admite respaldo automático de modelo | §3 |
| Nunca | Un modelo `preview` en producción o demo | §3, §9 |
| Transcriber | Deepgram `nova-2`, `language: "es"` | §3 |
| Voz | **Peninsular**. Cuál en concreto se decide oyéndolas y midiendo latencia, no leyendo tablas | §3, §12 |
| ElevenLabs | **No** en la configuración: se reserva como argumento de venta (*«podemos clonar la voz de su recepcionista»*), no como mejora técnica | §3 |
| Grabación | Apagada | §12 |

Sobre la voz, el plan es tajante y conviene entender por qué: *«El acento importa más que la
calidad. Una voz latinoamericana perfecta genera más desconfianza en una clínica de Barcelona que
una peninsular normalita. El paciente no sabe decir por qué, pero nota que "no es de aquí".»* Si el
catálogo te ofrece una voz mejor pero no peninsular, no es mejor para esto.

## El procedimiento

1. **Parte de la plantilla, no de cero.** El cuerpo real de `POST /assistant` está en
   `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\12 - 12. Agente telefónico restaurante básico\crear_vapi.json`,
   y una versión más completa en `...\13 - 13. Agente telefónico reservas avanzado\crear_vapi-2.json`.
   Contrasta las dos: donde difieren suele estar lo que cambió entre versiones del API.

2. **Rellena con los valores de la tabla de arriba**, y deja explícito en el cuerpo lo que el plan
   exige: `serverMessages` (necesario para que lleguen las `tool-calls` y el `end-of-call-report`) y
   `analysisPlan` con su `structuredDataSchema`.

3. **Crea o actualiza, pero no dupliques.** Si ya existe un `assistantId`, usa `PATCH`, no `POST`:
   un asistente nuevo significa un ID nuevo, y el número, las herramientas y el compilador apuntan
   al viejo. Duplicar asistentes es la forma más rápida de tener dos verdades.

4. **Pruébalo primero sin teléfono.** Dashboard → Assistants → el asistente → **Talk** abre una
   llamada por el navegador, sin telefonía ni número de por medio. Ahí se afina el modelo, la voz y
   el prompt sin gastar un minuto de línea.

5. **Cuélgalo del número entrante** cuando el número español de Twilio esté aprobado. Para mover el
   asistente de un número a otro, **cambia la asignación, no recrees el asistente**. Esta es la
   operación que cierra la Fase 1.

6. **Prueba con una llamada de teléfono real** antes de darlo por bueno. Un `200 OK` no es una
   llamada, y una llamada web tampoco: no pasa por la línea.

7. **Anota el resultado**: `assistantId`, `phoneNumberId`, modelo activo, voz y transcriber. La Fase
   2 necesita el `assistantId` para hacerle `PATCH` y no tiene otra forma de saberlo.

## La trampa del número gratuito de EE. UU.

Vapi regala un número, pero **no sirve para este proyecto, ni siquiera para probar**. La
documentación oficial dice que los números gratuitos son *«US national calling only»* e *«inbound
only»* (`docs.vapi.ai/free-telephony`): **puede que ni acepten una llamada desde España**, y si la
aceptan, quien llame paga entre ~1,82 €/min y ~2 €/min de tarifa internacional — 5-6 € por una
llamada de tres minutos, en la factura de quien llama. Eso rompe exactamente el argumento de venta
del proyecto (desvío barato e instantáneo).

**Para probar sin teléfono está el botón `Talk` del panel**, que abre una llamada por el navegador y
no pasa por telefonía. Para la demo y para cualquier desvío real: **número español de Twilio**,
siempre.

## Registrar herramientas

Cuando llegue la Fase 3, las herramientas propias (`consultar_huecos`, `anotar`, `crear_cita`,
`escalar_a_recepcion`) se declaran en el asistente por esta misma vía. `transferir_llamada` y
`finalizar_llamada` se quedan **nativas de Vapi**: no se reimplementan.

Mientras tanto, en la Fase 1 las herramientas de Calendar y Sheets son las **nativas**, conectadas
por OAuth desde el panel. El plan lo autoriza expresamente para esta fase.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §3 (piezas y decisiones), §6 (herramientas) y §9
(riesgos). Dueña: **Fase 1**; la reutilizan la Fase 3 (registrar herramientas) y la Fase 4 (afinar
parámetros de voz y turnos).

Documentación oficial: `docs.vapi.ai/providers/model/gemini`,
`docs.vapi.ai/phone-numbers/import-twilio`, `docs.vapi.ai/assistants/dynamic-variables`,
`docs.vapi.ai/server-url/events`.
