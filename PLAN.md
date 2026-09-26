# PLAN — Agente de voz para clínicas dentales

> Demo comercial. Una clínica llama a un número, habla con el asistente, y **ve en directo** cómo se le llena la agenda y la hoja de cálculo.
> Stack: **Twilio** (número) · **Vapi** (orquestador de voz) · **Gemini** (cerebro) · **Google Calendar** (citas) · **Google Sheets** (datos y registro).
>
> Fecha del plan: 21 de septiembre de 2026 · Estado: sin empezar

---

## 0. Qué es esto y qué no es

**Es** una demo que se enseña en una reunión de venta. La clínica no compra una idea: coge su móvil, marca un número, y al otro lado le contesta un asistente que conoce *sus* tratamientos, *sus* precios y *sus* horarios, le da cita, y deja el rastro escrito donde ella puede verlo.

**No es** todavía el producto en producción de esa clínica. No toca su centralita, no porta su número, no ve sus datos reales de pacientes. Es una réplica fiel corriendo en paralelo.

**El criterio de éxito de la demo no es técnico, es comercial.** La clínica tiene que terminar la llamada pensando *«esto lo puedo cambiar yo»*. Si termina pensando *«qué bien habla»*, la demo ha fallado: una voz bonita la tiene cualquiera, y la competencia la tendrá el mes que viene.

### Las tres cosas que la demo tiene que demostrar, en este orden

1. **Que la clínica manda.** Se abre la hoja de cálculo delante de ella, se cambia un precio, y a los cinco minutos el bot lo dice por teléfono. Esto es el producto.
2. **Que no se inventa nada.** Se le pregunta a propósito algo que no está en la hoja y el bot dice que eso lo confirma recepción. Esto es lo que quita el miedo.
3. **Que la cita aparece de verdad.** El evento sale en Google Calendar y la fila en la hoja, mientras ella mira. Esto es lo que cierra.

Todo lo demás del plan existe para sostener estas tres frases.

---

## 1. La decisión que ordena todo el proyecto

> **Lo que el bot *sabe* vive en una hoja de cálculo de la clínica. Lo que el bot *es* vive en el código.**

De aquí sale todo lo demás:

- Un precio, un horario, una pregunta frecuente o un tratamiento **nunca** se escriben en el prompt a mano. Van a la hoja. Si van al prompt, la clínica no puede cambiarlos sin llamarte, y el día que te llame un sábado ya no eres un proveedor: eres un cuello de botella.
- El tono, los límites, el flujo de la cita y las barandillas **nunca** van a la hoja. Van al código. Si la clínica puede editarlos, un martes por la mañana alguien borra «no des consejo médico» sin saber lo que está haciendo.
- **Lo confidencial no llega al modelo.** La hoja tiene una columna `público`. Las filas con `público = no` se filtran **en el compilador, antes de construir el prompt**. No es que el bot decida callarse: es que el dato nunca entra. Un margen, un coste de laboratorio o un acuerdo con una mutua pueden vivir en la misma hoja sin riesgo.

Y el corolario operativo, que es lo que hace que una clínica se atreva:

> **Nunca se porta el número. Se desvía.** Una portabilidad tarda semanas y no tiene marcha atrás. Un desvío se quita en treinta segundos desde la centralita. Ese botón de pánico es parte del argumentario de venta, no una nota técnica.

---

## 2. Arquitectura

```
Paciente
   │  (llama)
   ▼
Número Twilio  ──importado en──►  Vapi
                                   │
                    ┌──────────────┼───────────────┐
                    │              │               │
              Deepgram STT    Gemini (cerebro)   TTS (voz)
                                   │
                          ┌────────┴────────┐
                          │   herramientas  │
                          └────────┬────────┘
                                   │
        ┌──────────────┬───────────┴────────┬──────────────┐
        ▼              ▼                    ▼              ▼
  consultar_huecos  crear_cita      escalar_a_recepcion  anotar
        │              │                    │
        ▼              ▼                    ▼
  Orquestador (servicio propio) ──► Google Calendar
                    └──────────────► Google Sheets (registro)

   Al colgar:  Vapi ──end-of-call-report──► Orquestador ──► Sheets (pestaña Llamadas)

   Cada 5 min: Compilador ──lee Sheets (solo público=sí)──► PATCH del asistente en Vapi
```

### Los dos caminos de datos, que son distintos y conviene no mezclarlos

| | **Hacia el bot** (lo que sabe) | **Desde el bot** (lo que apunta) |
| --- | --- | --- |
| Qué viaja | Config, tratamientos, FAQ, horarios | Citas, pacientes, llamadas, escalados |
| Cómo | El **compilador** lee la hoja, filtra `público = no`, renderiza el prompt y los tres mensajes fijos (saludo, despedida, buzón) y hace `PATCH /assistant/{id}` en Vapi | Herramientas en llamada + `end-of-call-report` al colgar |
| Cuándo | Cada 5 minutos (y a mano con un botón) | En tiempo real |
| Por qué así | **Vapi no sabe leer Sheets.** Su integración nativa (`google.sheets.row.append`) solo añade filas | La nativa sirve perfectamente para escribir |

> ⚠️ **Esta es la restricción de diseño más importante del proyecto y conviene entenderla antes de escribir una línea.** La integración de Google Sheets de Vapi es *append-only*: «only supports adding new rows … does not support reading from or modifying existing data». Por eso la lectura de la ficha **no** puede ser una herramienta en llamada; es un paso de compilación previo.
>
> Y resulta que eso es mejor, no peor: el filtro de confidencialidad se aplica en un sitio, fuera de la llamada, donde se puede *contar*. Si en la hoja hay 12 tratamientos y el compilador carga 11, la que falta es la confidencial. **El filtro no es una promesa, es un contador.**

---

## 3. Las piezas, y por qué cada una

| Pieza | Papel | Por qué esta y no otra |
| --- | --- | --- |
| **Twilio** | El número español y los minutos | Es el que pide Vapi para importar número propio (Account SID + Auth Token). Un número español exige **documentación regulatoria** (nombre, dirección, documento identificativo): tarda de horas a días y **no depende de ti**, así que es lo primero que se pide |

> **Sobre el número gratuito de Vapi — por qué no sustituye a Twilio.** Vapi regala un número, pero **solo existe en versión EE. UU.**: no hay número gratuito ni de pago con prefijo español o europeo en Vapi; para cualquier número fuera de EE. UU. la única vía sigue siendo importar desde Twilio (`docs.vapi.ai/free-telephony`, `docs.vapi.ai/phone-calling`). Además ese número gratuito **solo recibe llamadas**, no puede hacerlas. Y lo "gratis" es solo el alquiler del número: las llamadas se pagan igual con los créditos de Vapi, con o sin Twilio de por medio.
>
> El motivo real para no usarlo en producción ni en la demo de venta: **quien marque un número de EE. UU. desde España paga tarifa internacional**, entre ~1,82 €/min (Movistar) y ~2 €/min (Orange) sin bono, más establecimiento de llamada — una llamada de 3 minutos sale por 5-6 € solo en la factura del que llama. Si la clínica desvía su línea a ese número, paga ella esa tarifa cada vez que suena; si la clienta llama directamente en la demo, la paga ella. Rompe exactamente el argumento de venta del §1 y del §7 (desvío barato e instantáneo).
>
> **Y no sirve ni siquiera para las pruebas internas.** Los números gratuitos de Vapi son *«US national calling only»*: **no aceptan llamadas internacionales desde España**. Las pruebas internas de la Fase 1 se hacen con **llamada web desde el panel** (Dashboard → Assistants → seleccionar el asistente → **Talk**), sin telefonía ni tarifa de por medio (`docs.vapi.ai/quickstart/dashboard`, `docs.vapi.ai/free-telephony`).
| **Vapi** | Orquestador: turnos, interrupciones, latencia, herramientas, grabación, informe de llamada | Evita construir el arnés de voz a mano. Trae Calendar y Sheets nativos, `transferCall`, `endCall` y `end-of-call-report` sin escribir nada |
| **Gemini** | El cerebro | `provider: "google"`. Barato, rápido, y **ya tienes la cuenta de Google** por Calendar y Sheets: una credencial menos que explicarle a la clínica |
| **Google Calendar** | Donde vive la cita | Es lo que la clínica ya mira. Una cita que no aparece en su calendario no existe para ella |
| **Google Sheets** | La ficha de la clínica y el registro de todo | Es la única base de datos que una recepcionista sabe usar sin formación. Ese es el argumento entero |

### Sobre el modelo de Gemini — la trampa que ya nos costó una tarde

Vapi **publica** esta lista con `provider: "google"`: `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` (`docs.vapi.ai/providers/model/gemini`).

> ⚠ **Y esa lista miente.** Verificado el 23-sep-2026 pidiéndole una palabra a cada modelo: `gemini-2.5-flash`, `gemini-2.5-flash-lite` y `gemini-2.5-pro` devuelven `404 NOT_FOUND — no longer available to new users`. **Vapi los sigue anunciando como disponibles.** Cruzando lo que Vapi acepta con lo que Google todavía sirve, y descartando los `preview`, **quedan solo dos modelos usables: `gemini-3.5-flash` y `gemini-3.1-flash-lite`.** El catálogo caduca solo y deprisa: **se re-verifica al empezar cada fase**, no una vez al principio del proyecto.

Dos avisos que vienen de la V1 y que siguen vigentes:

- **Los modelos `preview` en plan gratuito son 5 peticiones/minuto y 20 al día.** Una llamada gasta una petición **por frase**. A la cuarta o quinta, Google devuelve `429` y el bot se queda mudo o dice que tiene un problema técnico. No es un modelo lento: es un modelo agotado. **Facturación activada desde el día uno.**
- **Google jubila modelos sin avisar y `ListModels` sigue listándolos.** Estar en la lista no es poder usarlo. **Y no solo la lista de Google: la de Vapi también se queda vieja** — ver el aviso de arriba, donde ya ha pasado con tres modelos. El arranque debe pedirle al modelo que diga una palabra antes de abrir el teléfono; si no contesta, bajar por el catálogo de respaldo y decirlo en el registro.

**Elección:** `gemini-3.5-flash` con facturación activa. **Respaldo: `gemini-3.1-flash-lite`, que es el único vivo** — los dos que este plan proponía antes, `gemini-2.5-flash` y `gemini-2.5-flash-lite`, están jubilados. Si el bot empieza a improvisar pese al prompt, la alternativa no es tocar el prompt: es cambiar de modelo.

> ⚠ **Y ese cambio de modelo es MANUAL, porque Vapi no tiene respaldo automático de modelo.** Rechaza `model.fallbackModels`, `model.fallbackPlan` y `modelFallbackPlan` con `400 — property should not exist`; `fallbackPlan` existe **solo** para `voice` y para `transcriber` (`docs.vapi.ai/voice-fallback-plan`, `docs.vapi.ai/customization/transcriber-fallback-plan`). Así que *«bajar por el catálogo»* no es una configuración: es un procedimiento que ejecuta una persona con `PATCH /assistant/{id}`, mandando el objeto `model` **completo** — los `PATCH` de Vapi **reemplazan** los objetos anidados en lugar de fusionarlos, y mandarlo a medias borra el prompt y las herramientas devolviendo `200 OK` y dejando el bot mudo sin un solo error.
>
> **Consecuencia práctica, y es la que importa:** como no hay red debajo, **verificar el modelo el mismo día de cada demo deja de ser buena costumbre y pasa a ser obligatorio**. Si cae en mitad de una demo, no se recupera solo y no hay tiempo de arreglarlo con la clínica delante.

### Sobre la voz — la decisión que más nota el paciente y menos se piensa

> **El acento importa más que la calidad.** Una voz latinoamericana perfecta genera más desconfianza en una clínica de Barcelona que una peninsular normalita. El paciente no sabe decir por qué, pero nota que «no es de aquí».

Empezar con una voz **peninsular** del catálogo que dé mejor latencia en pruebas reales. ElevenLabs se reserva como **argumento de venta**, no como mejora técnica: *«podemos clonar la voz de su recepcionista»* cierra reuniones; que suene un 8% mejor, no.

**Transcripción:** Deepgram `nova-2` con `language: "es"`, como en las plantillas del curso.

---

## 4. El modelo de personalización — la ficha de la clínica

Cada clínica es **una hoja de cálculo** (un `spreadsheetId`) más **una fila de identidad** (`fichas/<clínica>/ficha.json`): su hoja, su asistente y **sus calendarios de Google, uno por gabinete**. Nada más. Dar de alta una clínica nueva es duplicar una plantilla y rellenarla. *(Un calendario por gabinete, como en la V1: decidido el 25-sep-2026. El `gabinete` de cada fila de `Tratamientos` es el nombre de uno de esos calendarios.)*

### Las siete pestañas

| Pestaña | Contenido | Quién la toca |
| --- | --- | --- |
| **Config** | Nombre de la clínica, nombre del bot, trato (tú/usted), zona horaria, dirección, teléfono de recepción, política de privacidad (**una frase para decir en voz alta, no un enlace**), mensaje de urgencia, parking… Una fila por dato (`clave`, `valor`, `público`, `comentario`), con `público` como en Tratamientos y FAQ (por defecto `sí`) | La clínica |
| **Tratamientos** | Código, nombre, duración en minutos, gabinete, frase para el bot, `público` | La clínica |
| **FAQ** | Pregunta, **respuesta exacta aprobada**, categoría, `público` | La clínica |
| **Horarios** | Día, de, a (tramos; una fila por tramo, para partir mañana y tarde) | La clínica |
| **Citas** | Toda cita creada, con quién llamó y para quién | Se rellena solo |
| **Llamadas** | Fecha, duración, teléfono, resumen, transcripción, motivo de fin, coste | Se rellena solo |
| **Escalados** | Lo que el bot no supo resolver | **Se revisa cada mañana** |

`Citas`, `Llamadas` y `Escalados` llevan además una columna **`id_llamada`** (el identificador de la llamada en Vapi): enlaza cada cita y cada escalado con su llamada y su coste, y evita filas repetidas si Vapi reenvía un aviso. *(Decidido el 25-sep-2026.)*

### La columna `público`

Es la barrera de confidencialidad y el argumento de venta más fuerte que tiene el producto:

- `público = sí` → el compilador mete la fila en el prompt
- `público = no` → **la fila no sale de la hoja**

Al compilar, el registro dice cuántas filas ha cargado de cuántas. Ese número es lo que se le enseña a la clínica.

### Lo que la clínica cambia sin llamar a nadie

| Quiere que… | Hace… |
| --- | --- |
| Diga otro precio | Editar la respuesta en `FAQ` |
| Responda algo nuevo | Añadir una fila a `FAQ` |
| Una revisión dure 30 min | Cambiar `duracion_min` en `Tratamientos` |
| Deje de ofrecer un tratamiento | Poner `público = no` |
| Cambie el horario | Editar `Horarios` |
| La tutee | Cambiar `trato` en `Config` |
| Se llame de otra forma | Cambiar `nombre_bot` en `Config` |

> **Regla para la clínica:** no poner notas ni comentarios sueltos debajo de una tabla. Google los cuenta como datos y desplaza las columnas. Si hacen falta, van en una columna de comentarios o en una pestaña LÉEME. *(Esto no es teoría: es una incidencia real de la V1.)*

---

## 5. El prompt: bloques, no un muro de texto

El prompt no se escribe de una pieza. Son archivos numerados en `contenido/bloques/`, cada uno con `orden` y `activo` en el frontmatter, que el compilador concatena. De diez en diez, para poder meter cosas en medio.

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
| `70 - Antes de colgar` | **Provisional**: apuntar la llamada con la herramienta nativa de Sheets. Lo retira la Fase 3 cuando el `end-of-call-report` escriba en `Llamadas` |
| `90 - Lo que sabe` | Solo huecos: `{{datos}}`, `{{tratamientos}}`, `{{faq}}`, `{{horario}}` |

Y fuera del prompt, en el mismo `PATCH`: el **saludo** (`firstMessage`), la **despedida** (`endCallMessage`) y el **buzón** (`voicemailMessage`), que llevan el nombre del bot y de la clínica y salen de plantillas con los mismos huecos. Si solo se compilara el prompt, cambiar `nombre_bot` en la hoja dejaría al bot saludando con el nombre viejo.

### Los huecos

Se escriben con dobles llaves y los rellena el compilador desde la hoja. Vapi usa la misma sintaxis `{{...}}` para sus variables dinámicas, así que hay que separar los dos mundos con disciplina:

| Hueco | Quién lo rellena | Se convierte en |
| --- | --- | --- |
| `{{clinica}}`, `{{bot}}`, `{{trato}}`, `{{privacidad}}` | **Compilador** | Valores de `Config` |
| `{{datos}}`, `{{tratamientos}}`, `{{faq}}`, `{{horario}}` | **Compilador** | Solo las filas `público = sí` |
| `{{hoja_id}}` | **Compilador** | El `spreadsheetId` de la ficha (lo usa el bloque `70`, provisional) |
| `{{ahora}}`, `{{dia_semana}}` | **Compilador → Vapi** | El compilador los convierte en el filtro de fecha de Vapi con la zona horaria de `Config`; Vapi los resuelve en cada llamada |
| `{{now}}`, `{{date}}`, `{{customer.number}}` | **Vapi**, en la llamada | Fecha/hora reales y el número del paciente. ⚠ **Si no hay número** (llamada web, número oculto), Vapi deja el texto `{{customer.number}}` tal cual: el prompt tiene que enseñarle al modelo a distinguirlo |

> ⚠️ **La marca de tiempo es donde más se falla.** Las variables de fecha de Vapi van **en UTC**. En España eso son una o dos horas de desfase, y un bot que cree que son las 23:00 cuando son las 01:00 da citas para ayer. Se resuelve con el filtro de fecha de LiquidJS indicando la zona:
> `{{ "now" | date: "%A %d de %B de %Y, %H:%M", "Europe/Madrid" }}`
> **Esto se prueba explícitamente en la fase 3, con una llamada a las 00:30.**

### Los dos bloques que son el producto

Van **palabra por palabra** de la V1. No se reescriben, no se «mejoran», no se resumen:

- **`25 - No interpretes de mas`** — no suponer emociones, no compadecer, no repetir con otras palabras lo que acaban de decir, preguntar antes que adivinar. *«Quiero cita para los dientes»* es una petición de cita, no un dolor.
- **`30 - Que no puede decir`** — no inventar, no dar consejo médico, y sobre todo: **nunca decir que una hora está ocupada por tu cuenta**. El bot no ve la agenda; la ven las herramientas. Que una hora no estuviera entre las que ofreció no significa que esté cogida. Y «cerrado» y «ocupado» son cosas distintas: el paciente nota la diferencia.

El `30` se porta literal **en su regla de fondo**. Las dos únicas excepciones, que sí cambian entre fases: **los nombres de herramienta** (las nativas de Vapi mientras existan, las propias desde la Fase 3) y **cualquier dato de horario**, que nunca se escribe en el bloque: llega por `{{horario}}`. El `25` va literal sin excepciones. *(Aprobado el 24-sep-2026: la V1 traía escrito «Tú solo reservas de lunes a viernes», un dato de la clínica dentro del código.)*

### Y lo que cambia al pasar de WhatsApp a teléfono

Esto es una **llamada**, no un chat. El canal se lleva por delante varias cosas:

- **Los números se dicen en palabras.** «Las diez y media», no «10:30».
- **Nada de emojis ni listas.** No hay pantalla.
- **La confirmación final no es una lista, es una frase.** El bloque `50` de WhatsApp repite los datos en una lista con negritas; por teléfono eso es ilegible. Por voz: *«Entonces le apunto para el jueves veinticuatro a las diez, revisión, a nombre de Ana Pérez. ¿Correcto?»*
- **El teléfono no se tiene escrito: se oye.** En WhatsApp el número venía dado. Aquí llega por `{{customer.number}}`, pero si el paciente da otro hay que **repetirlo dígito a dígito para confirmar**.
- **`40 - Cuando cuesta entenderse`** vuelve a hablar de dicción, cobertura y ruido de fondo, no de faltas de ortografía.

---

## 6. Las herramientas del agente

Lo que el bot **puede hacer**. Todo lo demás lo responde desde el prompt, que ya lleva la hoja compilada dentro: para el tamaño de datos de una clínica, meterlos en el prompt es más rápido, más barato y más predecible que montar un RAG.

| Herramienta | Tipo | Qué hace | Devuelve |
| --- | --- | --- | --- |
| `consultar_huecos` | Custom (webhook) | Huecos reales según **duración del tratamiento** y **gabinete**. No es un free/busy pelado | 2–3 opciones, en lenguaje natural |
| `anotar` | Custom (webhook) | Valida **un dato cada vez** (nombre, teléfono, tratamiento, día) | OK, o el problema concreto |
| `crear_cita` | Custom (webhook) | Evento en Calendar **+** fila en `Citas`, de forma atómica | Confirmación o el motivo del fallo |
| `escalar_a_recepcion` | Custom (webhook) | Fila en `Escalados` + aviso (el **aviso** es la frase con la que el bot le dice al paciente que recepción le llamará; no hay aviso en tiempo real a la clínica: decidido el 25-sep-2026) | Confirmación |
| `transferir_llamada` | Nativa Vapi | Pasa al teléfono de recepción | — |
| `finalizar_llamada` | Nativa Vapi | Cuelga | — |
| *(al colgar)* | `end-of-call-report` | Fila en `Llamadas` con resumen, transcripción, duración y coste | — |

### Por qué `anotar` existe

Viene de la V2 de WhatsApp y por teléfono vale todavía más. El bot llama a `anotar` **cada vez** que el paciente le da un dato, y solo con ese dato. Si vuelve con un problema —un teléfono de ocho dígitos, un nombre que no se entiende— el bot lo pide otra vez **explicando qué pasa**: *«creo que falta un número, ¿me lo repite?»*. Nunca lo apunta a medias y nunca lo completa él.

Esto evita el fallo más caro del agente de voz: llegar al final de la conversación con cuatro datos y descubrir que uno está mal.

### Por qué `consultar_huecos` es propia y no la nativa de Vapi

Vapi trae `google.calendar.availability.check` y `google.calendar.event.create` nativas, que se conectan por OAuth desde el panel. Son cómodas y **para la demo de la fase 1 valen**.

Pero se quedan cortas en cuanto la clínica es real:

- La nativa comprueba **un rango libre/ocupado**. No sabe que una limpieza dura 45 minutos y una revisión 30, ni que la ortodoncia va al Gabinete 2.
- No aplica el horario de la clínica: te diría que el domingo a las cuatro de la mañana está libre.
- No puede hacer **bloqueo temporal**, y sin bloqueo temporal dos llamadas simultáneas cogen la misma hora. Las plantillas de reservas del curso resuelven esto exactamente así —crear un registro temporal al consultar y borrarlo al confirmar— y ese patrón se copia tal cual. **Se copia el patrón, no el almacén:** la plantilla de `PAGO` guarda el registro temporal en Airtable, casado por el ID de llamada, **sin caducidad** y con una carrera entre buscar y crear (dos llamadas pueden ver la hora libre y bloquearla las dos). Aquí va en un almacén con operación atómica y caducidad: Redis (Upstash, región UE), decidido el 25-sep-2026.

**Camino:** nativas en la fase 1 para tener algo funcionando en horas; propias en la fase 3, que es cuando se prueban dos llamadas a la vez.

### El formato del webhook, que ha cambiado

Vapi manda al `serverUrl` un POST con `message.type = "tool-calls"` y espera **exactamente** esto de vuelta:

```json
{ "results": [ { "toolCallId": "...", "result": "..." } ] }
```

> ✅ **El contrato, fijado con un POST real** (26-sep-2026, `fixtures/vapi/2026-09-26-tool-calls.json`). Vapi manda **las tres formas a la vez** en `message`: `toolCalls`, `toolCallList` y `toolWithToolCallList[].toolCall`, y las tres traen lo mismo: `{ id, type: "function", function: { name, arguments } }`, con **`arguments` ya como objeto** (no como texto JSON; en el historial de la llamada, `artifact.messages`, sí va como texto). Se lee **`message.toolCallList[].function`**; lo que diga la documentación de `parameters` sin `function` no es lo que llega. Las plantillas del curso (`toolCalls[0]`) funcionarían, pero solo con la primera herramienta si el modelo llama a dos a la vez. La respuesta que acepta Vapi: `{ results: [{ name, toolCallId, result }] }`. Los flujos de n8n de `PAGO` siguen siendo válidos como **arquitectura**.
>
> En el mismo `message` llegan `call` (con `id` y `type`: `webCall` o de teléfono), el `assistant` entero y `artifact` con la conversación hasta ese momento. En una llamada web **no hay `customer`**. El `end-of-call-report` trae el **coste real** en `message.cost` y `message.costBreakdown.total` (en `message.call.cost` llega a 0: es la foto del principio), la duración en `message.durationSeconds`, `startedAt`, `endedAt` y `endedReason`.

### El orquestador: dónde viven las herramientas propias

**Recomendación: un servicio propio en Node/TypeScript desplegado en Vercel**, en el mismo repositorio que el compilador y los bloques.

| Opción | A favor | En contra |
| --- | --- | --- |
| **Node + Vercel** ✅ | Todo en un repo y versionado. **Vercel Pro es obligatorio desde el primer despliegue de las herramientas propias**, no solo para el cron del compilador del final: el plan Hobby es *«non-commercial personal use only»* y este proyecto es comercial (`vercel.com/docs/limits/fair-use-guidelines`, verificado el 25-sep-2026). Y además el cron de Hobby es una vez al día, así que el bucle de cinco minutos también lo necesita. Decidido: Pro se contrata al final de la Fase 3; hasta entonces las herramientas se prueban en local, detrás de un túnel. Mismo stack que el proyecto de WhatsApp. El compilador y las herramientas comparten el lector de la hoja | Hay que escribirlo |
| n8n | Ya tienes las plantillas de reservas en `PAGO`, montadas y probadas | Otra suscripción, otro sitio donde mirar cuando algo falla, y la lógica queda en un JSON que no se revisa en un diff |
| Vapi Code Tools | TypeScript en la infraestructura de Vapi, sin servidor | Atado a Vapi, peor de depurar, y el compilador sigue necesitando vivir fuera |

n8n es la vía rápida si hay prisa por una demo concreta. Para un producto que vas a vender varias veces, el repo gana.

---

## 7. La demo de venta: el guion

Esto no es una lista de pruebas técnicas. Es lo que pasa en la reunión, en orden.

**Antes de la reunión** (30–45 min): se rellena la ficha con los datos reales de *esa* clínica —sacados de su web y de su Google Business—, se compila y se prueba una llamada. La demo es de **su** clínica, con **sus** tratamientos y **su** nombre. Una demo genérica no vende.

**En la reunión:**

1. **Que llame ella, desde su móvil.** No una grabación, no tu teléfono. Pide cita para una limpieza.
2. **Mientras habla, la pantalla compartida enseña el Calendar.** La cita aparece sola. Ese es el momento.
3. **Se abre la hoja y se cambia un precio delante de ella.** Se espera. Se vuelve a llamar. El bot dice el precio nuevo. → *«Esto lo cambia usted un martes por la mañana y a las once y cinco el bot ya lo dice.»*
4. **Se le pide que intente pillarlo.** Que pregunte algo que no está en la hoja. El bot dice que eso lo confirma recepción y lo apunta en `Escalados`. → *«No se inventa. Y lo que no sabe, se lo deja escrito a usted cada mañana.»*
5. **Se enseña la fila con `público = no`.** Un margen, un coste. → *«Esto está en la misma hoja y el bot no lo ha visto nunca. El filtro está antes del bot, no dentro.»*
6. **La pregunta del miedo, antes de que la haga ella:** *«¿y si falla?»* → Se enseña el desvío. Se quita delante de ella. El teléfono vuelve a sonar en recepción. Treinta segundos.

**La objeción que siempre sale:** *«mis pacientes son mayores, no quieren hablar con una máquina»*. La respuesta no es discutir: es el desvío por horario. El bot entra **solo cuando no hay nadie**: noches, fines de semana, festivos, o cuando comunica. No sustituye a la recepcionista; coge las llamadas que hoy se pierden. Se empieza ahí y se sube desde ahí.

---

## 8. Fases

Cada fase termina en algo que se puede enseñar. Si una fase no se puede enseñar, está mal cortada.

### Fase 0 — Lo que no depende de ti *(empezar hoy)*
- [ ] Cuenta Twilio + **comprar número español** + **presentar el bundle regulatorio** (nombre, dirección, documento). De horas a días. **Es el camino crítico**
- [ ] Cuenta Vapi y API key
- [ ] Google Cloud: facturación **activada**, API key de Gemini, cuenta de servicio para Calendar y Sheets
- [ ] Verificar que el modelo elegido **responde de verdad** (una palabra), no que aparezca en `ListModels`

### Fase 1 — Que hable y coja una cita *(1–2 días)*
- [ ] Asistente en Vapi: Gemini + voz peninsular + Deepgram `nova-2` español
- [ ] Probar el asistente con **llamada web desde el panel de Vapi** (`Talk`), sin telefonía ni número de por medio, mientras el bundle de Twilio está en trámite
- [ ] En cuanto el número español de Twilio esté aprobado (Fase 0), importarlo y **colgar el asistente de ese número**
- [ ] Prompt de una pieza, a mano, con datos de una clínica inventada
- [ ] Calendar y Sheets **nativos** de Vapi
- [ ] **Entregable: una llamada de verdad, ya desde el número español de Twilio, que acaba en un evento de Calendar**

### Fase 2 — El compilador *(2–3 días)*
- [ ] Hoja plantilla con las siete pestañas
- [ ] Bloques en `contenido/bloques/`, portados de la V1 con la adaptación a voz
- [ ] Compilador: lee la hoja → **filtra `público = no`** → rellena huecos → `PATCH /assistant/{id}` (el prompt **y** los tres mensajes fijos: saludo, despedida y buzón)
- [ ] **El contador de filas en el registro** (12 leídas, 11 cargadas)
- [ ] Bucle cada 5 minutos + disparo manual (en local durante el desarrollo; en Vercel Pro al desplegar)
- [ ] **Entregable: cambiar un precio en la hoja y oírlo por teléfono cinco minutos después**

### Fase 3 — Las herramientas propias *(3–4 días)*
- [ ] **Capturar un POST real de `tool-calls` y fijar el contrato** *(antes de nada)*
- [ ] Servicio en Vercel con `consultar_huecos`, `anotar`, `crear_cita`, `escalar_a_recepcion`
- [ ] Duración por tratamiento, gabinete, horario de la clínica
- [ ] **Bloqueo temporal** contra reservas simultáneas
- [ ] `end-of-call-report` → pestaña `Llamadas`
- [ ] **Prueba de la marca de tiempo a las 00:30**
- [ ] **Entregable: dos llamadas a la vez sin pisarse**

### Fase 4 — Afinar la voz *(2–3 días)*
- [ ] Nombres y apellidos españoles con ruido de fondo (esto se prueba con gente, no solo contigo)
- [ ] Interrupciones, silencios, colgar a mitad de agendar
- [ ] Latencia: el silencio que el paciente aguanta es ~1,5 s, no 3
- [ ] Llamada de más de cinco minutos
- [ ] Móvil con mala cobertura
- [ ] **Entregable: cinco personas distintas llaman y ninguna se queda colgada**

### Fase 5 — El paquete de venta *(1–2 días)*
- [ ] Guion de la demo (§7) ensayado
- [ ] Hoja de alta: rellenar la ficha de una clínica nueva en menos de una hora
- [ ] Números de coste por llamada, calculados con llamadas reales
- [ ] Propuesta y contrato — plantillas en `PAGO/PROFESIONALIZA TU AGENCIA IA/`
- [ ] **Entregable: enseñárselo a una clínica de verdad**

---

## 9. Riesgos y trampas conocidas

| Riesgo | Qué pasa | Qué se hace |
| --- | --- | --- |
| **Cuota de Gemini** | `429` a la cuarta frase. El bot dice que tiene un problema y cuelga | Facturación activa. Nunca `preview` en producción |
| **Modelo jubilado sin aviso** | El bot escucha bien y **no dice una palabra**. Solo se ve en el registro. **Ya ha pasado:** tres de los seis modelos que Vapi publica están jubilados | Verificar el modelo **el mismo día de cada demo**. Respaldo: `gemini-3.1-flash-lite`, y **se cambia a mano** — Vapi no tiene respaldo automático de modelo |
| **Marca de tiempo en UTC** | Citas para ayer en las llamadas de noche | Filtro LiquidJS con `Europe/Madrid`. Prueba a las 00:30 |
| **Dos llamadas, misma hora** | Doble reserva | Bloqueo temporal (fase 3) |
| **Bundle regulatorio de Twilio** | Sin número no hay demo, y no depende de ti | Fase 0, día uno |
| **Contrato del webhook** | `toolCalls` vs `toolCallList`: las plantillas del curso pueden no encajar | ✅ Capturado el 26-sep-2026 (`fixtures/vapi/`): se lee `toolCallList[].function`, con `arguments` como objeto |
| **Sheets no se lee en llamada** | Un diseño que lo asuma se cae entero | Por eso existe el compilador. Está resuelto desde el principio |
| **Notas sueltas en la hoja** | Google las cuenta como datos y desplaza columnas | Regla escrita para la clínica + rango de columnas cerrado al escribir |
| **RGPD** | Grabar llamadas de pacientes son datos de salud | Aviso en el primer mensaje, contrato de encargado de tratamiento, retención corta. **Para la demo: números ficticios y nada real** |
| **Número gratuito de Vapi** | Es *«US national calling only»*: **puede no conectar en absoluto desde fuera de EE. UU.** Y si conecta, quien lo llame desde España paga ~1,82-2 €/min de tarifa internacional | **No usarlo.** Las pruebas internas van por llamada web del panel (`Talk`); la demo y el desvío real, por el número español de Twilio |

---

## 10. Costes

Para **500 llamadas al mes** de unos 3 minutos ≈ **1.500 minutos**:

| Concepto | Referencia | Al mes (aprox.) |
| --- | --- | --- |
| Número español (Twilio) | ~1,90 €/mes | ~2 € |
| Minutos entrantes | ~0,01 €/min | ~15 € |
| Plataforma Vapi | 0,05 $/min | ~70 € |
| Gemini Flash | ~0,02 $/min | ~28 € |
| Deepgram STT | ~0,01 $/min | ~14 € |
| TTS | ~0,04 $/min | ~56 € |
| Calendar / Sheets | gratis | 0 € |
| **Total** | | **≈ 185 €/mes** |

**≈ 0,12 € por minuto, es decir ≈ 0,37 € por llamada de tres minutos.** Un número para orientarse, no para poner en una propuesta: **los precios se verifican en vapi.ai/pricing y en Twilio antes de cotizar**, y se recalculan con llamadas reales al final de la fase 4, donde el `end-of-call-report` ya trae el coste real de cada una.

**No incluye Vercel Pro**, que hace falta desde el primer despliegue de las herramientas (Hobby no admite uso comercial) y cubre también el bucle de cinco minutos del compilador (§6). Es una cuota fija por cuenta, no por minuto: su precio se verifica en `vercel.com/pricing` el día que se cotice.

Dos notas que cambian la cuenta: cada línea concurrente por encima de la décima son 10 $/mes, y el modo HIPAA son 1.000 $/mes (no aplica aquí; en España el marco es el RGPD).

Para la **demo** el coste es de unos pocos euros: número, un puñado de llamadas y créditos de prueba.

---

## 11. Qué se reutiliza y de dónde

### De `PAGO` *(solo lectura — no se toca nada ahí)*

| Recurso | Para qué |
| --- | --- |
| `RECURSOS EXCLUSIVOS/02 · 10 - Agente de Voz - Profesional` | **La arquitectura completa**: webhook → `tool-calls` → disponibilidad → **bloqueo temporal** → alternativas → confirmar → borrar bloqueo → registrar. Es el patrón a copiar |
| `RECURSOS EXCLUSIVOS/02 · 12 y 13 - Agente telefónico` | `crear_vapi.json`: el cuerpo real del `POST /assistant` (voz, transcriber, `serverMessages`, `analysisPlan` con `structuredDataSchema`). Es la plantilla del asistente |
| `RECURSOS EXCLUSIVOS/10 · 08 - Agente de Voz (Santiago García)` | Segunda lectura del mismo patrón, en Make |
| `posibles skills/mi-skill/chatbot-flow-design/` | Arquitectura de intenciones, *grounding*, **patrones de fallback y de escalado**. Su tesis es la nuestra: ni bot guionizado ni bot que alucina, sino conversación guiada con estructura |
| `RECURSOS EXCLUSIVOS/05 · 03 - AI Agent Builder` y `04 - Automation Forge` | Skills de Claude Code para construir el agente |
| `RECURSOS EXCLUSIVOS/05 · 01 - Entrega de servicio (Método AILINK)` | La skill `production-ready` para el paso a producción |
| `PROFESIONALIZA TU AGENCIA IA/03 y 04` | Propuesta comercial y contrato |
| `RECURSOS EXCLUSIVOS/02 · 07 - eBook Método 4D` y `19–22 Procesos de venta` | El argumentario de §7 |

### De tus proyectos anteriores *(esto es lo que más vale)*

| Origen | Qué se trae |
| --- | --- |
| `Bot Clinica Demo V1` | Los **bloques del prompt** (`4 Agente/`), la **estructura de la hoja** (`C4`), la **regla del desvío** (`O2`), y las trampas de Gemini (`D1`). Es la misma guerra, ya peleada |
| `Bot Clinica WhatsApp` | El modelo de **ficha por clínica**, la disciplina de **huecos y bloques**, la **columna `público`**, y `50 - Como coge una cita`, que aquí se adapta a voz |

> La V1 era un orquestador propio en Python. Esto es lo mismo con Vapi debajo: se cambia el arnés, **no el producto**. Los bloques `25` y `30` cruzan enteros.

### Fuentes oficiales consultadas

- Variables dinámicas y `assistantOverrides` — docs.vapi.ai/assistants/dynamic-variables
- Herramientas propias: formato de petición y respuesta — docs.vapi.ai/tools/custom-tools
- Google Calendar (`google.calendar.event.create`, `google.calendar.availability.check`) — docs.vapi.ai/tools/google-calendar
- Google Sheets (`google.sheets.row.append`, **append-only**) — docs.vapi.ai/tools/google-sheets
- Modelos Gemini y `provider: "google"` — docs.vapi.ai/providers/model/gemini
- Respaldo de **voz** (existe) — docs.vapi.ai/voice-fallback-plan
- Respaldo de **transcriber** (existe) — docs.vapi.ai/customization/transcriber-fallback-plan
- Importar número de Twilio — docs.vapi.ai/phone-numbers/import-twilio
- Eventos del servidor y `end-of-call-report` — docs.vapi.ai/server-url/events
- Llamada web de prueba desde el panel (**Talk**) — docs.vapi.ai/quickstart/dashboard
- Límites del número gratuito (*US national calling only*, *inbound only*) — docs.vapi.ai/free-telephony

---

## 12. Decisiones abiertas

Ninguna bloquea el arranque. La fase 0 se puede empezar hoy.

1. **Voz concreta.** Se decide oyéndolas en español peninsular, no leyendo una tabla. Fase 1.
2. **n8n o repo propio.** El plan recomienda repo. Si hay una demo con fecha en menos de una semana, n8n con las plantillas de `PAGO` es más rápido.
3. **Una hoja por clínica, o una hoja con varias.** Una por clínica es más simple y aísla mejor. Se revisa a partir de la tercera clínica.
4. **Panel de métricas.** La V1 tenía uno. Para la demo la hoja basta y sobra; el panel es argumento de la segunda reunión.
5. **Grabación de llamadas en la demo.** Sugerencia: **apagada**, y números ficticios. Cuesta poco y quita una conversación incómoda sobre RGPD en la reunión de venta.
