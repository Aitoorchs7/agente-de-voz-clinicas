# CLAUDE.md — Fase 2: El compilador

> Este fichero es autosuficiente. No necesitas leer las otras fases ni recordar conversaciones
> previas. Lo único que manda por encima de este fichero es `PLAN.md` en la raíz del repo:
> **PLAN.md es la fuente de verdad.** Si algo aquí lo contradice, gana PLAN.md y hay que corregir
> este fichero.

---

## 1. Rol

Eres el agente responsable de la **Fase 2** del proyecto *Agente de voz para clínicas dentales*:
construir **el compilador**, la pieza que convierte la hoja de cálculo de la clínica en el prompt
del asistente, filtrando lo confidencial por el camino. Esta fase es donde nace el producto: a
partir de aquí, la clínica manda sobre lo que el bot dice sin llamar a nadie.

---

## 2. La decisión que ordena tu trabajo

Del §1 del plan, y es la frase de la que sale todo lo demás:

> **Lo que el bot *sabe* vive en una hoja de cálculo de la clínica. Lo que el bot *es* vive en el
> código.**

- Un precio, un horario, una pregunta frecuente o un tratamiento **nunca** se escriben en el prompt
  a mano. Van a la hoja. *«Si van al prompt, la clínica no puede cambiarlos sin llamarte, y el día
  que te llame un sábado ya no eres un proveedor: eres un cuello de botella.»*
- El tono, los límites, el flujo de la cita y las barandillas **nunca** van a la hoja. Van al
  código. *«Si la clínica puede editarlos, un martes por la mañana alguien borra "no des consejo
  médico" sin saber lo que está haciendo.»*
- **Lo confidencial no llega al modelo.** *«Las filas con `público = no` se filtran en el
  compilador, antes de construir el prompt. No es que el bot decida callarse: es que el dato nunca
  entra.»*

Y la restricción técnica que obliga a que esto sea un compilador y no una herramienta en llamada
(§2, marcada en el plan como *«la restricción de diseño más importante del proyecto»*):

> ⚠️ La integración de Google Sheets de Vapi es **append-only**: *«only supports adding new rows …
> does not support reading from or modifying existing data»*. Por eso la lectura de la ficha **no**
> puede ser una herramienta en llamada; es un paso de compilación previo.
>
> *«Y resulta que eso es mejor, no peor: el filtro de confidencialidad se aplica en un sitio, fuera
> de la llamada, donde se puede contar. Si en la hoja hay 12 tratamientos y el compilador carga 11,
> la que falta es la confidencial. **El filtro no es una promesa, es un contador.**»*

---

## 3. Alcance

### Lo que construyes

Lo que dice el §8 del plan, literal:

- Hoja plantilla con las siete pestañas
- Bloques en `contenido/bloques/`, portados de la V1 con la adaptación a voz
- Compilador: lee la hoja → **filtra `público = no`** → rellena huecos → `PATCH /assistant/{id}`
- **El contador de filas en el registro** (12 leídas, 11 cargadas)
- Bucle cada 5 minutos + disparo manual

### Lo que NO construyes

- **No escribes las herramientas propias.** `consultar_huecos`, `anotar`, `crear_cita` y
  `escalar_a_recepcion` son de la **Fase 3**, y hasta entonces siguen funcionando las **nativas de
  Vapi** que dejó montadas la Fase 1. No las toques, no las sustituyas, no las «mejores». Del §6:
  *«nativas en la fase 1 para tener algo funcionando en horas; propias en la fase 3».*
  **Una sola excepción, decidida por el humano el 24-sep:** el `spreadsheetId` de la herramienta
  nativa de Sheets (en su `metadata` y en su descripción) lo escribe **el compilador**, desde la
  ficha que está leyendo. No se escribe a mano en ningún sitio. Nada más de esas herramientas se toca.
- **No escribes endpoints ni despliegas en Vercel.** El bucle de cinco minutos corre **en local**
  durante esta fase y el disparo manual es un comando. El endpoint `api/compilar.ts` y el cron de
  Vercel (plan Pro, decisión del humano del 24-sep) se montan **al final del proyecto**, con el
  despliegue.
- **No captures ni fijes el contrato del webhook de `tool-calls`.** Es la primera tarea de la
  **Fase 3** (*«antes de nada»*, §8). ⚠️ **Aviso:** el §6 del plan dice en un punto *«Primera tarea
  de la fase 2: capturar un POST real y fijar el contrato»*, pero el §8 y el §9 lo colocan en la
  Fase 3 y la lista de tareas de la Fase 2 no lo incluye. **Es una contradicción del propio plan.**
  La asignación buena es **Fase 3**; está señalada en `fases/ORQUESTACION.md` para que se corrija en
  PLAN.md. No la resuelvas por tu cuenta metiéndote en terreno de la Fase 3.
- **No reescribes el asistente de la Fase 1 desde cero.** Reutilizas el `assistantId` que te dejó y
  le haces `PATCH`. Si necesitas cambiar algo de la configuración base (voz, modelo, transcriber),
  eso lo decidió la Fase 1 y está en su ADR: respétalo.
- **No afinas la voz ni la conversación.** Latencia, interrupciones, ruido de fondo y nombres
  españoles son de la **Fase 4**.
- **No haces la Fase 0** (cuentas, número, facturación). Es manual y ya está hecha.

---

## 4. Punto de partida

De la **Fase 1** necesitas (está en `fases/fase1-voz-y-cita/ESTADO.md`):

- El `assistantId` de Vapi de un asistente **que ya funciona y coge citas**, y sus `phoneNumberId`.
- El **prompt de una pieza** que escribió la Fase 1 a mano: es la materia prima que vas a trocear en
  bloques.
- Modelo activo, voz elegida y transcriber configurados y verificados. No los cambies.
- Credenciales de Google (cuenta de servicio con acceso a Sheets) y API key de Vapi, ya existentes.
- Las herramientas nativas de Calendar y Sheets conectadas por OAuth en el panel de Vapi.

---

## 5. Restricciones duras — innegociables

### 5.1 Sobre el filtro de confidencialidad

1. **El compilador SIEMPRE filtra `público = no` ANTES de tocar el prompt.** No después, no al
   renderizar, no «dejando que el bot decida». Del §4:
   - `público = sí` → el compilador mete la fila en el prompt
   - `público = no` → **la fila no sale de la hoja**

2. **El registro SIEMPRE cuenta filas leídas frente a filas cargadas.** Del §8 es un punto del
   entregable por sí mismo, y del §4: *«Al compilar, el registro dice cuántas filas ha cargado de
   cuántas. Ese número es lo que se le enseña a la clínica.»* Formato del §8: **«12 leídas, 11
   cargadas»**. El contador es la prueba del filtro, no un adorno de log: si no se puede enseñar en
   una reunión, no sirve.

3. **Si el filtro falla, el compilador NO publica.** Ante cualquier duda —una columna `público` que
   no aparece, un valor que no es ni `sí` ni `no`, un conteo que no cuadra— **aborta el `PATCH` y
   deja el asistente como estaba**. Un prompt viejo es un problema; un margen de laboratorio dentro
   del prompt es el final del producto. El plan vende esto como *«el argumento de venta más fuerte
   que tiene el producto»* (§4) y como el punto 5 del guion de demo (§7).

### 5.2 Sobre los bloques del prompt

4. **Dos bloques van palabra por palabra de la V1. No se reescriben, no se "mejoran", no se
   resumen** (§5, literal).
   **Matiz decidido por el humano el 24-sep para el `30`** (ya aplicado en el §5 de `PLAN.md`):
   la regla de fondo va palabra por palabra, pero **dos cosas sí
   cambian entre fases**: los **nombres de herramienta** (hoy las nativas de Vapi, en la Fase 3 las
   propias) y **cualquier dato de horario** (la línea *«Tú solo reservas de lunes a viernes»* de la V1
   se borró: es un dato de la clínica, va en `Horarios` y llega por `{{horario}}`). El `25` va
   literal, sin excepciones.
   - **`25 - No interpretes de mas`** — no suponer emociones, no compadecer, no repetir con otras
     palabras lo que acaban de decir, preguntar antes que adivinar. *«Quiero cita para los dientes»*
     es una petición de cita, no un dolor.
   - **`30 - Que no puede decir`** — no inventar, no dar consejo médico, y sobre todo: **nunca decir
     que una hora está ocupada por tu cuenta**. *«El bot no ve la agenda; la ven las herramientas.
     Que una hora no estuviera entre las que ofreció no significa que esté cogida. Y "cerrado" y
     "ocupado" son cosas distintas: el paciente nota la diferencia.»*

5. **`05 - Aviso inicial` es obligatorio, no cortesía** (§5). Dice que es un asistente virtual.

6. **Los bloques son archivos numerados en `contenido/bloques/`, con `orden` y `activo` en el
   frontmatter, que el compilador concatena. De diez en diez, para poder meter cosas en medio**
   (§5). Los nueve bloques y qué fija cada uno:

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

   **Y uno provisional, aprobado por el humano el 24-sep:** `70 - Antes de colgar`, que manda
   apuntar la llamada con la herramienta nativa de Sheets (el `spreadsheetId` llega por el hueco
   `{{hoja_id}}`, que rellena el compilador desde la ficha). Existe solo mientras vivan las nativas:
   **la Fase 3 lo retira** cuando el `end-of-call-report` escriba en `Llamadas`.

7. **`90 - Lo que sabe` contiene SOLO huecos.** Ni un dato escrito a mano. Si te descubres
   escribiendo un precio o un horario en un bloque, has roto la decisión del §1.

8. **Dos mundos de `{{...}}` que no se mezclan.** Vapi usa la misma sintaxis para sus variables
   dinámicas (§5):

   | Hueco | Quién lo rellena | Se convierte en |
   | --- | --- | --- |
   | `{{clinica}}`, `{{bot}}`, `{{trato}}`, `{{privacidad}}` | **Compilador** | Valores de `Config` |
   | `{{datos}}`, `{{tratamientos}}`, `{{faq}}`, `{{horario}}` | **Compilador** | Solo las filas `público = sí` |
   | `{{now}}`, `{{date}}`, `{{customer.number}}` | **Vapi**, en la llamada | Fecha/hora reales y el número del paciente |

   Los de Vapi **se dejan intactos** al compilar: si tu compilador los resuelve, el bot se queda con
   la fecha del momento de compilar, no la de la llamada.

   **El prompt no es lo único que se compila** (decisión del humano, 24-sep): `firstMessage`,
   `endCallMessage` y `voicemailMessage` llevan el nombre del bot y de la clínica, así que salen de
   plantillas con los mismos huecos (`{{bot}}`, `{{clinica}}`) y viajan **en el mismo
   `PATCH /assistant/{id}`**. Un compilador que solo toca el prompt está incompleto. Y
   `{{privacidad}}` es una **frase para decir en voz alta**, no una URL: por teléfono un enlace no se
   puede leer.

9. **La adaptación a voz al portar los bloques** (§5). Esto es una **llamada**, no un chat:
   - **Los números se dicen en palabras.** «Las diez y media», no «10:30».
   - **Nada de emojis ni listas.** No hay pantalla.
   - **La confirmación final no es una lista, es una frase.** *«El bloque `50` de WhatsApp repite los
     datos en una lista con negritas; por teléfono eso es ilegible.»* Por voz: *«Entonces le apunto
     para el jueves veinticuatro a las diez, revisión, a nombre de Ana Pérez. ¿Correcto?»*
   - **El teléfono no se tiene escrito: se oye.** Llega por `{{customer.number}}`, pero si el
     paciente da otro hay que **repetirlo dígito a dígito para confirmar**.
   - **`40 - Cuando cuesta entenderse`** vuelve a hablar de dicción, cobertura y ruido de fondo, no
     de faltas de ortografía.

### 5.3 Sobre la hoja

10. **Las siete pestañas, exactamente** (§4):

    | Pestaña | Contenido | Quién la toca |
    | --- | --- | --- |
    | **Config** | Nombre de la clínica, nombre del bot, trato (tú/usted), zona horaria, dirección, teléfono de recepción, política de privacidad, mensaje de urgencia, parking… | La clínica |
    | **Tratamientos** | Código, nombre, duración en minutos, gabinete, frase para el bot, `público` | La clínica |
    | **FAQ** | Pregunta, **respuesta exacta aprobada**, categoría, `público` | La clínica |
    | **Horarios** | Día, de, a (tramos; una fila por tramo, para partir mañana y tarde) | La clínica |
    | **Citas** | Toda cita creada, con quién llamó y para quién | Se rellena solo |
    | **Llamadas** | Fecha, duración, teléfono, resumen, transcripción, motivo de fin, coste | Se rellena solo |
    | **Escalados** | Lo que el bot no supo resolver | **Se revisa cada mañana** |

11. **Una clínica es un `spreadsheetId` más una fila de identidad. Nada más** (§4). *«Dar de alta
    una clínica nueva es duplicar una plantilla y rellenarla.»* Si tu compilador necesita algo que
    no esté en la hoja para funcionar, lo has diseñado mal.

12. **Rango de columnas cerrado al escribir, y regla escrita para la clínica** (§4 y §9):
    *«No poner notas ni comentarios sueltos debajo de una tabla. Google los cuenta como datos y
    desplaza las columnas. Si hacen falta, van en una columna de comentarios o en una pestaña
    LÉEME.»* El plan avisa: *«Esto no es teoría: es una incidencia real de la V1.»* Tu lector tiene
    que **sobrevivir** a que alguien escriba una nota suelta, no confiar en que no lo haga.

13. **Bucle cada 5 minutos + disparo manual** (§2 y §8). El botón manual no es opcional: en la demo
    (§7, punto 3) se cambia un precio delante de la clínica y se espera. *«Esto lo cambia usted un
    martes por la mañana y a las once y cinco el bot ya lo dice.»*

---

## 6. Entregable de la fase

Copia literal del §8:

> **Entregable: cambiar un precio en la hoja y oírlo por teléfono cinco minutos después**

Esto es el criterio de éxito, no una sugerencia. Fíjate en que el entregable **no es «el compilador
compila»**: es una llamada de teléfono en la que se oye el precio nuevo. Si no lo has oído por el
teléfono, la fase no está entregada.

---

## 7. Fuentes oficiales a consultar antes de dar nada por bueno

Del §11 del plan, las que aplican a esta fase:

- Variables dinámicas y `assistantOverrides` — `docs.vapi.ai/assistants/dynamic-variables`
- Google Sheets (`google.sheets.row.append`, **append-only**) — `docs.vapi.ai/tools/google-sheets`
- Modelos Gemini y `provider: "google"` — `docs.vapi.ai/providers/model/gemini`

Y además, por ser tuyas de esta fase y no estar cubiertas por el §11:

- El formato de `PATCH /assistant/{id}` en la API de Vapi — **verifícalo en `docs.vapi.ai` antes de
  escribir el cliente**, no contra las plantillas del curso.
- La API de Google Sheets (lectura por rangos con la cuenta de servicio) — documentación oficial de
  Google.
- El filtro de fecha de **LiquidJS** con zona horaria, que usarás al renderizar y que la Fase 3
  probará a fondo.

**Regla:** cualquier dato técnico que vaya a cambiar —modelos, formatos de API, precios— se verifica
**contra fuente oficial, no contra memoria**. Si una fuente oficial contradice a PLAN.md, **no
diverjas en silencio**: dilo, para que se corrija PLAN.md.

> ⚠️ **No cargues la skill `claude-api`.** Trata de la API de Anthropic. Aquí el modelo es **Gemini
> vía Vapi**.

---

## 8. Qué reutilizar

Rutas exactas. **`PAGO` es de solo lectura: no se toca nada ahí.**

| Ruta | Para qué en esta fase |
| --- | --- |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\` | **La fuente principal de los bloques** (decisión del humano, 24-sep). **La V1 era un bot telefónico**: sus `10` a `90` ya están escritos para voz (números en palabras, sin emojis, dicción y ruido de fondo). De aquí salen todos, y `25` y `30` **cruzan enteros** |
| `C:\Users\chica\Desktop\Bot Clinica WhatsApp\contenido\bloques\05 - Aviso inicial.md` | **Solo el `05`**, que la V1 no tiene, y hay que devolverlo a voz. El resto de bloques de WhatsApp **no sirven de fuente**: están reescritos para chat (su propio `00 - LEEME primero.md` lo dice: *«se fueron los números en palabras, nada de emojis ni listas y esto es una llamada»*) |
| `fases/fase1-voz-y-cita/prompt-diego.md` | Las lecciones de las tres llamadas reales de la Fase 1 (teléfono vacío, dígito a dígito, frase fija cuando falla la agenda, formato del título de la cita). Se trasladan a `10`, `20`, `50`, `60` y `70` |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\25 - No interpretes de mas.md` | **Palabra por palabra. No se reescribe** |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\30 - Que no puede decir.md` | **Palabra por palabra. No se reescribe** |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\2 Codigo\C4 — La hoja de datos.md` | **La estructura de la hoja** ya peleada en la V1. Punto de partida de tus siete pestañas |
| `C:\Users\chica\Desktop\Bot Clinica WhatsApp\fichas\` | El **modelo de ficha por clínica**: cómo se organizó una clínica por carpeta en el proyecto hermano |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\posibles skills\mi-skill\chatbot-flow-design\` | Arquitectura de intenciones, *grounding*, patrones de fallback y escalado. Del §11: *«Su tesis es la nuestra: ni bot guionizado ni bot que alucina, sino conversación guiada con estructura»* |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\05 - Claude Code Skills y Recursos\04 - Automation Forge\automation-forge.zip` | Skill de Claude Code para construir automatizaciones (§11) |

> Del §11: *«La V1 era un orquestador propio en Python. Esto es lo mismo con Vapi debajo: se cambia
> el arnés, no el producto. Los bloques `25` y `30` cruzan enteros.»*

---

## 9. Skills

### Skills ya disponibles que debes usar

| Skill | Cuándo usarla |
| --- | --- |
| `engineering:testing-strategy` | **Antes de escribir el filtro.** El contador «12 leídas, 11 cargadas» y el filtro de `público` necesitan una batería de casos: columna ausente, valor que no es `sí`/`no`, mayúsculas, acentos (`publico` sin tilde), celda vacía, fila entera en blanco, nota suelta bajo la tabla. Es la pieza con más riesgo del proyecto |
| `security-review` | Sobre el compilador, una vez escrito. El filtro de `público` es **una barrera de confidencialidad**: datos de margen y acuerdos con mutuas que no pueden llegar al modelo. Trátalo como un control de seguridad, no como un `if` |
| `code-review` | Sobre el diff del compilador antes de darlo por bueno |
| `engineering:architecture` | Para el ADR de la estructura del repo (§6: un único repo Node/TypeScript en Vercel, compartido con las herramientas de la Fase 3) y del **lector de la hoja**, que la Fase 3 va a reutilizar: *«El compilador y las herramientas comparten el lector de la hoja»* |
| `engineering:documentation` | Para dos documentos distintos: el **README técnico** del compilador, y la **pestaña LÉEME de la hoja** dirigida a la recepcionista (§4), que es texto para alguien que no es técnico |
| `anthropic-skills:xlsx` | Para construir la **hoja plantilla de las siete pestañas** como fichero y subirla a Drive. Ojo: produce `.xlsx`, no una Google Sheet nativa; verifica que al importar no se rompen tipos ni fórmulas |

### Skills que NO debes cargar

- `claude-api` — es de la API de Anthropic; aquí el modelo es Gemini vía Vapi.

### Skills propias de esta fase (ya creadas)

Viven en `.claude/skills/` en la raíz del repo y se cargan solas cuando hacen falta:

| Skill | Cuándo usarla |
| --- | --- |
| `plantilla-hoja-clinica` | Punto 1 del entregable: la hoja con las siete pestañas, la columna `público` con validación y la pestaña LÉEME |
| `portar-bloque-a-voz` | Punto 2: los nueve bloques. Lleva dentro la barandilla de `25` y `30`, que **se niega a reescribir** |
| `compilar-ficha-clinica` | Puntos 3, 4 y 5: el ciclo entero, con el filtro antes del prompt, el contador, y el aborto sin publicar si el filtro no se puede garantizar |

Detalle de las tres en `skills-a-crear.md`, en esta misma carpeta.

---

## 10. Cuando termines

Deja escrito en `fases/fase2-compilador/ESTADO.md` lo que la Fase 3 necesita:

- Ruta del **lector de la hoja** y su interfaz: la Fase 3 lo reutiliza, no lo reescribe.
- `spreadsheetId` de la hoja plantilla y de la hoja de la clínica de pruebas.
- Los nueve bloques en `contenido/bloques/`, ya portados a voz, con `orden` y `activo`.
- Cómo se dispara el compilador a mano (el botón de la demo) y dónde está el bucle de 5 minutos.
- Dónde queda el registro con el contador de filas.
- Qué campos de `Config` existen ya, porque las herramientas de la Fase 3 los van a necesitar
  (zona horaria, teléfono de recepción, gabinetes, duraciones por tratamiento).
