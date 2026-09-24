---
name: ronda-de-llamadas-reales
description: Monta la ronda de pruebas con personas de verdad llamando al bot — a quién reclutar, qué pedirle a cada una, qué condiciones repartir (ruido, mala cobertura, interrupciones, colgar a mitad), qué medir en cada llamada y cómo convertir cinco llamadas en patrones en vez de cinco anécdotas. Úsala siempre que haya que probar el agente de voz con personas, medir latencia o aguante de la conversación, preparar una tanda de llamadas de prueba, o después de cambiar el modelo o la voz. Proyecto "Agente de voz para clínicas dentales", Fase 4.
---

# La ronda de llamadas reales

## Por qué con gente y no contigo

El `PLAN.md` §8 lo pone entre paréntesis y a propósito: *«esto se prueba con gente, no solo
contigo»*.

Tú ya sabes lo que el bot va a preguntar. Contestas antes de que termine, vocalizas sin darte
cuenta, dices el teléfono al ritmo que el transcriber entiende y no pides nada raro. Tus llamadas
demuestran que el sistema **puede** funcionar; no demuestran que **aguante**. Y el entregable de la
fase no es que suene bien: es *«cinco personas distintas llaman y ninguna se queda colgada»*.

## Antes de llamar

**Cada persona tiene que saber tres cosas** antes de marcar, y esto no es opcional (§9, RGPD):

- Que va a hablar con un bot.
- Que es una prueba y que te va a contar cómo ha ido.
- Que use **nombre y teléfono ficticios**. Nada real. La grabación va apagada.

**Recluta variado.** Cinco personas parecidas a ti son una persona repetida cinco veces. Interesan
sobre todo quienes se parecen a los pacientes reales de una clínica: gente mayor, gente con prisa,
gente que habla bajito, gente con acento de otra región o de otro país. La objeción comercial que
siempre sale (§7) es *«mis pacientes son mayores, no quieren hablar con una máquina»*: aquí es donde
se averigua cuánta razón tiene.

## Qué le pides a cada una

Pídele **un objetivo**, no un guion. Si le das las frases, estás probando tu guion, no el bot.

Objetivos que cubren lo que interesa:

- Pide cita para una limpieza.
- Pregunta algo que no esté en la hoja (a ver si el bot se lo inventa).
- Da un teléfono **distinto** del que llamas.
- Interrumpe al bot a mitad de una frase.
- Quédate callada unos segundos en mitad de la conversación.
- Cuelga justo cuando esté confirmando la cita.
- Cambia de opinión a mitad: pide otra hora, u otro tratamiento.

## Las condiciones, repartidas

Que estén cubiertas **entre el grupo**, no cinco veces la misma. Del §8:

| Condición | Por qué |
| --- | --- |
| Ruido de fondo | Es como llama la gente de verdad: en la calle, con la tele puesta |
| Móvil con mala cobertura | Corta sílabas y el transcriber rellena con lo que le parece |
| Llamada de más de cinco minutos | Donde aparecen los fallos de contexto y de cuota |
| Interrupciones y silencios | Donde se ve si los parámetros de turnos están bien |
| Apellidos difíciles | El fallo más frecuente en español (mira `banco-de-pruebas-diccion-es`) |

## Qué se mide

Lo mismo en todas, para que se puedan comparar:

- **¿Consiguió la cita?** Sí / no / a medias.
- **¿Se quedó colgada?** Un silencio del que no se sale, una llamada cortada a mitad o un bucle de
  repreguntas **cuentan como colgada**. Es el listón del entregable.
- **Cuántas veces tuvo que repetir un dato.**
- **El silencio más largo**, en segundos. El umbral del plan es **~1,5 s**, no 3 (§8). Mídelo, no lo
  estimes: en una conversación el tiempo se percibe más largo de lo que es.
- **¿El bot adivinó algún dato en vez de preguntarlo?** Esto es un fallo, no una tolerancia: del §6,
  *«nunca lo apunta a medias y nunca lo completa él»*.
- **¿Dijo que una hora estaba ocupada sin saberlo?** Otro fallo (§5, bloque `30`). Sale enseguida en
  cuanto alguien pide una hora que el bot no había ofrecido.
- **¿Se inventó algo?** Contrástalo con la hoja.
- **Qué le chirrió a la persona.** En sus palabras, sin traducirlo a jerga. «Parecía que me metía
  prisa» es más útil que «latencia de turno baja».

Y de cada llamada, guarda lo que ya escribió el sistema solo: la transcripción, la duración y **el
coste** que el `end-of-call-report` dejó en la pestaña `Llamadas`. **Esos costes son la materia
prima de los números de la Fase 5**, así que no los borres al limpiar los datos de prueba.

## Después

Cinco llamadas sueltas son cinco anécdotas. Para que sean un resultado:

- **Ponlas en una tabla comparable**, con las mismas columnas para todas.
- **Busca el patrón**: lo que le pasó a una persona es una anécdota; lo que le pasó a tres es el
  trabajo de la semana. Las skills `design:research-synthesis` y `design:user-research` ayudan con
  esto y con el diseño de la ronda.
- **Ordena por lo que deja a alguien colgada**, no por lo que más te molesta a ti oyéndolo.

## Cuándo repetirla

Siempre que cambies el **modelo** o la **voz**. Las medidas de latencia y de reconocimiento **no son
transferibles** entre configuraciones: un modelo más rápido puede reconocer peor los apellidos, y
una voz mejor puede añadir 300 ms que se notan.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §8 (Fase 4 y su entregable), §5 (las reglas del
canal de voz), §6 (`anotar` y por qué el bot no completa datos) y §9 (RGPD). Dueña: **Fase 4**.

Patrones de fallback y escalado, que es lo que estás afinando:
`C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\posibles skills\mi-skill\chatbot-flow-design\`
Fallos ya vistos en la V1:
`C:\Users\chica\Desktop\Bot Clinica Demo V1\5 Decisiones\D2 - Que hacer si algo va mal.md`
