# ORQUESTACIÓN — Agente de voz para clínicas dentales

Cómo se reparte el proyecto entre agentes, en qué orden, qué se pasa cada uno al siguiente, y dónde
vive el código.

**Este documento no sustituye a `PLAN.md`.** Lo organiza.

---

## La regla que manda sobre todas las demás

> **`PLAN.md` es la fuente de verdad. Ningún `CLAUDE.md` de fase puede contradecirlo.**

Si un agente de fase descubre que el plan está desactualizado, equivocado o incompleto —porque una
fuente oficial dice otra cosa, porque un precio ha cambiado, porque un formato de API ya no es ese—
**lo señala para que se corrija en `PLAN.md`**. No diverge en su propio `CLAUDE.md` y sigue
trabajando como si nada.

El motivo es práctico: hay cinco agentes distintos y ninguno lee la conversación de los otros. Si
cada uno arregla el plan por su cuenta en su propio fichero, a la tercera fase hay tres versiones de
la verdad y ninguna es la buena. Un plan desactualizado que todos comparten es un problema menor que
cinco planes divergentes.

**Cómo se señala:** se dice en el mensaje al humano, se anota en el `ESTADO.md` de la fase, y se
propone la corrección concreta de `PLAN.md` (qué sección, qué dice ahora, qué debería decir y por
qué). Corregir `PLAN.md` lo decide el humano.

---

## Las cinco fases y sus agentes

La **Fase 0** (cuentas, número de Twilio, bundle regulatorio, facturación de Google) **no entra en
este reparto**: es trabajo manual del humano, no depende de un agente de código, y no tiene
`CLAUDE.md`. Está en el camino crítico de la Fase 1, así que se empieza el día uno.

| Fase | Agente | Carpeta | Entregable (§8, literal) |
| --- | --- | --- | --- |
| **1** | Voz y cita | `fases/fase1-voz-y-cita/` | *Una llamada de verdad, ya desde el número español de Twilio, que acaba en un evento de Calendar* |
| **2** | Compilador | `fases/fase2-compilador/` | *Cambiar un precio en la hoja y oírlo por teléfono cinco minutos después* |
| **3** | Herramientas propias | `fases/fase3-herramientas-propias/` | *Dos llamadas a la vez sin pisarse* |
| **4** | Afinar la voz | `fases/fase4-afinar-voz/` | *Cinco personas distintas llaman y ninguna se queda colgada* |
| **5** | Paquete de venta | `fases/fase5-paquete-de-venta/` | *Enseñárselo a una clínica de verdad* |

Cada carpeta tiene un `CLAUDE.md` **autosuficiente**: un agente que solo lea ese fichero puede
trabajar sin el resto de la conversación ni memoria de otras fases.

---

## El orden de dependencia

```
Fase 0 (manual, humano)
   │  número español aprobado · facturación activa · credenciales
   ▼
Fase 1 — Voz y cita
   │  asistente funcionando con datos a mano + prompt de una pieza
   ▼
Fase 2 — Compilador
   │  el compilador SUSTITUYE el prompt a mano · lector de la hoja compartido
   ▼
Fase 3 — Herramientas propias
   │  las propias SUSTITUYEN las nativas de Calendar/Sheets · coste en `Llamadas`
   ▼
Fase 4 — Afinar la voz
   │  llamadas reales con su coste · configuración final
   ▼
Fase 5 — Paquete de venta
```

Es secuencial, y cada flecha tiene un motivo que no es burocrático:

- **La Fase 2 no puede empezar sin la Fase 1**, porque el compilador publica con
  `PATCH /assistant/{id}` y necesita un `assistantId` que funcione. Compilar contra un asistente que
  todavía no habla no se puede probar.
- **La Fase 3 no puede empezar sin el contrato del webhook fijado**, que es su propia primera tarea
  y va marcada *(antes de nada)* en el §8. Escribir el manejador antes es el riesgo documentado en
  el §9 (`toolCalls` frente a `toolCallList`).
- **La Fase 3 reutiliza el lector de la hoja de la Fase 2**, no monta el suyo (§6: *«El compilador y
  las herramientas comparten el lector de la hoja»*).
- **La Fase 4 no tiene sentido sin las herramientas propias funcionando.** Afinar la voz de un
  sistema que todavía cambia por debajo es tirar las pruebas: cambia una herramienta y hay que
  volver a medirlo todo.
- **La Fase 5 no puede calcular costes sin las llamadas reales de la Fase 4**, que a su vez necesita
  que la Fase 3 esté escribiendo el coste en la pestaña `Llamadas`.

**Lo único que se puede solapar:** la Fase 0 corre en paralelo con el arranque de la Fase 1, que
empieza por la **llamada web desde el panel** (`Talk`) mientras el bundle de Twilio está en trámite.
Está previsto en el plan y no es un atajo. Pero **la Fase 1 no se cierra** hasta que la llamada entra por
el número español.

---

## Qué produce cada fase que la siguiente necesita

El traspaso se escribe en `fases/<fase>/ESTADO.md`. Es el único canal entre agentes: ninguno lee la
conversación del anterior.

*(La convención de un fichero de estado por fase viene del proyecto hermano
`Bot Clinica WhatsApp`, que usa `ESTADO_F1.md` … `ESTADO_F8.md`.)*

### Fase 0 → Fase 1
Número español de Twilio comprado y bundle presentado · cuenta de Vapi con API key · Google Cloud con
**facturación activada**, API key de Gemini y cuenta de servicio para Calendar y Sheets · comprobado que el modelo **responde de verdad**, no que salga en `ListModels`.

### Fase 1 → Fase 2
**`assistantId` de Vapi** (sin él no hay `PATCH`) y los `phoneNumberId` · modelo activo tras la
verificación y respaldos probados · voz elegida con su latencia medida · **el prompt de una pieza**,
tal cual, que es la materia prima que la Fase 2 trocea en bloques · dónde viven las credenciales
(nunca su valor) · conexiones OAuth nativas de Calendar/Sheets montadas en el panel.

> **Lo que sustituye la Fase 2:** el prompt escrito a mano con datos de una clínica inventada pasa a
> ser un prompt compilado desde la hoja. El asistente es el mismo; lo que cambia es de dónde sale su
> contenido.

### Fase 2 → Fase 3
**El lector de la hoja y su interfaz** — la Fase 3 lo reutiliza, no lo reescribe · `spreadsheetId` de
la plantilla y de la clínica de pruebas · los nueve bloques en `contenido/bloques/` ya portados a
voz · cómo se dispara el compilador a mano y dónde está el bucle de 5 minutos · dónde queda el
registro con el contador · qué campos de `Config` existen, porque las herramientas los van a
necesitar (zona horaria, teléfono de recepción, gabinetes, duraciones).

> **Lo que sustituye la Fase 3:** las herramientas **nativas** de Calendar y Sheets de Vapi dejan
> paso a las **propias** en Vercel. `transferir_llamada` y `finalizar_llamada` se quedan nativas.

### Fase 3 → Fase 4
**El contrato del webhook fijado**: ruta del fixture con el POST real y de los tipos generados ·
URLs de los endpoints en Vercel y qué herramienta atiende cada uno · cómo se declaran las
herramientas en el asistente y **cómo se vuelve a las nativas** si hay que dar marcha atrás en mitad
de una demo · cómo funciona el bloqueo temporal y **cuánto tarda en caducar** (la Fase 4 cuelga
llamadas a mitad: va a chocar con esto) · confirmación de que `Llamadas` se rellena **con el coste
real** · resultado de la prueba de las 00:30 con su fecha y hora reales.

### Fase 4 → Fase 5
**Las llamadas reales con su duración y su coste**, sin resumir ni redondear: son la materia prima
de los números de la Fase 5 · qué falló con gente de verdad y qué se arregló (material del
argumentario y de la objeción de los pacientes mayores) · configuración final del asistente con las
latencias medidas · bloques que se tocaron y por qué · **los fallos que no se arreglaron**, que el
humano tiene que saber antes de enseñárselo a una clínica.

---

## Dónde vive el código

Un **único repositorio Node/TypeScript desplegado en Vercel**, con el compilador, las herramientas y
los bloques juntos. Es la recomendación del §6, y el motivo es que *«el compilador y las herramientas
comparten el lector de la hoja»*: separarlos obliga a duplicarlo, y dos lectores acaban
interpretando la misma columna de dos formas distintas.

```
Agente de voz demo/
├── PLAN.md                     ← la fuente de verdad. No se toca sin decirlo
├── CLAUDE.md                   ← (opcional) convenciones del repo, NO instrucciones de fase
├── fases/
│   ├── ORQUESTACION.md         ← este fichero
│   ├── fase1-voz-y-cita/       ← CLAUDE.md · skills-a-crear.md · ESTADO.md
│   ├── fase2-compilador/
│   ├── fase3-herramientas-propias/
│   ├── fase4-afinar-voz/
│   └── fase5-paquete-de-venta/
├── .claude/
│   └── skills/                 ← las 14 skills propias del proyecto
├── contenido/
│   └── bloques/                ← §5: los nueve bloques, con `orden` y `activo` (Fase 2)
├── fichas/
│   └── <clinica>/              ← `spreadsheetId` + identidad de cada clínica (Fase 2, Fase 5)
├── src/
│   ├── hoja/                   ← lector de Sheets COMPARTIDO (Fase 2, lo usa la Fase 3)
│   ├── compilador/             ← filtro de `público`, contador, render, PATCH (Fase 2)
│   └── herramientas/           ← consultar_huecos, anotar, crear_cita, escalar_a_recepcion (Fase 3)
├── api/                        ← endpoints de Vercel (Fase 3)
│   ├── vapi/tools.ts           ← el webhook de `tool-calls`
│   ├── vapi/end-of-call.ts     ← `end-of-call-report` → pestaña `Llamadas`
│   └── compilar.ts             ← disparo manual del compilador (el botón de la demo)
├── fixtures/
│   └── vapi/                   ← POSTs reales capturados: el contrato congelado (Fase 3)
├── scripts/                    ← verificación de arranque del modelo, utilidades de operación
├── entregas/                   ← propuesta, contrato, guion ensayado, costes (Fase 5)
└── tests/
```

Esta estructura sigue las convenciones del proyecto hermano `Bot Clinica WhatsApp`, que ya usa
`contenido/bloques/`, `fichas/`, `src/`, `scripts/` y `entregas/`. Mantenerlas cuesta poco y hace que
lo aprendido allí se traslade sin traducción.

**Reglas de convivencia entre fases:**

- `contenido/bloques/` es de la **Fase 2**. La Fase 4 puede tocar `20`, `40`, `50` y `60` al afinar,
  con las mismas reglas — y `25` y `30` no los toca nadie, nunca.
- `src/hoja/` es de la **Fase 2** y lo **consume** la Fase 3. Si la Fase 3 necesita un campo nuevo,
  lo añade a la hoja y a este lector; no monta un segundo camino de lectura.
- `fixtures/vapi/` lo crea la **Fase 3** y no se edita a mano: se regenera capturando otro POST.
- La **Fase 5** escribe en `entregas/` y no toca `src/`. Si el ensayo revela un fallo, se arregla en
  su fase, con sus pruebas.

**Decisión abierta que afecta a esto** (§12, punto 2): el plan recomienda el repo propio, pero
admite que *«si hay una demo con fecha en menos de una semana, n8n con las plantillas de `PAGO` es
más rápido»*. Si se tira por n8n, esta estructura cambia y hay que decirlo en `PLAN.md`.

---

## Las skills propias del proyecto

Las 14 skills viven en **`.claude/skills/`** en la raíz del repo, no dentro de cada carpeta de fase.
Así las descubre cualquier agente que trabaje en el repositorio, sin depender del directorio en el
que esté mirando. Cada `SKILL.md` dice de qué fase es.

| Fase | Skills |
| --- | --- |
| **1** | `verificar-modelo-gemini` · `configurar-asistente-vapi` |
| **2** | `plantilla-hoja-clinica` · `portar-bloque-a-voz` · `compilar-ficha-clinica` |
| **3** | `fijar-contrato-webhook-vapi` · `herramienta-vapi-nueva` · `bloqueo-temporal-citas` · `prueba-marca-de-tiempo` |
| **4** | `ronda-de-llamadas-reales` · `banco-de-pruebas-diccion-es` |
| **5** | `alta-clinica-nueva` · `coste-por-llamada-real` · `ensayar-guion-demo` |

Algunas cruzan fases a propósito: `verificar-modelo-gemini` la usan todas antes de una demo,
`compilar-ficha-clinica` la usa la Fase 5 en cada alta, y `configurar-asistente-vapi` la reutilizan
la Fase 3 (registrar herramientas) y la Fase 4 (parámetros de turnos).

Ninguna se ha pasado todavía por el bucle de evaluación de `anthropic-skills:skill-creator`. Está
anotado como pendiente opcional en cada `skills-a-crear.md`.

---

## Contradicciones detectadas en PLAN.md

Señaladas aquí, **sin resolverlas por cuenta propia**, para que se corrijan en `PLAN.md`.

### 1. ¿Quién captura el POST del webhook: Fase 2 o Fase 3? — **YA CORREGIDA**

> **Aplicada a `PLAN.md` el 24-sep-2026** por el agente de la Fase 2, con orden expresa del humano:
> el §6 dice ahora *«Primera tarea de la fase 3»*.

| Dónde | Qué dice |
| --- | --- |
| §6 | *«**Primera tarea de la fase 2**: capturar un POST real y fijar el contrato»* |
| §8, Fase 3 | *«**Capturar un POST real de `tool-calls` y fijar el contrato** *(antes de nada)*»* |
| §8, Fase 2 | La lista de tareas **no lo incluye** |
| §9 | *«Capturar un POST real **antes de escribir el manejador**»* — y el manejador es de la Fase 3 |

**Interpretación aplicada en el andamiaje: es de la Fase 3.** Tres de las cuatro referencias apuntan
ahí, y es donde tiene sentido —el contrato se fija justo antes de escribir el código que lo usa, no
una fase antes, cuando aún no hay manejador ni herramientas—. Está escrito así en los `CLAUDE.md` de
las fases 2 y 3 y en la skill `fijar-contrato-webhook-vapi`.

**Corrección propuesta para `PLAN.md`:** en el §6, cambiar *«Primera tarea de la fase 2»* por
*«Primera tarea de la fase 3»*.

### 2. El entregable de la Fase 1 depende de algo que no controla

El §8 dice: *«una llamada de verdad, **ya desde el número español de Twilio**»*. Pero el número
español depende del bundle regulatorio de la Fase 0, que *«no depende de ti»* (§3) y tarda *«de horas
a días»*.

No es una contradicción, es una **dependencia externa dentro de un entregable**, y conviene tenerlo
claro: la Fase 1 puede completar todo su trabajo y quedarse **abierta y bloqueada por Fase 0**. En
ese caso se dice así, y **no** se da por entregada con una llamada web desde el panel (`Talk`). Está
escrito en el `CLAUDE.md` de la Fase 1.

### 3. El «≈ 0,12 € por llamada» del §10 es en realidad el coste por MINUTO — **YA CORREGIDA**

> **Aplicada a `PLAN.md` el 24-sep-2026** por el agente de la Fase 2, con orden expresa del humano:
> el §10 dice ahora *«≈ 0,12 € por minuto, es decir ≈ 0,37 € por llamada de tres minutos»*.

**Es un error de aritmética, no una ambigüedad, y el número va destinado a una propuesta
comercial.** Detectado al probar la skill `coste-por-llamada-real` y verificado a mano.

La tabla del §10 es internamente coherente y suma exactamente 185 €/mes (2 + 15 + 70 + 28 + 14 +
56 + 0). Sobre el volumen que el propio §10 fija —500 llamadas de unos 3 minutos ≈ 1.500 minutos—:

| Operación | Resultado |
| --- | --- |
| 185 € ÷ **500 llamadas** | **0,370 € por llamada** |
| 185 € ÷ **1.500 minutos** | **0,1233 € por minuto** |

El plan escribe *«**≈ 0,12 € por llamada.**»*, que es la segunda cifra con la etiqueta de la
primera. **El error es de 3×.**

Por qué importa más de lo que parece: el §10 admite que son cifras orientativas y prohíbe usarlas
en una propuesta, así que el error no llega solo al cliente. Pero sí orienta —mal— a quien decida
si el negocio se sostiene, y basta con que alguien en una reunión divida 185 entre 500 para que el
número no cuadre delante de la clínica.

**Corrección propuesta para `PLAN.md`:** en el §10, sustituir *«≈ 0,12 € por llamada»* por
*«≈ 0,12 € por minuto, es decir ≈ 0,37 € por llamada de tres minutos»*.

### 4. Los costes se recalculan «al final de la fase 4», pero el entregable es de la Fase 5

El §10 dice que los costes *«se recalculan con llamadas reales al final de la fase 4»*; el §8 pone
*«Números de coste por llamada, calculados con llamadas reales»* como tarea de la **Fase 5**.

No se contradicen si se leen como un traspaso —la Fase 4 **produce** las llamadas, la Fase 5 **hace
la cuenta**— y así está montado: la Fase 4 deja los costes en su `ESTADO.md` sin resumir, y la
Fase 5 los usa. Se anota aquí porque a primera vista parecen dos sitios distintos para lo mismo.

---

## Cómo arranca un agente de fase

1. Lee **`PLAN.md`** entero. Es la fuente de verdad y no hay atajo.
2. Lee el **`CLAUDE.md` de su fase**. Es autosuficiente: alcance, restricciones duras, entregable,
   fuentes oficiales, qué reutilizar y qué skills usar.
3. Lee el **`ESTADO.md` de la fase anterior**, si existe.
4. Lee este fichero si necesita saber dónde encaja o dónde poner el código.
5. Trabaja. Verifica contra **fuente oficial** cualquier dato técnico que pueda haber cambiado
   —modelos, formatos de API, precios—, nunca contra su memoria ni contra las plantillas del curso.
6. Al terminar, escribe su **`ESTADO.md`** con lo que la fase siguiente necesita.

Lo que **ningún** agente de fase hace: invadir la fase anterior o la siguiente, tocar la Fase 0,
inventar datos técnicos que no estén verificados en `PLAN.md`, o divergir del plan en silencio.
