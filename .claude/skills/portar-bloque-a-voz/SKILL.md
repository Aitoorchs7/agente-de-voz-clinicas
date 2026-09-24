---
name: portar-bloque-a-voz
description: Convierte un bloque del prompt escrito para chat (WhatsApp o la V1) en un bloque para teléfono — números en palabras, sin emojis ni listas, confirmación en una frase, teléfono repetido dígito a dígito — y se niega a reescribir los bloques 25 y 30, que van palabra por palabra. Úsala siempre que haya que portar, adaptar, revisar o escribir un bloque de contenido/bloques/, cuando se hable de adaptar el prompt a voz o al canal telefónico, y cuando alguien proponga "mejorar" o resumir un bloque del prompt. Proyecto "Agente de voz para clínicas dentales", Fase 2.
---

# Portar un bloque del prompt a voz

## Qué estás haciendo

El prompt no es un muro de texto: son archivos numerados en `contenido/bloques/`, cada uno con
`orden` y `activo` en el frontmatter, que el compilador concatena. Van de diez en diez para poder
meter cosas en medio sin renumerar nada.

El material de partida existe y está probado: los bloques de la V1 y del proyecto de WhatsApp. Lo
que cambia no es el contenido, es **el canal**. Del `PLAN.md` §11: *«se cambia el arnés, no el
producto»*.

## Los nueve bloques

| Bloque | Qué fija |
| --- | --- |
| `05 - Aviso inicial` | Dice que es un asistente virtual. **Obligatorio, no cortesía** |
| `10 - Quien es` | Nombre, clínica, papel |
| `20 - Como habla` | Tono, frases cortas, **una pregunta cada vez** |
| `25 - No interpretes de mas` | El bloque que más molesta cuando falta |
| `30 - Que no puede decir` | Los límites duros |
| `40 - Cuando cuesta entenderse` | Dicción, cobertura, nombres raros |
| `50 - Como coge una cita` | El flujo, paso a paso |
| `60 - Cuando pasa a una persona` | Escalado |
| `90 - Lo que sabe` | Solo huecos: `{{datos}}`, `{{tratamientos}}`, `{{faq}}`, `{{horario}}` |

## Los dos bloques que no se tocan

**Si el bloque es `25 - No interpretes de mas` o `30 - Que no puede decir`, se copia palabra por
palabra y se para ahí.** Del §5, literal: *«Van palabra por palabra de la V1. No se reescriben, no
se "mejoran", no se resumen.»*

Merece la pena entender por qué, porque la tentación de retocarlos es real y llega siempre:

- **`25`** impide que el bot suponga emociones, compadezca, o repita con otras palabras lo que
  acaban de decir. *«Quiero cita para los dientes»* es una petición de cita, **no un dolor**. Es
  *«el bloque que más molesta cuando falta»*, y lo que molesta no es un fallo visible: es un bot
  pegajoso que cansa.
- **`30`** impide inventar, dar consejo médico y —sobre todo— **decir que una hora está ocupada por
  su cuenta**. *«El bot no ve la agenda; la ven las herramientas. Que una hora no estuviera entre
  las que ofreció no significa que esté cogida. Y "cerrado" y "ocupado" son cosas distintas: el
  paciente nota la diferencia.»*

Estos textos están redactados con un equilibrio que se rompe al tocarlo, y se rompe de forma
invisible: el bloque sigue pareciendo correcto y el bot empieza a portarse peor. Si de verdad crees
que uno necesita un cambio, **no lo hagas: dilo**, con el motivo, y que lo decida un humano.

> **Las dos únicas excepciones del `30`, decididas por el humano el 24-sep-2026** (ya aplicadas en el
> §5 de `PLAN.md`):
> 1. **Los nombres de herramienta** cambian con la fase: hoy son las nativas de Vapi
>    (`google_calendar_check`, `google_calendar_agendamiento`); en la Fase 3, las propias.
> 2. **Ningún dato de horario escrito a mano.** La línea de la V1 *«Tú solo reservas de lunes a
>    viernes»* se borró: es un dato de la clínica y llega por `{{horario}}`.
>
> El `30` que está en `contenido/bloques/` **ya lleva esas dos excepciones aplicadas**. No lo
> «restaures» copiando otra vez el de la V1. Todo lo demás del `30`, y el `25` entero, sigue siendo
> palabra por palabra.

## Las seis reglas del canal

Esto es una **llamada**, no un chat (§5). Al portar cualquier otro bloque, aplica:

1. **Los números se dicen en palabras.** «Las diez y media», no «10:30». Vale para horas, precios,
   duraciones y fechas.
2. **Nada de emojis ni listas.** No hay pantalla. Una lista por voz es una retahíla que nadie
   retiene.
3. **La confirmación final es una frase, no un resumen.** El bloque `50` de WhatsApp repite los
   datos en una lista con negritas; por teléfono eso es ilegible. Por voz:
   *«Entonces le apunto para el jueves veinticuatro a las diez, revisión, a nombre de Ana Pérez.
   ¿Correcto?»*
4. **El teléfono se oye, no se tiene escrito.** En WhatsApp venía dado. Aquí llega por
   `{{customer.number}}`, pero si el paciente da otro hay que **repetirlo dígito a dígito para
   confirmar**.
5. **`40 - Cuando cuesta entenderse` cambia de tema entero**: en chat hablaba de faltas de
   ortografía; por teléfono habla de **dicción, cobertura y ruido de fondo**. No lo adaptes:
   reescríbelo para el canal nuevo.
6. **Una pregunta cada vez** (bloque `20`). Por escrito se pueden encadenar dos preguntas y la
   persona contesta a las dos. Por voz contesta a la última y se pierde la primera.

## El frontmatter

Cada bloque lleva `orden` y `activo`. `orden` va de diez en diez siguiendo la numeración del nombre
del fichero; `activo` permite apagar un bloque sin borrarlo, que es lo que quieres cuando estás
probando si un bloque sobra.

## Dónde está el material

| Origen | Qué tiene |
| --- | --- |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\` | **La fuente de voz.** La V1 era un bot **telefónico**: sus bloques del `10` al `90` ya están escritos para voz. De aquí salen todos, `25` y `30` incluidos |
| `C:\Users\chica\Desktop\Bot Clinica WhatsApp\contenido\bloques\` | **Solo el `05 - Aviso inicial.md`**, que la V1 no tiene, y hay que devolverlo a voz. El resto está reescrito para chat y no sirve de fuente |
| `fases/fase1-voz-y-cita/prompt-diego.md` | Las lecciones de las llamadas reales de la Fase 1, ya probadas en Vapi |

Contrasta las versiones antes de portar: donde difieren suele haber una lección.

## Antes de dar un bloque por portado

- ¿Se puede **leer en voz alta** de corrido sin que suene a formulario?
- ¿Queda algún número en cifras, algún emoji, alguna lista?
- Si es `90 - Lo que sabe`: ¿tiene **solo huecos** y ni un dato escrito a mano? Un precio ahí dentro
  rompe el §1 del plan y obliga a la clínica a llamarte para cambiarlo.
- Si es `05`: ¿sigue diciendo claramente que es un asistente virtual? Es RGPD (§9), no cortesía, y
  al afinar por latencia siempre hay alguien que quiere acortarlo.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §5 (*«El prompt: bloques, no un muro de texto»* y
*«lo que cambia al pasar de WhatsApp a teléfono»*). Dueña: **Fase 2**; la Fase 4 vuelve sobre los
bloques `20`, `40`, `50` y `60` al afinar la conversación — con las mismas reglas y las mismas dos
excepciones.
