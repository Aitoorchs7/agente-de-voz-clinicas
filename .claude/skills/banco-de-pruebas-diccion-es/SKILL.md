---
name: banco-de-pruebas-diccion-es
description: Banco de nombres, apellidos, teléfonos, horas y fechas en español peninsular para probar y medir el reconocimiento de voz del agente telefónico, con procedimiento para contar aciertos y comparar entre configuraciones. Úsala siempre que haya que probar cómo entiende el bot apellidos españoles o extranjeros, números de teléfono dichos en voz alta, horas y fechas habladas, cuando se cambie de transcriber, de voz o de modelo, o cuando el bot confunda o adivine nombres. Proyecto "Agente de voz para clínicas dentales", Fase 4.
---

# Banco de pruebas de dicción en español

## Para qué

Un agente de voz para una clínica dental española falla, sobre todo, en tres sitios: **apellidos**,
**teléfonos** y **horas**. No falla en entender la intención —eso lo hace bien—, falla en capturar
los datos, que es justo lo que hay que escribir en la agenda.

El problema es que estos fallos no se ven probando tú solo: tú dices «Sánchez» vocalizando porque
sabes que el bot lo va a transcribir. Y tampoco se ven de forma comparable: sin un banco fijo, cada
prueba usa nombres distintos y no se puede saber si el cambio de modelo mejoró algo o simplemente
tocaron apellidos más fáciles.

Este banco fija el material para que las medidas se puedan comparar entre configuraciones.

## El material

El corpus está en `references/corpus.md`, organizado en cinco secciones: apellidos peninsulares
difíciles, apellidos de otras lenguas del Estado, nombres compuestos y con partícula, apellidos
extranjeros frecuentes en clínicas españolas, y formas de decir teléfonos, horas y fechas.

Léelo cuando vayas a montar una tanda de pruebas. Para una ronda normal no hace falta el corpus
entero: coge una muestra de cada sección.

Todos los nombres del banco son **ficticios o de uso público**. No se usan nombres de pacientes ni
de conocidos (§9, RGPD).

## Cómo se mide

1. **Coge una muestra**, mezclando secciones. Diez o quince elementos por tanda es suficiente para
   ver un patrón sin convertirlo en una tarde.

2. **Pásalo por el camino real**: una llamada, con el transcriber y la voz configurados. No vale
   mandar audio a la API del transcriber por tu cuenta — lo que se mide es la cadena entera, con su
   compresión telefónica, que es precisamente lo que se come las consonantes finales.

3. **Cuenta aciertos**, y distingue tres resultados, porque llevan a sitios distintos:

   | Resultado | Qué significa |
   | --- | --- |
   | **Acierto** | Lo transcribió bien |
   | **Fallo declarado** | No lo entendió **y lo dijo**, y lo volvió a preguntar explicando qué pasaba |
   | **Fallo callado** | Lo entendió mal y siguió como si nada, o **lo completó él** |

   El fallo declarado es aceptable: el bot pide que se lo repitan y el dato acaba bien. **El fallo
   callado no lo es**, por bonita que sea la tasa de acierto. Del §6: *«nunca lo apunta a medias y
   nunca lo completa él»*. Un bot que acierta el 90% y se inventa el 10% restante es peor que uno
   que acierta el 70% y pregunta por el resto.

4. **Anota la configuración** con la que mediste: modelo, voz, transcriber y condiciones (con ruido
   o sin él). Sin eso, el número no sirve para comparar nada.

5. **Repite con ruido de fondo.** Los apellidos que aguantan en silencio y se caen con la tele
   puesta son los que van a fallar en la clínica.

## Qué hacer con los fallos

- **Si el fallo es callado**, el arreglo no está en el transcriber: está en el bloque `40 - Cuando
  cuesta entenderse` y en cómo responde `anotar`. El bot tiene que preferir preguntar a adivinar.
- **Si el fallo es de teléfonos**, mira si el bot **repite dígito a dígito para confirmar** cuando
  el paciente da un número distinto de `{{customer.number}}`. Es la regla del §5 y resuelve la mayor
  parte.
- **Si el fallo es de horas**, comprueba que se están diciendo en palabras y que el bot entiende las
  formas habladas («y media», «menos cuarto», «a las cuatro y pico»).
- **Si falla un grupo entero de apellidos** —todos los vascos, por ejemplo— eso es un límite del
  transcriber, no un fallo puntual: decide si se cambia de configuración o si el bot tiene que
  deletrear en esos casos.

## Cuándo volver a pasarlo

Siempre que cambie el **transcriber**, la **voz** o el **modelo**. Y como regresión antes de una
demo importante: es barato y evita el momento en que el bot llama «Sáez» a la dueña de la clínica,
que se apellida Sáenz.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §8 (Fase 4: *«Nombres y apellidos españoles con
ruido de fondo»*), §5 (el teléfono se oye, no se tiene escrito; el bloque `40`) y §6 (`anotar` nunca
completa un dato). Dueña: **Fase 4**.

Transcriber del proyecto: Deepgram `nova-2` con `language: "es"` (§3).
