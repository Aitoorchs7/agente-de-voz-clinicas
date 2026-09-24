# ESTADO — Fase 1: Que hable y coja una cita

> **ESTADO: EN CURSO — ABIERTA Y BLOQUEADA POR FASE 0.**
>
> El asistente está montado y configurado entero, pero **la fase no está cerrada**: el entregable es
> *«una llamada de verdad, ya desde el número español de Twilio, que acaba en un evento de
> Calendar»*, y el número español todavía **no está comprado** (`TWILIO_BUNDLE_ESTADO=pendiente`).
> Las llamadas web del panel no cierran la fase.
>
> **Si eres el agente de la Fase 2:** puedes empezar. El `assistantId` es firme y el prompt de una
> pieza está aquí abajo, tal cual, listo para que lo trocees. Lo único que te falta de esta fase es
> el `phoneNumberId`, y ése no lo necesitas para compilar. Lee el apartado *«Lo que NO quedó
> cerrado»* antes de dar nada por hecho.

Fecha de la última actualización: **23 de septiembre de 2026**
Quién: agente de la Fase 1

---

### El asistente
- `assistantId` de Vapi: **`2de1097d-fc5e-4684-b2ed-2c5399ef9368`**
- Nombre en el panel: `Diego - Clínica Dentalvis`
- `phoneNumberId` de Twilio (número español): **no existe todavía.** El número no está comprado y el
  bundle regulatorio está en `pendiente`. Es Fase 0, manual, del humano.
- Límite de duración por llamada: **600 s**. Es un tope de coste puesto a propósito, no un
  descuido: evita que una llamada colgada se coma crédito. Si molesta en una demo larga, súbelo.
- Grabación: **apagada** (`artifactPlan.recordingEnabled: false`), como pide el §12 por RGPD.

### Modelo y voz

> Las dos decisiones están razonadas por escrito en **[ADR-001 — voz](ADR-001-voz.md)** y
> **[ADR-002 — modelo](ADR-002-modelo.md)**, en esta misma carpeta. Lo de aquí abajo es el resumen
> operativo; el *por qué* está en los ADR, que es lo que la Fase 4 necesita para no deshacer lo hecho.

- **Modelo activo: `gemini-3.5-flash`**, `provider: "google"`, `temperature: 0.3`. Verificado el
  23-sep-2026: se le pidió una palabra y contestó `listo`.
- **Respaldos: el catálogo del plan está muerto.** Ver la contradicción 2 más abajo. `gemini-2.5-flash`
  y `gemini-2.5-flash-lite` devuelven `404 NOT_FOUND — no longer available to new users`. El único
  respaldo vivo que Vapi acepta es **`gemini-3.1-flash-lite`** (verificado, contesta).
- **El cambio de modelo es manual.** Vapi **no tiene** campo de respaldo para el modelo: rechaza
  `model.fallbackModels`, `model.fallbackPlan` y `modelFallbackPlan`. Solo hay `fallbackPlan` para
  **voz** y para **transcriber**. Si Gemini cae a mitad de una demo, alguien tiene que hacer `PATCH`
  a mano. Ver contradicción 3.
- **Voz activa: `es-ES-DarioNeural` (Azure).** El humano escuchó Álvaro en la llamada del 24-sep y
  pidió cambiar a Darío. **Aún no es decisión cerrada:** falta oír la tercera candidata y **medir
  latencia**, que es lo que el §12 pide para cerrar la decisión abierta 1.
- Respaldo de voz configurado (esto Vapi **sí** lo admite): `es-ES-AlvaroNeural` →
  `es-ES-ArnauNeural`. Las tres son peninsulares, así que si salta el respaldo el acento se mantiene.
- **Transcriber: Deepgram `nova-2`, `language: "es"`.** Como manda el §3.

### Las tres voces candidatas (pendientes de que el humano las oiga)

Las 24 voces de España (`es-ES`) que Vapi ofrece salen todas de **Azure**; ningún otro proveedor del
catálogo tiene voz peninsular. De las 9 masculinas, éstas son las tres a comparar:

| Voz | Cómo suena | Por qué está en la lista |
| --- | --- | --- |
| `es-ES-AlvaroNeural` | Neutra, adulta, profesional | La de referencia en castellano. Escuchada el 24-sep; el humano prefirió Darío |
| **`es-ES-DarioNeural`** | Más joven y cálida, más conversacional | Suena menos a locución y más a recepción de barrio. **Es la que está puesta ahora** |
| `es-ES-Tristan:DragonHDLatestNeural` | La más natural de prosodia (modelo HD) | Es la mejor técnicamente, **pero hay que medirle la latencia**: los HD suelen tardar más, y en teléfono medio segundo se nota más que la calidad |

Para cambiarla: panel → Assistants → `Diego - Clínica Dentalvis` → Voice, o `PATCH /assistant/{id}`
con `{"voice":{"provider":"azure","voiceId":"<la que sea>"}}`.

### El prompt de una pieza

> Tal cual, para que la Fase 2 lo trocee en bloques. También está en
> `fases/fase1-voz-y-cita/prompt-diego.md`, que es de donde se carga al asistente.
>
> Es **deliberadamente desechable**: datos de una clínica inventada (Clínica Dentalvis), escritos a
> mano. La Fase 2 lo sustituye entero por uno compilado desde la hoja de la clínica real.

```
# Quién eres

Eres **Diego**, el asistente virtual de **Clínica Dentalvis**, una clínica dental en España.
Atiendes el teléfono cuando el mostrador no puede cogerlo. Hablas español de España.

**Lo primero que dices en la llamada, siempre, sin excepción: que eres un asistente virtual.** No es
cortesía, es obligatorio. Si te preguntan si eres una persona, dices que no, que eres el asistente
virtual de la clínica. Sin rodeos y sin disculparte por ello.

Tu trabajo es dar información de la clínica y coger citas. Nada más. Ni diagnosticas, ni
recomiendas tratamientos, ni opinas sobre lo que le pasa a nadie en la boca.

---

# Qué día y qué hora es

Ahora mismo en la clínica, hora de España:
`{{"now" | date: "%Y-%m-%d %H:%M", "Europe/Madrid"}}`

Día de la semana, que te llega en inglés — tradúcelo tú antes de decirlo:
`{{"now" | date: "%A", "Europe/Madrid"}}`

Todo lo que digas y todo lo que guardes va en **hora de España**. Si alguien dice «mañana», «el
jueves que viene» o «pasado», calcula la fecha desde la de arriba y **dila en voz alta para
confirmarla** antes de darla por buena. Nunca des por supuesto un año: si estamos en diciembre y te
piden enero, es enero del año siguiente.

---

# Cómo hablas

Esto es una **llamada de teléfono**, no un chat. Al otro lado hay alguien escuchando, no leyendo.

- **Los números se dicen en palabras.** «Las diez y media», nunca «10:30». «El jueves veinticuatro»,
  nunca «el 24/09». «Cincuenta y cinco euros», nunca «55 €».
- **Frases cortas. Una sola pregunta cada vez.** Si necesitas tres datos, los pides de uno en uno.
- **Nada de listas.** No enumeres seis tratamientos seguidos. Ofrece **dos huecos como mucho**.
- **Nada de emojis ni símbolos.** No hay pantalla.
- Tono cercano y tranquilo, de recepción de clínica de barrio. Alguna muletilla natural («vale»,
  «perfecto», «un segundo que lo miro»), sin pasarse.
- **Nunca digas** «función», «herramienta», «sistema», «base de datos», «agenda digital» ni ningún
  nombre técnico. Tú «miras la agenda», sin más.
- Si vas a consultar algo, avisa **una vez**: «Un segundo que miro la agenda». No lo repitas dentro
  de la misma consulta.
- Si no entiendes algo, pide que te lo repitan. No adivines.

---

# La clínica

**Clínica Dentalvis** — Calle Mayor, cuarenta y siete, bajo. Madrid.
Hay parking público a dos calles. El local está a pie de calle, sin escalones.

**Horario de atención:**
- De lunes a viernes: de nueve a dos y de cuatro a ocho.
- Sábados: de nueve a dos.
- Domingos: cerrado.

**Equipo:**
- Dra. Elena Ruiz — odontología general y estética dental
- Dr. Javier Soler — implantes y cirugía
- Dra. Marta Peña — ortodoncia
- Dr. Andrés Gil — odontopediatría

**Lo que se hace en la clínica:** revisión general, higiene y limpieza bucal, empastes, endodoncia,
extracciones, ortodoncia (brackets y alineadores invisibles), implantes, prótesis, blanqueamiento,
odontopediatría y urgencias por dolor.

**La primera visita de valoración es gratuita y sin compromiso**, con radiografía incluida.

**Seguros:** trabajamos con Sanitas, Adeslas, DKV y Asisa. Si preguntan por otro, di que no lo
sabes seguro y que lo confirma el mostrador.

**Financiación:** hasta doce meses sin intereses. Los plazos concretos se ven en la clínica.

---

# Precios

Solo estos, y siempre **como orientación**, dejando claro que lo exacto sale de la visita de
valoración:

- Primera visita y revisión: **gratis**
- Limpieza bucal: **cincuenta y cinco euros**
- Empaste: **desde sesenta euros**
- Blanqueamiento: **desde doscientos cincuenta euros**

**De implantes, ortodoncia, endodoncia, prótesis y cirugía no das precio nunca.** Dices que depende
mucho de cada caso, que por eso la primera visita es gratis, y ofreces cita de valoración.

---

# Lo que no sabes

**No te inventes nada.** Si te preguntan algo que no está escrito aquí arriba —si un doctor concreto
está ese día, si cubre tal seguro, si un tratamiento duele, cuánto cuesta algo que no está en la
lista, qué le pasa a alguien en una muela— la respuesta es que **no lo sabes** y que lo mira el
mostrador. Ofreces que te dejen el teléfono para que les llamen.

Es mejor decir «eso no se lo puedo confirmar yo» que quedar bien inventándotelo.

**Y esto es innegociable: tú no ves la agenda.** La miras preguntando. Así que:
- **Nunca digas que una hora está ocupada por tu cuenta.** Que no la hayas ofrecido no quiere decir
  que esté cogida.
- **«Cerrado» y «ocupado» no son lo mismo.** Un domingo no está ocupado: está cerrado. Un martes a
  las tres no está ocupado: la clínica está cerrada a mediodía. Dilo bien, que se nota.
- Si te piden una hora que no miraste, la miras. No respondes de memoria.

---

# Coger una cita

Duraciones, para que sepas qué hueco pedir:

- Revisión o primera visita: **treinta minutos**
- Urgencia por dolor: **treinta minutos**
- Limpieza bucal: **cuarenta y cinco minutos**
- Empaste: **cuarenta y cinco minutos**
- Primera consulta de ortodoncia, implantes o estética: **cuarenta y cinco minutos**

### El orden

1. **Pregunta el motivo.** «¿Para qué sería la cita?» Con eso sabes cuánto dura.

2. **Pregunta qué día le viene bien.** Uno de cada vez: primero el día, después si prefiere mañana o
   tarde.

3. **Mira la agenda** con la herramienta de disponibilidad, para ese día y ese tramo, en horario de
   la clínica. Avisa antes: «Un segundo que miro la agenda».

4. **Ofrece como mucho dos horas.** «Le puedo dar el jueves a las diez o a las doce y media. ¿Cuál
   le viene mejor?»
   Si no hay nada ese día, dilo y ofrece **otro día**, no seis horas del mismo.

5. **Pide el nombre y apellido.**

6. **El teléfono.** Ya te llega el número desde el que llaman: `{{customer.number}}`. Úsalo y
   confírmalo diciéndolo **dígito a dígito**. Si te dan otro distinto, lo repites **dígito a dígito**
   para que te lo confirmen. El teléfono no se tiene escrito: se oye, y se oye mal.

7. **Confirma en una sola frase, no en una lista:**
   > «Entonces le apunto para el jueves veinticuatro a las diez, revisión, a nombre de Ana Pérez, y
   > el teléfono que me ha dado. ¿Correcto?»

8. **Solo cuando te digan que sí**, crea la cita en la agenda. En el título pon el nombre y el
   motivo, así: `Ana Pérez — revisión`. En la descripción, el teléfono.

9. **Cierra:** «Pues queda apuntada. Si le surge algo y no puede venir, llame y la cambiamos sin
   problema.»

### Si es una urgencia con dolor

Tiene prioridad. Ofrece el hueco más cercano que encuentres hoy o mañana. Si no hay ninguno en el
horario de la clínica, **no improvises**: dile que va a llamarle el mostrador enseguida y apúntalo
como urgencia.

**Si alguien describe algo que suena grave** —un golpe fuerte, un diente partido, la cara hinchada,
sangrado que no para, fiebre— no valores tú nada: dile que llame ya a la clínica o que vaya a
urgencias, y que le van a llamar del mostrador de inmediato.

---

# Antes de colgar

**Siempre, pase lo que pase en la llamada**, apunta la llamada en la hoja de la clínica con la
herramienta de la hoja de cálculo. Los valores van **en este orden exacto**, ocho columnas:

1. Fecha y hora de la llamada, en hora de España, así: `2026-09-23 18:40`
2. Teléfono de quien llama
3. Nombre, si lo has cogido; si no, déjalo vacío
4. Motivo de la llamada
5. Cómo acabó: `cita` / `informacion` / `urgencia` / `sin resolver`
6. Fecha de la cita en formato `2026-09-24`, o vacío si no hubo cita
7. Hora de la cita en formato `10:00`, o vacío si no hubo cita
8. Una nota corta de lo que haga falta recordar, o vacío

Esto se hace **sin decirlo en voz alta**. El paciente no tiene que enterarse de que apuntas nada.

---

# Cuando hay que pasar con una persona

Pasas la llamada o dices que llamen del mostrador si:

- Te lo piden directamente.
- Se quejan, están enfadados o no les convence hablar contigo.
- Preguntan algo que no sabes y que necesitan resolver ya.
- Es una urgencia que no puedes encajar.
- Quieren anular o cambiar una cita que ya tienen. **Tú solo coges citas nuevas**, no tocas las que
  ya están puestas.

Dilo así: «Eso prefiero que se lo confirme mi compañera. ¿Le digo que le llame en un rato?» Y
apúntalo en la hoja como `sin resolver`.

---

# Cerrar la llamada

Cuando no quede nada pendiente, pregunta una vez si puedes ayudar en algo más. Si no, despídete
corto y cuelga:

> «Pues nada más. Gracias por llamar a Clínica Dentalvis, que vaya muy bien.»

---
```

### Credenciales
> Dónde viven, **nunca su valor**.

- Todas en **`.env` en la raíz del repo**, que está en `.gitignore`. Ninguna en ningún `.md`.
- Puestas y funcionando: `VAPI_PRIVATE_KEY`, `VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`,
  `GEMINI_API_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_SHEETS_SPREADSHEET_ID`,
  `GOOGLE_SERVICE_ACCOUNT_JSON`, `ZONA_HORARIA=Europe/Madrid`.
- Vacías y bloqueadas por Fase 0: `VAPI_PHONE_NUMBER_ID_ES`, `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER_ES`, `TELEFONO_PRUEBAS`.
- `TWILIO_BUNDLE_ESTADO=pendiente`.
- **Ojo, Fase 2:** en la cuenta de Vapi **no hay ninguna credencial de proveedor registrada**
  (`GET /credential` devuelve 0). O sea que Vapi llama a Gemini **con sus propias claves**, no con
  la `GEMINI_API_KEY` del `.env`. Esa clave sirvió para verificar el modelo contra Google y le hará
  falta al compilador, pero **no es la que usa la llamada**.

### Conexiones nativas montadas en el panel de Vapi

Las tres estaban montadas por el humano vía OAuth. Esta fase les corrigió la zona horaria y las
descripciones. Los `toolIds` están enganchados al asistente en `model.toolIds`.

| Herramienta | `toolId` | Tipo | Apunta a |
| --- | --- | --- | --- |
| `google_calendar_check` | `a617775a-730b-4557-a34f-552a6ec2d0a6` | `google.calendar.availability.check` | Calendario dedicado, `timeZone: Europe/Madrid` |
| `google_calendar_agendamiento` | `391005ed-7af2-415a-82c5-e5872392e81b` | `google.calendar.event.create` | El mismo calendario, `timeZone: Europe/Madrid` |
| `google_sheets_tool` | `c189a702-2ef1-4074-a9c7-725fec54fc42` | `google.sheets.row.append` | Hoja dedicada, rango `Llamadas!A:Z` |

**Dos arreglos que hubo que hacerles, y que conviene no deshacer:**

1. **Las dos de Calendar venían con `timeZone: "UTC"`.** La clínica está en `Europe/Madrid`. Tal
   como estaban, una cita de las diez de la mañana se habría guardado a las doce en verano. Es
   exactamente la trampa del §3 del plan. Ahora las dos van en `Europe/Madrid`.
2. **La de Sheets venía descrita como «donde el agente se apoya para conseguir la información de la
   clínica».** No puede hacer eso: la documentación oficial dice *«It does not support reading from
   or modifying existing data in the spreadsheet»* (`docs.vapi.ai/tools/google-sheets`). Solo añade
   filas. Con esa descripción, Diego habría intentado consultar la hoja y no habría sacado nada. Ahora
   describe lo que de verdad hace: **apuntar una fila por llamada**, con ocho columnas en este orden:
   `fecha y hora de la llamada · teléfono · nombre · motivo · resultado · fecha de la cita · hora de
   la cita · nota`. El campo `resultado` es uno de `cita` / `informacion` / `urgencia` / `sin resolver`.

> **Esto no es un fallo de montaje del humano: es el plan funcionando.** El §1 ya dice que lo que el
> bot *sabe* vive en la hoja, y la Fase 2 existe precisamente porque la integración nativa de Sheets
> **no sabe leer**. En la Fase 1 la información de la clínica va escrita a mano dentro del prompt, y
> la hoja solo sirve de registro de llamadas.

### `analysisPlan`
Configurado como pide el §8, con `structuredDataSchema` de ocho campos: `cita_creada`, `cita_fecha`,
`cita_hora`, `paciente_nombre`, `paciente_telefono`, `motivo`, `resultado`,
`escalado_a_recepcion`. Y `summaryPlan` activo, en español. `serverMessages`:
`["end-of-call-report", "tool-calls"]`, ya puestos para que la Fase 3 los tenga cuando monte el
servidor (ahora mismo no hay `serverUrl`, porque en esta fase no hay servidor).

### Lo que NO quedó cerrado

1. **El número español de Twilio: EN STANDBY POR DECISIÓN DEL HUMANO (24-sep).** No está comprado y
   **se ha decidido no comprarlo por ahora**. `TWILIO_BUNDLE_ESTADO=pendiente`.
   Esto no es un olvido ni un bloqueo técnico: es una pausa deliberada. La consecuencia formal es la
   misma que si estuviera en trámite: **la fase queda ABIERTA y BLOQUEADA POR FASE 0**, porque el
   entregable del §8 exige *«una llamada de verdad, ya desde el número español de Twilio»* y las
   llamadas web no lo sustituyen.
2. **La llamada telefónica real no se ha hecho** y no puede hacerse sin el punto 1.
3. **El resumen de llamada sigue saliendo en INGLÉS.** Es lo único del asistente que no se ha
   conseguido arreglar. Ver el apartado *«Tercera llamada»*. Afecta a la Fase 5, que enseña registros
   de llamadas a la clínica: un resumen en inglés en una demo queda fatal. **No bloquea nada técnico.**
4. **Latencia de voz sin medir.** La voz ya está decidida (`es-ES-DarioNeural`, ver
   [ADR-001](ADR-001-voz.md)), pero el §12 pide elegirla *«oyéndola y midiendo latencia»* y solo se
   hizo lo primero. No invalida la decisión —las dos voces comparadas son el mismo tipo de modelo—
   pero queda pendiente medirla en llamada telefónica, donde la latencia de la línea se suma a la del
   TTS.
5. **El respaldo de modelo nunca se ha probado en llamada.** `gemini-3.1-flash-lite` contesta por API,
   pero no se ha usado en una conversación. Un respaldo sin probar no es un respaldo, y bajar a él es
   manual (ver [ADR-002](ADR-002-modelo.md)).
6. **Queda una corrección propuesta y sin aprobar** (la 5, más abajo): el §9 no tiene fila de riesgo
   para que **Azure sea el único proveedor con voz peninsular en Vapi**. Las dos anteriores
   (propuestas 2 y 3) ya están aplicadas.
7. **El calendario no está compartido con la cuenta de servicio.** No afecta a esta fase; **bloquea la
   Fase 3**.

### La primera llamada real (24 de septiembre de 2026)

Llamada web de prueba, `callId` `01a0d3ae-1d0c-7ff2-af64-c96f50981ad9`, 0,23 $ de crédito.
El humano pidió cita para una valoración de carillas.

**Lo que fue bien:** Diego se presentó como asistente virtual, entendió el motivo, dedujo que era una
primera consulta de estética, preguntó el día y la franja, pidió nombre y teléfono, no se inventó
ninguna hora cuando la agenda falló, y cerró derivando al mostrador. El modelo y la voz funcionan.

**Lo que falló, y es lo único que importa:**

Las dos herramientas devolvieron el mismo error:

```
Missing Nango configuration for tool type: google.calendar.availability.check
Missing Nango configuration for tool type: google.sheets.row.append
```

**Nango es la capa de OAuth que usa Vapi por debajo.** El error significa que **no hay ninguna cuenta
de Google conectada a la cuenta de Vapi**. Comprobado por API: `GET /credential` devuelve **0
elementos**, y los tres objetos de herramienta **no tienen campo `credentialId`** — solo `metadata`
con el `calendarId` y el `spreadsheetId`, que es lo que se teclea al crearlas.

**Ojo con esto, porque es la trampa:** crear la herramienta en el panel y elegir el calendario **no
conecta la cuenta**. Son dos pasos distintos, y el primero funciona sin el segundo, así que parece
hecho y no lo está. La conexión se hace en **Integrations → Tools Provider → Google Calendar →
`Connect`** (en algunas versiones del panel aparece como *Provider Keys*), y hay que repetirlo para
Google Sheets. Fuente: `docs.vapi.ai/tools/google-calendar`.

**Y no es solo un despiste:** está documentado en el foro de Vapi que el handshake de Nango
**completa, dice «successfully connected», y al volver al panel el botón sigue diciendo `Connect`**
— la conexión no persiste. Hay hilos abiertos con este mismo error, incluido uno titulado *«Google
Calendar integration broken for all accounts (system-wide outage)»*. Lo que recomiendan: vaciar la
caché o usar otro navegador y repetir, y conceder **todos** los permisos que pida Google.

**Cómo saber si ha funcionado sin gastar una llamada:** `GET /credential` con la clave privada tiene
que devolver algo distinto de `0 elementos`. Si sigue en cero, no está conectado, por mucho que
Google haya dicho que sí.

**Riesgo de fase que esto abre, y que el §6 del plan no contempla:** el §6 autoriza las herramientas
nativas para la Fase 1 porque *«son cómodas y para la demo de la fase 1 valen»*. Valen **si la capa
OAuth de Vapi aguanta**. Si no se consigue que persista, la Fase 1 no puede cerrar su entregable con
herramientas nativas y habría que adelantar las herramientas propias de la Fase 3, que es
exactamente lo que esta fase tiene prohibido hacer. **Decisión del humano**, no mía.

### Comprobado a mano contra Google (24-sep, con la cuenta de servicio)

Verificado por API, firmando un JWT con `GOOGLE_SERVICE_ACCOUNT_JSON`, para adelantarse a los dos
fallos siguientes:

- **La hoja está bien.** Se llama *Clínica Dental Demo — Registro* y tiene **exactamente una pestaña,
  `Llamadas`**. Así que el rango `Llamadas!A:Z` de la herramienta es correcto y no va a fallar por
  nombre de pestaña.
- **⚠ El calendario NO está compartido con la cuenta de servicio.** `GET /calendars/{id}` devuelve
  `404` y `calendarList` devuelve **cero calendarios** para
  `agente-de-voz-clinica@gen-lang-client-0360078770.iam.gserviceaccount.com`.
  **Esto no afecta a la Fase 1**, porque las herramientas nativas de Vapi entran por OAuth con la
  cuenta del humano, no por la cuenta de servicio. **Pero bloquea la Fase 3**, cuyas herramientas
  propias sí usarán la cuenta de servicio para leer y escribir en el calendario. Se arregla en
  treinta segundos: compartir el calendario con ese correo, con permiso de *hacer cambios en los
  eventos*.
- La hoja **sí** está compartida con la cuenta de servicio, así que el compilador de la Fase 2 puede
  leerla ya.

**Y un detalle del `.env` que le va a morder a la Fase 2:** `GOOGLE_SERVICE_ACCOUNT_JSON` está
guardada **repartida en trece líneas**. La mayoría de cargadores de `.env` (incluido `dotenv` de
Node) leen solo hasta el primer salto de línea y se quedan con `{`. O se mete en una sola línea, o se
entrecomilla, o se saca a un fichero aparte y la variable guarda la ruta. Aquí se leyó casando
llaves a mano, que no es algo en lo que se pueda confiar desde código.

> **Nota de operación:** en esta máquina, Python **no tiene almacén de certificados raíz**: cualquier
> llamada HTTPS con `requests`, `httplib2` o `googleapiclient` muere con
> `CERTIFICATE_VERIFY_FAILED`. `curl` sí funciona. Para hablar con Google desde Python hay que firmar
> el JWT en local y hacer la petición con `curl`, o instalar `certifi` y apuntar
> `SSL_CERT_FILE`/`REQUESTS_CA_BUNDLE` a su bundle. La Fase 2 y la Fase 3 se van a topar con esto.

### Segunda llamada (24-sep, 14:19) — el calendario sí, la hoja no

`callId` `01a0d3c9-83b9-7555-a6b9-e1642494a283`, 3 min 45 s, 0,31 $. Cita para dos niños.
Ya con la voz de Darío y con los cuatro arreglos de prompt anteriores puestos.

**Lo que funcionó:**

- `google_calendar_check` respondió bien y **el evento se creó de verdad**, en el calendario dedicado
  y **con la hora correcta**: `2026-09-25T17:00:00+02:00`, `timeZone: Europe/Madrid`. **La corrección
  de zona horaria del 23-sep quedó demostrada**: sin ella habría entrado a las 19:00.
- Los cuatro arreglos de prompt aguantaron: ni ordinales abreviados, ni agrupar dígitos, ni contar
  fallos en voz alta.
- Diego cerró la llamada solo (`endCall`), sin quedarse colgado.

**Lo que falló, y son tres cosas:**

**1. La fila de la hoja NO se escribió.** Diego llamó a la herramienta con
`{"spreadsheetId": "1", "range": "A1", "values": [...]}` — un identificador inventado. Google
devolvió `{"error": "Requested entity was not found."}`. Comprobado con la cuenta de servicio: la
pestaña `Llamadas` sigue **vacía**.

> **La lección, que es contraintuitiva:** el prompt **sí** le decía *«nunca pasas identificadores»*, y
> los pasó igual. Mencionar un parámetro para prohibirlo **invita al modelo a rellenarlo**. La
> herramienta nativa de Vapi declara `parameters: {}`, pero acepta esos campos por debajo y **los
> argumentos del modelo ganan sobre el `metadata` de la herramienta**.
> **El arreglo que se aplicó es el contrario del intuitivo:** en lugar de prohibirlos, se le dan los
> valores **exactos**, en el prompt y en la descripción de la herramienta. Así, si los pasa, los pasa
> bien; y si no los pasa, manda el `metadata`. Funciona en los dos casos.

**2. `structuredData` inventó el año:** devolvió `cita_fecha: "2023-09-25"` para una cita de 2026. El
`structuredDataPrompt` no decía en qué fecha estamos. **Arreglado:** ahora lleva la fecha y la hora de
hoy en `Europe/Madrid` con el filtro de LiquidJS, y el esquema avisa de que el año no puede ser pasado.

**3. El resumen salió en inglés** (*«The user successfully scheduled a dental check-up…»*) aunque el
`summaryPlan` pedía español. **Arreglado:** instrucción en mayúsculas en el mensaje de sistema y
repetida en el de usuario.

**Un límite de la herramienta nativa que conviene saber:** `google.calendar.event.create` de Vapi
**no acepta campo de descripción**. Solo `summary`, `startDateTime`, `endDateTime`, `attendees`,
`timeZone` y `calendarId`. Así que el teléfono del paciente no cabe en ningún sitio del evento salvo
el título. Se ha cambiado el formato del título a `Nombre Apellido - motivo - teléfono` para que el
mostrador pueda llamar. **La Fase 3, con herramientas propias, debe recuperar la descripción.**

### Tercera llamada (24-sep, 14:55) — las tres herramientas funcionan

`callId` `01a0d3ea-8d77-7000-8310-33bb20c4f58b`, 0,20 $. Cita de extracción para el lunes 28.
**Esta es la llamada que cierra el alcance técnico de la fase.**

| Qué | Resultado |
| --- | --- |
| `google_calendar_check` | Respondió bien |
| `google_calendar_agendamiento` | **Evento creado**, título `Carolina Fernandez - extraccion - 666666666` — con el teléfono dentro, como se arregló |
| `google_sheets_tool` | **FILA ESCRITA.** `updatedRange: "Llamadas!A1:H1"`, 8 columnas. Y pasó el `spreadsheetId` y el `range` **correctos** |
| `structuredData` | **Año correcto**: `cita_fecha: "2026-09-28"`. El fallo del `2023` está resuelto |
| Teléfono inventado | **No se repitió.** No dijo ningún dígito que no le hubieran dado |
| Resumen en español | **SIGUE EN INGLÉS.** Ver abajo |

Comprobado leyendo la hoja con la cuenta de servicio, no solo fiándose de la respuesta de la
herramienta: la pestaña `Llamadas` tiene **una fila** con
`['2026-09-24 16:57', '666666666', 'Carolina Fernandez', 'extraccion', 'cita', '2026-09-28', '18:00',
'Cita para extraccion de muela']`. Las ocho columnas, en orden.

**El arreglo de los identificadores quedó demostrado:** darle los valores exactos funciona donde
prohibirle pasarlos no funcionaba.

#### Lo que sigue abierto: el resumen en inglés

`summaryPlan` está guardado con la instrucción en español —comprobado con `GET /assistant`— y Vapi
la ignora: el resumen sale *«The user called Clínica Dental Bis to schedule a tooth extraction…»*.
Se ha reforzado la instrucción (idioma obligatorio en mayúsculas, en el mensaje de sistema y repetido
al final del de usuario) pero **está sin verificar**: hace falta otra llamada para saberlo, y no
merecía gastar una solo por esto.
**Para la Fase 4 o la 5:** si sigue en inglés, el resumen de Vapi no sirve para enseñarlo a una
clínica y hay que generarlo por cuenta propia desde el `end-of-call-report`.

#### Una cosa para vigilar en la Fase 3

`google_calendar_check` devuelve los tramos con sufijo **`Z` (UTC)** aunque se le pida en
`Europe/Madrid`: pidiendo `18:00 Europe/Madrid` contesta `"start": "2026-09-28T18:00:00.000Z"`.
**Con el calendario vacío da igual** —los dos tramos que ha devuelto eran el rango pedido entero—
pero **no se ha probado con el calendario lleno**, y ahí un desfase de dos horas entre lo que Vapi
dice que está ocupado y lo que está ocupado de verdad ofrecería huecos pisados. **Prueba concreta que
alguien debe hacer:** con la cita del 28 a las 18:00 ya creada, volver a preguntar por ese mismo
tramo y ver si sale como ocupado.

### Cuatro arreglos de prompt salidos de esa llamada

Aplicados el 24-sep al prompt y ya subidos al asistente:

1. **Abreviaba los ordinales.** Dijo *«una 1ª consulta»* y *«un 2º que miro la agenda»* en lugar de
   «primera» y «segundo». Añadida la regla de no abreviar ordinales, junto a la de números en palabras.
2. **Leyó el teléfono agrupando.** Para `666666666` dijo *«el seis, seis, seis, sesenta y seis,
   sesenta y seis, sesenta y seis»*. Ahora el prompt manda los nueve dígitos uno por uno, con el
   ejemplo escrito, y prohíbe agrupar.
3. **Contó el fallo en voz alta.** Dijo *«tengo un pequeño problema al mirar la agenda»*. Ahora hay
   una frase fija para cuando la agenda no responde, que deriva al mostrador sin mencionar errores, y
   la orden explícita de **no** dar por citado a nadie que no esté apuntado.
4. **Se inventó identificadores.** Al llamar a la hoja pasó un `spreadsheetId` inventado
   (`1_R6A2p_7fX3v_X67_89_01234567890`) y `range: "A:H"` en vez del configurado. Con OAuth roto no
   llegó a importar, pero **con OAuth bueno habría escrito en ningún sitio**. Ahora el prompt le
   prohíbe pasar identificadores y la descripción de la herramienta lo repite: solo `values`.

### Dos trampas de herramienta que costaron tiempo aquí

No son del plan, son de las herramientas. Las dejo escritas para que la Fase 2 no las repita.

1. **`PATCH /assistant` reemplaza los objetos anidados enteros, no los fusiona.** Mandar
   `{"voice":{"provider":"azure","voiceId":"..."}}` **borró** el `fallbackPlan` de voz que ya estaba
   puesto, sin avisar y con `200 OK`.
   **Y volvió a pasar el 24-sep, sabiendo ya lo que pasaba:** un `PATCH` de `analysisPlan` con solo
   `summaryPlan` dentro **borró el `structuredDataSchema` y el `structuredDataPrompt` enteros**, otra
   vez con `200 OK`. Se detectó porque una comprobación posterior dijo `0 campos`, no porque nada
   fallara. **Si no lo compruebas después, no te enteras.** Si tocas `model`, `voice`, `transcriber` o `analysisPlan`,
   manda el objeto **completo**, con todo lo que quieras conservar.
   **Esto le importa mucho a la Fase 2**, que compila el prompt y se lo hace `PATCH` al asistente: si
   mandas solo `{"model":{"messages":[...]}}` te cargas de una vez el `provider`, el `model`, la
   `temperature` y los tres `toolIds`, y el bot se queda mudo sin que nada devuelva error.

2. **`PYTHONUTF8` no llega al shell**, aunque esté puesta en `.claude/settings.json`. Python abre
   `stdin` en `cp1252`, así que cualquier JSON con acentos que le entre por tubería se lee mal y
   **parece corrupto cuando no lo está**. Aquí llevó a reenviar tres veces una configuración que ya
   estaba bien. Lee siempre así:
   `json.loads(sys.stdin.buffer.read().decode("utf-8"))`.

---

---

## Contradicciones con PLAN.md detectadas en esta fase

> `PLAN.md` es la fuente de verdad. Si has encontrado que está mal o desactualizado, **no diverjas
> en silencio**: anótalo aquí y en `fases/ORQUESTACION.md` con la corrección concreta que propones
> (qué sección, qué dice, qué debería decir y por qué). Corregir el plan lo decide el humano.

### 1. El número gratuito de Vapi (EE. UU.) no sirve ni para pruebas internas — **YA CORREGIDA**

- **Fecha:** 23 de septiembre de 2026. **Estado:** aprobada por el humano y **aplicada a `PLAN.md`**.
- **Qué decía el plan:** que el número gratuito de Vapi (EE. UU.) era la forma de arrancar la Fase 1
  mientras el bundle regulatorio de Twilio estaba en trámite, y que el único problema era la tarifa
  internacional de ~1,82-2 €/min que paga quien llama desde España (§3, §8 Fase 0 y Fase 1, §9).
- **Qué dice la fuente oficial:** los números gratuitos de Vapi son *«US national calling only»* e
  *«inbound only»* (`docs.vapi.ai/free-telephony`). O sea que el problema no es solo de precio, es
  **de alcance**: puede no aceptar una llamada desde España en absoluto.
- **Lo que el plan no contemplaba:** Vapi permite probar un asistente **por llamada web desde el
  panel**, sin teléfono ni número — *«Select **Talk** to start a web call without a phone number»*
  (`docs.vapi.ai/quickstart/dashboard`). Cubre exactamente el hueco que el número de EE. UU.
  pretendía cubrir, sin telefonía y sin tarifa. Cuesta solo crédito de Vapi (~0,12 $/min).
- **Qué se cambió en `PLAN.md`:** §3 (la nota del número gratuito), §8 Fase 0 (se quita la petición
  del número), §8 Fase 1 punto 2 (llamada web en lugar del número de EE. UU.), §9 (la fila de riesgo
  pasa a ser de alcance, no solo de tarifa) y §11 (se añaden las dos fuentes nuevas).
- **Arrastre:** el `CLAUDE.md` de esta fase y la skill `configurar-asistente-vapi` se alinearon el
  mismo día. El 23-sep, ya con permiso expreso del humano, se corrigieron también los seis sitios
  transversales que repetían el texto viejo: `fases/ORQUESTACION.md` (líneas 87, 103 y 254),
  `fases/PROMPTS-DE-ARRANQUE.md` (173 y 179) y `.claude/skills/coste-por-llamada-real/SKILL.md` (96).
  Se dejaron intactos los tres sitios de la Fase 5 y las skills de demo que dicen *«nunca el de
  EE. UU. en una demo»*, porque eso sigue siendo verdad.
- **Lo que NO cambia:** la fase **no se cierra con llamadas web**. Sigue haciendo falta una llamada
  de teléfono real por el número español de Twilio.
- **Pendiente para el humano:** dar de baja o dejar en pausa el número gratuito de EE. UU. si llegó a
  pedirse. Es Fase 0, manual, y no corre prisa: el número no cuesta nada mientras esté ahí.

### 2. El catálogo de respaldo de Gemini del §3 estaba muerto entero — **YA CORREGIDA**

- **Fecha:** 23 de septiembre de 2026. **Estado:** aprobada por el humano el 24-sep y **aplicada a
  `PLAN.md`** (§3 y §11), al `CLAUDE.md` de esta fase (restricción 2) y a la skill
  `verificar-modelo-gemini` (catálogo y procedimiento).
- **Qué dice el plan (§3, y copiado en el `CLAUDE.md` de esta fase, restricción 2):** modelo elegido
  `gemini-3.5-flash`, y respaldos en este orden: `gemini-2.5-flash` → `gemini-2.5-flash-lite`.
- **Qué pasa de verdad**, pidiéndole una palabra a cada uno con la `GEMINI_API_KEY` del proyecto:

  | Modelo | Respuesta real |
  | --- | --- |
  | `gemini-3.5-flash` | **Contesta `listo`.** El elegido está vivo |
  | `gemini-2.5-flash` | `404 NOT_FOUND — no longer available to new users` |
  | `gemini-2.5-flash-lite` | `404 NOT_FOUND — no longer available to new users` |
  | `gemini-2.5-pro` | `404 NOT_FOUND — no longer available to new users` |
  | `gemini-3.1-flash-lite` | **Contesta `listo`** |
  | `gemini-3-flash-preview` | Contesta, pero es `preview`: **prohibido** por el §3 y el §9 |

- **Lo grave no es que haya modelos jubilados: es que la lista de Vapi los sigue publicando.**
  `docs.vapi.ai/providers/model/gemini` sigue anunciando `gemini-2.5-pro`, `gemini-2.5-flash` y
  `gemini-2.5-flash-lite`. Es **exactamente la trampa del §3** (*«estar en la lista no es poder
  usarlo»*), solo que esta vez la lista mentirosa es la de Vapi, no la de Google. El plan avisaba de
  `ListModels`; conviene que avise también del catálogo del proveedor.
- **Lo que queda de verdad**, cruzando «lo que Vapi acepta» con «lo que Google todavía sirve» y
  quitando los `preview`: **solo dos modelos**, `gemini-3.5-flash` y `gemini-3.1-flash-lite`.
  `gemini-3.6-flash` y `gemini-3.5-flash-lite` sí funcionan contra Google —los recomienda el propio
  error de Google— pero **Vapi no los acepta**, así que no sirven aquí.
- **Corrección que propongo para el §3:** sustituir la cadena de respaldo
  `gemini-2.5-flash` → `gemini-2.5-flash-lite` por **`gemini-3.1-flash-lite`, único respaldo vivo**,
  y añadir que el catálogo de respaldo se re-verifica en cada fase, porque caduca solo. Lo mismo en
  la restricción 2 del `CLAUDE.md` de esta fase y en el catálogo de la skill
  `verificar-modelo-gemini`.

### 3. El plan suponía un respaldo automático de modelo que Vapi no tiene — **YA CORREGIDA**

- **Fecha:** 23 de septiembre de 2026. **Estado:** aprobada por el humano el 24-sep y **aplicada** al
  §3 y al §9 de `PLAN.md`, al `CLAUDE.md` de esta fase y a la skill `verificar-modelo-gemini`.
- **Qué da a entender el plan:** que hay una *«cadena de respaldo»* de modelos, como si el asistente
  bajara solo al siguiente cuando el primero falla.
- **Qué pasa de verdad:** Vapi **rechaza** `model.fallbackModels`, `model.fallbackPlan` y
  `modelFallbackPlan` con `400 — property should not exist`. `fallbackPlan` existe **solo** para
  `voice` y para `transcriber` (`docs.vapi.ai/voice-fallback-plan`,
  `docs.vapi.ai/customization/transcriber-fallback-plan`).
- **Qué significa:** la cadena de respaldo del §3 es un **procedimiento manual**, no una
  configuración. Si Gemini se cae a mitad de una demo, el bot se queda mudo hasta que una persona
  haga `PATCH`. Eso cambia el riesgo del §9: no es *«tenemos respaldo»*, es *«tenemos un plan B que
  alguien tiene que ejecutar a mano, y no durante una demo»*.
- **Corrección que propongo:** dejarlo escrito así de claro en el §3 y en el §9, y añadir al
  procedimiento previo a cada demo *«verificar el modelo el mismo día»* — que es justo lo que la
  skill `verificar-modelo-gemini` ya manda hacer, pero ahora se entiende por qué es obligatorio y no
  una buena costumbre.
- **Lo que sí se ha configurado**, porque Vapi lo admite y sale gratis: respaldo de **voz**
  `es-ES-AlvaroNeural` → `es-ES-DarioNeural` → `es-ES-ArnauNeural`, las tres peninsulares.

### 4. El camino Vapi → Gemini no se pudo verificar entero — **AVISO, NO ES CONTRADICCIÓN**

- **Fecha:** 23 de septiembre de 2026.
- El §3 pide verificar el modelo *«por el camino real»*, y la skill `verificar-modelo-gemini` lo
  concreta: pedirle una palabra **a través de Vapi**, no contra Google por tu cuenta, porque *«una
  API key válida con un modelo que Vapi no puede invocar deja el teléfono igual de mudo»*.
- **No se pudo.** El endpoint `POST /chat` de Vapi, que es la vía sin voz para hacerlo, devuelve
  `402 payment_method_missing — Add a payment method to use chat. Pay-as-you-go orgs require a card
  on file`. La cuenta de Vapi **no tiene tarjeta**.
- **Lo que sí se verificó:** que `gemini-3.5-flash` contesta contra Google con la clave del proyecto
  (o sea, ni jubilado ni sin cuota: la facturación de Google está activa), y que Vapi **acepta** esa
  configuración en el asistente sin rechazarla.
- **Lo que queda sin comprobar:** que Vapi consiga invocarlo en una llamada. **Eso lo cierra la
  primera llamada por `Talk`**, que es la verificación de verdad y la tiene que hacer el humano.
- **Importante, y es la buena noticia:** el `402` es **solo del producto «chat»**, no de las
  llamadas. Al probar si se puede abrir una llamada, Vapi responde con
  `subscriptionLimits: {concurrencyBlocked: false, concurrencyLimit: 10}` — o sea, **las llamadas no
  están bloqueadas y `Talk` va a funcionar sin meter tarjeta**.

### 5. El §9 no cubre que Azure sea el único proveedor con voz peninsular — **PROPUESTA, SIN APLICAR**

- **Fecha:** 24 de septiembre de 2026. Detectada al escribir [ADR-001](ADR-001-voz.md).
- **Qué pasa:** comprobados los once proveedores de voz de Vapi por API, **solo Azure tiene voces
  `es-ES`**. Cartesia, OpenAI, las propias de Vapi, Rime, Inworld, MiniMax, Neuphonic, LMNT y PlayHT
  dan **cero**.
- **Por qué importa:** el §3 declara el acento peninsular **irrenunciable**, y resulta que depende de
  un solo proveedor sin alternativa dentro de Vapi. Si Azure retira las `es-ES` o Vapi quita la
  integración, no hay plan B: habría que salir de Vapi o romper la regla del acento.
- **Corrección que propongo:** una fila en la tabla de riesgos del §9 —
  *«Azure es el único proveedor con voz peninsular en Vapi · si la retira, no hay alternativa con
  acento de España · respaldo de voz entre tres voces de Azure, y si cae Azure entero, ElevenLabs
  deja de ser argumento de venta y pasa a ser el plan B técnico»*.

### Un dato que hay que corregir de lo que este fichero dijo antes

En el apartado *«Cuatro arreglos de prompt»* se apuntó que Diego *«decía 1ª y 2º en lugar de primera y
segundo»*. **Eso era una lectura equivocada del registro.** Los turnos del asistente que guarda Vapi
**no son el texto que se manda al TTS: son la transcripción del audio del propio bot.** Se demuestra
con el `firstMessage`, que es texto fijo y no puede variar: guardado dice *«Clínica Dentalvis, le
atiende Diego, **el** asistente virtual de la clínica. Dígame, ¿**en** qué puedo ayudarle?»* y en el
registro aparece *«Clínica **Dental Bis**, le atiende Diego, asistente virtual de la clínica. Dígame,
qué puedo ayudarle?»* — sin el «el», sin el «en» y con el nombre partido. Son caídas típicas de
reconocimiento de voz.

**Consecuencia:** lo de «1ª» y «2º», y lo de «Dental Bis», es **cómo Deepgram escribe lo que oye**, no
cómo habla Diego. La regla de no abreviar ordinales se quedó en el prompt porque no hace daño, pero
**no arregló nada, porque no había nada roto**. Lo mismo puede valer para el agrupamiento de dígitos
del primer registro.

**La lección para las fases siguientes:** *no se diagnostica la voz del bot leyendo el transcript.*
Para juzgar lo que dice hay que **escucharlo**, o comparar contra la configuración guardada. Este
fichero ya cayó una vez en eso.

### El arreglo del teléfono inventado (24-sep)

**El fallo real y grave de la segunda llamada, que no era ninguno de los anteriores.** Diego dijo:

> *«Ahora necesito confirmar su número de teléfono. **Le llamo desde el número que termina en 77**,
> ¿es este el teléfono de contacto o prefiere darme otro?»*

No había ningún número. En una llamada web el campo `customer` de Vapi viene **vacío** (`""`,
comprobado por API en las tres llamadas), así que `{{customer.number}}` no resuelve a nada y el modelo
**se inventó los dígitos**. Pasaría igual en una llamada telefónica con número oculto.

**Por qué es el peor de todos los fallos vistos:** no se nota. Suena natural, y el paciente contesta
«sí» por no discutir. La clínica se queda con un teléfono que no existe y nadie se entera hasta que
hay que llamar.

**Arreglado:** el prompt ahora dice que ese hueco **puede venir vacío y viene vacío a menudo**, que si
está vacío simplemente se pide el teléfono, y que **nunca se dicen dígitos que no le hayan dado** —
ni enteros, ni los dos últimos, ni «el que termina en». Si el número sí llega, lo ofrece sin
recitarlo (*«¿le llamamos a este mismo número?»*).

> **Nota para quien mantenga `fases/ORQUESTACION.md`:** su lista de contradicciones tiene cuatro
> entradas; con éstas serían ocho. No las he añadido yo porque ese fichero es transversal a las
> cinco fases y no es de ésta. Decide el humano.
