# CLAUDE.md — Fase 4: Afinar la voz

> Este fichero es autosuficiente. No necesitas leer las otras fases ni recordar conversaciones
> previas. Lo único que manda por encima de este fichero es `PLAN.md` en la raíz del repo:
> **PLAN.md es la fuente de verdad.** Si algo aquí lo contradice, gana PLAN.md y hay que corregir
> este fichero.

---

## 1. Rol

Eres el agente responsable de la **Fase 4** del proyecto *Agente de voz para clínicas dentales*:
coger un sistema que ya funciona técnicamente y hacer que **aguante a personas de verdad** —con sus
apellidos, su ruido de fondo, sus interrupciones y su mala cobertura— sin dejar a nadie colgado.

Esta fase no añade funcionalidad. Añade **aguante**.

---

## 2. Alcance

### Lo que construyes

Lo que dice el §8 del plan, literal:

- Nombres y apellidos españoles con ruido de fondo (esto se prueba con gente, no solo contigo)
- Interrupciones, silencios, colgar a mitad de agendar
- Latencia: el silencio que el paciente aguanta es ~1,5 s, no 3
- Llamada de más de cinco minutos
- Móvil con mala cobertura

Lo que **cambias** para conseguirlo, por orden de preferencia:

1. **Configuración del asistente en Vapi** (parámetros de turnos, interrupciones, silencios,
   `endCallPhrases`, timeouts) — es lo primero que se toca.
2. **Bloques del prompt** relacionados con el habla: `20 - Como habla`, `40 - Cuando cuesta
   entenderse`, `50 - Como coge una cita`, `60 - Cuando pasa a una persona`.
3. **Voz y transcriber**, si la latencia o el reconocimiento de apellidos no dan.
4. **Modelo**, si el bot improvisa: del §3, *«Si el bot empieza a improvisar pese al prompt, la
   alternativa no es tocar el prompt: es cambiar de modelo.»*

### Lo que NO construyes

- **No reescribes el compilador (Fase 2) ni las herramientas (Fase 3).** Si encuentras un fallo en
  ellos —y vas a encontrarlo: colgar a mitad de agendar choca de frente con el bloqueo temporal—,
  **arréglalo en su sitio**, respetando las reglas de esa fase, y déjalo anotado. No montes un
  parche en el prompt para tapar un fallo de una herramienta.
- **No tocas `25 - No interpretes de mas` ni `30 - Que no puede decir`.** Del §5: *«Van palabra por
  palabra de la V1. No se reescriben, no se "mejoran", no se resumen.»* Esto aplica **especialmente
  aquí**, porque afinando la conversación es tentador suavizarlos. El bloque `25` es *«el bloque que
  más molesta cuando falta»*.
- **No metes datos en el prompt.** Los precios, horarios, tratamientos y FAQ siguen viniendo de la
  hoja vía compilador (§1). Si una prueba revela que falta un dato, **se añade a la hoja**, no al
  bloque.
- **No haces el paquete de venta.** El guion de la demo, la propuesta, el contrato y los números de
  coste son de la **Fase 5**. Pero **tus llamadas son la materia prima de sus números**: procura que
  sean llamadas realistas en duración y que su coste quede bien registrado en la pestaña `Llamadas`.
- **No haces la Fase 0** (cuentas, número, facturación). Es manual y ya está hecha.

---

## 3. Punto de partida

De la **Fase 3** necesitas (está en `fases/fase3-herramientas-propias/ESTADO.md`):

- Las cuatro herramientas propias **funcionando** en Vercel: `consultar_huecos`, `anotar`,
  `crear_cita`, `escalar_a_recepcion`.
- El **bloqueo temporal** funcionando, y **cuánto tarda en caducar** — lo vas a necesitar el día que
  cuelgues a mitad de agendar.
- El `end-of-call-report` escribiendo en la pestaña `Llamadas` con resumen, transcripción, duración
  y **coste**.
- El contrato del webhook fijado y la prueba de las 00:30 pasada. *(A 30-sep-2026: la de las 00:30 está
  programada para el 3-oct y la revisa la Fase 3; no bloquea esta fase.)*

De la **Fase 2**: el compilador, los nueve bloques en `contenido/bloques/` y el disparo manual.
De la **Fase 1**: la voz elegida y el modelo verificado. *(El número español de Twilio está **en pausa
por decisión del humano**: la prueba por teléfono se hace al final. Hasta entonces, las llamadas son
web.)*

**Prerrequisito de sentido común:** esta fase no se empieza hasta que las herramientas propias
funcionan. Afinar la voz de un sistema que aún cambia por debajo es tirar las pruebas a la basura.

---

## 4. Restricciones duras — innegociables

1. **Se prueba con gente, no solo contigo.** Del §8, entre paréntesis y a propósito: *«esto se
   prueba con gente, no solo contigo»*. Tú ya sabes lo que va a decir el bot y hablas claro sin
   darte cuenta. El entregable pide **cinco personas distintas**.

2. **El umbral de silencio es ~1,5 s, no 3.** Del §8: *«Latencia: el silencio que el paciente aguanta
   es ~1,5 s, no 3.»* Es un número del plan, no una impresión: mídelo, no lo estimes.

3. **Nunca decir que una hora está ocupada por cuenta del bot** (§5, bloque `30`). *«El bot no ve la
   agenda; la ven las herramientas. Que una hora no estuviera entre las que ofreció no significa que
   esté cogida. Y "cerrado" y "ocupado" son cosas distintas: el paciente nota la diferencia.»*
   Con gente de verdad esto sale enseguida: alguien pedirá una hora que el bot no ofreció.

4. **`anotar` valida en el momento lo que el paciente acaba de decir, y el bot nunca completa por su
   cuenta** (§6; desde el 26-sep-2026 acepta varios datos a la vez —nombre y apellidos juntos— y el
   tratamiento y el día los apunta `consultar_huecos`: cada herramienta es un turno del modelo con su
   «un segundo», y cuatro seguidas eran trece segundos de espera). *«Si vuelve con
   un problema —un teléfono de ocho dígitos, un nombre que no se entiende— el bot lo pide otra vez
   explicando qué pasa: "creo que falta un número, ¿me lo repite?". Nunca lo apunta a medias y nunca
   lo completa él.»* Si en tus pruebas el bot **adivina** un apellido que no entendió, eso es un
   fallo de la fase, no una tolerancia aceptable.

5. **El teléfono se oye, no se tiene escrito** (§5). Si la llamada trae número, **`anotar` se lo dice
   al bot en su respuesta** (desde la Fase 3 el prompt ya no lleva `{{customer.number}}`: con él, el bot
   ofrecía «este mismo número» en llamadas web sin número). Si el paciente da otro, `anotar` devuelve
   las cifras **en palabras** y el bot las repite así para confirmar. Pruébalo con gente que dé un
   número distinto del que llama: es el caso más realista y el que más falla.

6. **Es una llamada, no un chat** (§5): números en palabras, nada de emojis ni listas, y la
   confirmación final **es una frase**: *«Entonces le apunto para el jueves veinticuatro a las diez,
   revisión, a nombre de Ana Pérez. ¿Correcto?»*

7. **`40 - Cuando cuesta entenderse` habla de dicción, cobertura y ruido de fondo**, no de faltas de
   ortografía (§5). Es **tu bloque**: el que más vas a tocar y el que esta fase existe para afinar.

8. **El aviso inicial no se quita ni se acorta** (§5, bloque `05`): *«Dice que es un asistente
   virtual. Obligatorio, no cortesía.»* Afinando por latencia es tentador recortar la primera frase.
   No se toca: es RGPD (§9).

9. **Datos ficticios y grabación apagada.** Del §9: *«Grabar llamadas de pacientes son datos de
   salud … Para la demo: números ficticios y nada real.»* En esta fase llaman **cinco personas
   reales**: pídeles que usen nombres y teléfonos ficticios, y **dile a cada una que está hablando
   con un bot y que la llamada es una prueba**, antes de llamar.

10. **Si el bot improvisa, cambia de modelo, no el prompt** (§3). Y si cambias de modelo, **repite
    las pruebas de latencia**: no son transferibles.

11. **Facturación activa y nunca un modelo `preview`** (§3, §9). Cinco personas llamando gastan
    muchas peticiones: es justo el escenario donde un modelo `preview` devuelve `429` y el bot se
    queda mudo.

---

## 5. Entregable de la fase

Copia literal del §8:

> **Entregable: cinco personas distintas llaman y ninguna se queda colgada**

Esto es el criterio de éxito, no una sugerencia. Fíjate en el listón: no es «suena bien», no es
«la mayoría consigue cita». Es **ninguna se queda colgada**. Un silencio del que no se sale, una
llamada que se corta a mitad o un bucle de repreguntas cuentan como colgada.

---

## 6. Fuentes oficiales a consultar antes de dar nada por bueno

Del §11 del plan, las que aplican a esta fase:

- Variables dinámicas y `assistantOverrides` — `docs.vapi.ai/assistants/dynamic-variables`
- Eventos del servidor y `end-of-call-report` — `docs.vapi.ai/server-url/events`
- Modelos Gemini y `provider: "google"` — `docs.vapi.ai/providers/model/gemini`

Y además, por ser tuyas de esta fase y no estar cubiertas por el §11:

- Los parámetros de **turnos, interrupciones y detección de fin de habla** de Vapi, y los de
  **latencia** de la voz y del transcriber — verifícalos en `docs.vapi.ai`, porque son los que vas a
  tocar y cambian de nombre entre versiones.
- El catálogo de voces en español peninsular y sus latencias medidas, del proveedor que se eligió en
  la Fase 1.

**Regla:** cualquier dato técnico que vaya a cambiar —modelos, nombres de parámetros, precios— se
verifica **contra fuente oficial, no contra memoria**. Si una fuente oficial contradice a PLAN.md,
**no diverjas en silencio**: dilo, para que se corrija PLAN.md.

> ⚠️ **No cargues la skill `claude-api`.** Trata de la API de Anthropic. Aquí el modelo es **Gemini
> vía Vapi**.

---

## 7. Qué reutilizar

Rutas exactas. **`PAGO` es de solo lectura: no se toca nada ahí.**

| Ruta | Para qué en esta fase |
| --- | --- |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\posibles skills\mi-skill\chatbot-flow-design\` | **El recurso más relevante de esta fase.** Del §11: arquitectura de intenciones, *grounding*, **patrones de fallback y de escalado**, y su tesis: *«ni bot guionizado ni bot que alucina, sino conversación guiada con estructura»*. Es exactamente lo que estás afinando. Mira también su carpeta `references\` |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\40 - Cuando cuesta entenderse.md` | El bloque que más vas a tocar, en su versión V1 (escrita para chat): te dice qué se cubría antes y qué hay que reemplazar por dicción, cobertura y ruido |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\20 - Como habla.md` | Tono, frases cortas, **una pregunta cada vez** |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\60 - Cuando pasa a una persona.md` | El escalado: cuándo el bot deja de intentarlo. Es la salida de emergencia que evita que alguien «se quede colgada» |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\5 Decisiones\D2 - Que hacer si algo va mal.md` | Los fallos ya vistos en la V1 y qué se hizo con ellos |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\3 Operacion\O3 — Manual de guardia.md` | El manual de guardia de la V1: qué mirar cuando una llamada sale mal |
| `C:\Users\chica\Desktop\Bot Clinica WhatsApp\contenido\bloques\` | Los nueve bloques del proyecto hermano, incluido `05 - Aviso inicial.md` |

---

## 8. Skills

### Skills ya disponibles que debes usar

| Skill | Cuándo usarla |
| --- | --- |
| `design:user-research` | **Antes de llamar a nadie**, para montar la ronda de las cinco personas en condiciones: a quién reclutas (que no sean todos de tu edad ni todos técnicos), qué le pides a cada una, qué observas, y cómo consigues que suene realista sin guionizarlo. Es literalmente un test de usabilidad, aunque el canal sea un teléfono |
| `design:research-synthesis` | **Después de las llamadas**, para convertir cinco transcripciones y tus notas en patrones y una lista priorizada de arreglos. Sin esto, cinco llamadas son cinco anécdotas |
| `design:ux-copy` | Para reescribir las frases concretas que fallan: la de recuperación cuando no entiende un apellido, la de confirmación, la de espera mientras consulta huecos, la de escalado. Es microcopy, solo que se oye en vez de leerse |
| `engineering:testing-strategy` | Para la matriz de pruebas de la fase: ruido de fondo, interrupciones, silencios, colgar a mitad, llamada de más de cinco minutos, mala cobertura, apellidos difíciles. Que sea una matriz y no una lista de anécdotas |
| `engineering:debug` | Cuando una llamada se caiga, el bot se quede mudo (mira antes cuota y modelo, §9) o el bloqueo temporal deje una hora pillada tras colgar a mitad |
| `engineering:documentation` | Para el informe de la ronda y para actualizar el **manual de guardia**: qué hacer cuando en una demo el bot no entiende un apellido |
| `design:accessibility-review` | **Opcional y con criterio.** Está pensada para interfaces visuales (WCAG, contraste, teclado), así que la mayor parte no aplica. Úsala solo si quieres una lectura estructurada sobre pacientes mayores o con dificultades de audición — que es justo la objeción del §7 |

### Skills que NO debes cargar

- `claude-api` — es de la API de Anthropic; aquí el modelo es Gemini vía Vapi.

### Skills propias de esta fase (ya creadas)

Viven en `.claude/skills/` en la raíz del repo y se cargan solas cuando hacen falta:

| Skill | Cuándo usarla |
| --- | --- |
| `ronda-de-llamadas-reales` | Para montar la ronda entera: a quién reclutas, qué objetivo (no guion) le das a cada persona, cómo repartes las condiciones y **qué mides** en cada llamada. Sostiene el entregable |
| `banco-de-pruebas-diccion-es` | Punto 1: apellidos españoles y extranjeros, teléfonos, horas y fechas habladas, con procedimiento para contar aciertos y distinguir **fallo declarado** de **fallo callado**. El corpus está en su `references/corpus.md` |

Detalle de las dos en `skills-a-crear.md`, en esta misma carpeta.

---

## 9. Cuando termines

Deja escrito en `fases/fase4-afinar-voz/ESTADO.md` lo que la Fase 5 necesita:

- **Las llamadas reales que hiciste**, con su duración y su coste tal como quedaron en la pestaña
  `Llamadas`. **Son la materia prima de los números de coste de la Fase 5**: no los resumas ni los
  redondees, deja los datos.
- Qué falló con gente de verdad y qué se arregló: es material del argumentario, y también de la
  objeción del §7 (*«mis pacientes son mayores, no quieren hablar con una máquina»*).
- La configuración final del asistente: voz, modelo, parámetros de turnos y silencios, con las
  latencias medidas.
- Los bloques que tocaste y por qué.
- Los fallos que **no** arreglaste y que conviene que el humano sepa antes de enseñárselo a una
  clínica de verdad.
