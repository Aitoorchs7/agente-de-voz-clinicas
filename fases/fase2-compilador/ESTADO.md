# ESTADO — Fase 2: El compilador

> **ESTADO: SOFTWARE TERMINADO Y VERIFICADO HASTA EL ASISTENTE PUBLICADO. FALTA UNA LLAMADA POR `Talk`.**
>
> Cambiar un precio en la hoja → el bucle lo publica solo → el asistente real lo lleva en su prompt:
> **hecho y medido** (4 min 54 s, ver abajo). Lo que falta para dar el entregable por probado es
> **oírlo**: una llamada web por `Talk` que tiene que hacer el humano (la API de chat de Vapi da `402`
> sin tarjeta, así que no hay forma de oírlo sin una persona). Guion de esa llamada más abajo.
>
> **La reprueba por teléfono** queda para cuando haya número español de Twilio. Decisión del humano
> (24-sep): *«cuando terminemos lo haremos de golpe, pasando por todas las fases de prueba, e iremos
> cerrando fases»*. No es un bloqueo de esta fase.
>
> **Si eres el agente de la Fase 3:** puedes empezar. Tu punto de partida está entero aquí.

Fecha: **24 de septiembre de 2026**
Quién: agente de la Fase 2

---

## Lo verificado, con fecha y hora

| Qué | Cómo se comprobó | Resultado |
| --- | --- | --- |
| Filtro, contador, huecos, bloques, publicación | `npm test`: 82 pruebas | **82 en verde** |
| Primera publicación real | `npm run compilar` + un GET independiente comparando campo a campo con la copia de antes | `v12 → v13`. `provider`, `model`, `temperature`, los tres `toolIds`, voz, transcriber y `analysisPlan` **idénticos**. Prompt publicado == prompt compilado. **Cero** textos confidenciales en el asistente |
| Aborto con valor raro | Se escribió «pendiente» en `FAQ!D3` de la hoja real | `NO PUBLICADO`, asistente sigue en `v13`. Restaurado |
| Aborto sin columna `público` | Se renombró la cabecera de `Tratamientos!F1` en la hoja real | `NO PUBLICADO`, asistente sigue en `v13`. Restaurado |
| **El entregable, hasta el asistente** | Bucle `npm run vigilar` corriendo; a las **19:57:53** la limpieza pasó de 55 € a 60 € en la hoja | A las **20:02:47** el bucle publicó solo (`v14`). GET: el prompt dice *«La limpieza bucal cuesta 60 €»* y el `model` sigue entero. **4 min 54 s** |
| **Oírlo por `Talk`** | — | **PENDIENTE: lo hace el humano** (guion abajo) |
| Oírlo por teléfono | — | Pendiente de Fase 0 (Twilio) |

> ⚠ **La hoja de Dentalvis se ha quedado con la limpieza a 60 €** a propósito, para la llamada de
> `Talk`. Después, volver a 55 € es exactamente la demo del §7 punto 3: se cambia en la hoja y en
> cinco minutos lo dice el bot.

### La llamada de `Talk` que falta (guion, dos minutos)

Panel de Vapi → Assistants → `Diego - Clínica Dentalvis` → **Talk**. Preguntar, por este orden:

1. *«¿Cuánto cuesta una limpieza?»* → tiene que decir **sesenta euros**. Esto cierra el entregable.
2. *«¿Hacéis sedación?»* → no lo sabe (es la fila confidencial de `Tratamientos`): lo confirma recepción.
3. *«¿Cuánto os cuesta una corona en el laboratorio?»* → no lo sabe (fila confidencial de `FAQ`).
4. *«¿Tenéis parking para bicicletas?»* → no está en la hoja: *«eso se lo confirma recepción»*.
5. Escuchar el saludo: ahora lleva la frase de privacidad (ver *«Lo que no quedó cerrado»*, punto 4).

Si el 1 dice sesenta, el entregable está probado por `Talk`; apúntalo aquí con el `callId`.

---

## El lector de la hoja — la Fase 3 lo REUTILIZA, no lo reescribe

- **Ruta:** `src/hoja/lector.ts`. La forma de la hoja (pestañas, columnas, claves de `Config`) está en
  **`src/hoja/esquema.ts`**, que es la única definición: si necesitas una columna nueva, se añade ahí y
  en la hoja, no en un segundo sitio.
- **Cómo se invoca:**

  ```ts
  import { leerFicha } from "./src/hoja/lector.js";
  import { filtrar } from "./src/compilador/filtro.js";

  const ficha = await leerFicha(spreadsheetId);
  // ficha.config:       { fila, clave, valor, publico, comentario }[]
  // ficha.tratamientos: { fila, codigo, nombre, duracionMin (number|null), duracionTexto, gabinete, frase, publico }[]
  // ficha.faq:          { fila, pregunta, respuesta, categoria, publico }[]
  // ficha.horarios:     { fila, dia ("lunes"…"domingo"), de "09:00", a "14:00", deMin, aMin }[]
  // ficha.avisos:       string[]   (notas sueltas ignoradas, etc.)

  const { cargadas } = filtrar("Tratamientos", ficha.tratamientos);  // ← SOLO las público = sí
  ```

- **Lo que garantiza:** columnas encontradas por cabecera (da igual su letra o si llevan tilde); rango
  cerrado `A1:Z1000`; filas en blanco saltadas; columnas desconocidas **nunca salen del lector** (una
  columna «margen» que añada la clínica no llega a nadie); lanza `ErrorDeHoja` si falta una pestaña, una
  columna obligatoria, o si hay dos columnas con el mismo nombre.
- **Lo que NO hace, a propósito:** no filtra por `público`. Devuelve el valor crudo. **Las herramientas
  de la Fase 3 tienen que pasar por `filtrar()` antes de ofrecer un tratamiento**, igual que el
  compilador: si no, `consultar_huecos` podría dar cita para un tratamiento con `público = no`.
- **Lo que no existe todavía:** escritura. Las herramientas de la Fase 3 escriben en `Citas`, `Llamadas`
  y `Escalados`; el patrón a seguir es el del §4 (calcular la fila libre exacta y escribir en rango de
  columnas cerrado, **nunca** `append`). Las cabeceras de esas tres pestañas están en `esquema.ts` y se
  pueden cambiar: nadie las lee todavía.
- **Autenticación:** `src/google/cuenta-servicio.ts` → `tokenDeAcceso([ALCANCE_HOJAS])`. JWT firmado con
  `node:crypto` y `fetch` de Node, sin librerías de Google. **Node sí tiene certificados** en esta
  máquina (el problema de `CERTIFICATE_VERIFY_FAILED` es solo de Python).

## Las hojas

| Hoja | `spreadsheetId` | Qué es |
| --- | --- | --- |
| **Clínica de pruebas** (Dentalvis, inventada) | `1IXdKW0j56YfNb8iKQknKiWZQYLpAsYNrpoeJnaMmhLk` | La de la Fase 1, con las seis pestañas que faltaban añadidas y los datos de Diego pasados a filas. Ficha: `fichas/dentalvis/ficha.json` |
| **Plantilla** | `1wzF3OU3Klr3s-4q8MEmtrzkpeXhhduKawn3eY_a9vws` | En el Drive del humano, compartida con la cuenta de servicio como Editor. Filas de ejemplo marcadas «EJEMPLO», una confidencial por pestaña |

- Las dos tienen: pestaña **LÉEME** para recepción, **validación** de `público` (desplegable sí/no),
  cabeceras protegidas **con aviso** (no impide, avisa), y `Citas`/`Llamadas`/`Escalados` protegidas con
  aviso («se rellena sola»).
- ⚠ **`Llamadas` de Dentalvis NO tiene las columnas del §4.** Tiene las ocho de la Fase 1 (fecha y hora ·
  teléfono · nombre · motivo · resultado · fecha cita · hora cita · nota), porque la escribe la
  herramienta nativa de Sheets y cambiarla la rompería. Decisión del humano: **no se toca hasta la
  Fase 3**. La plantilla sí lleva las del §4 (fecha · duracion · telefono · resumen · transcripcion ·
  motivo_fin · coste). Al cambiar a `end-of-call-report`, la Fase 3 tiene que decidir qué hacer con la
  fila de la Fase 1 que hay en `Llamadas` de Dentalvis.
- Para preparar la hoja de una clínica nueva: el humano crea una hoja vacía en su Drive, la comparte con
  la cuenta de servicio como Editor, y `npm run preparar-hoja -- <spreadsheetId> --semilla=plantilla`.
  La cuenta de servicio **no puede crear hojas suyas**: su cuota de Drive es **0** (comprobado).

## Los bloques — `contenido/bloques/`

Fuente: **la V1**, que era un bot telefónico (decisión del humano, 24-sep). De WhatsApp solo el `05`.
Las lecciones de las tres llamadas de la Fase 1 (`prompt-diego.md`) se pasaron a `10`, `20`, `50`, `60` y `70`.

| Bloque | Origen | Qué se tocó |
| --- | --- | --- |
| `05 - Aviso inicial` | WhatsApp, devuelto a voz | El enlace de privacidad pasa a frase hablada (`{{privacidad}}`). El aviso de asistente virtual ya lo da el saludo fijo |
| `10 - Quien es` | V1 + Fase 1 | La fecha y la hora van por `{{ahora}}` / `{{dia_semana}}`, que el compilador convierte en el filtro de fecha de Vapi con la zona de `Config` |
| `20 - Como habla` | V1 + Fase 1 | Ordinales enteros; avisar **una vez** antes de mirar la agenda (la V1 decía no avisar; en Vapi el silencio parece un corte); despedida |
| `25 - No interpretes de mas` | V1 | **Nada. Byte a byte** (lo comprueba una prueba) |
| `30 - Que no puede decir` | V1 | **Solo las dos excepciones decididas por el humano**: nombres de herramienta y el dato de horario. Diff abajo |
| `40 - Cuando cuesta entenderse` | V1 | Sin `no_te_entiendo` (no existe); el teléfono **dígito a dígito**, no agrupado como decía la V1; aviso de que lo que llega es una transcripción |
| `50 - Como coge una cita` | V1 + Fase 1 | Herramientas nativas; confirmación en una frase; teléfono vacío (`{{customer.number}}` viene vacío en `Talk` y con número oculto); frase fija si falla la agenda; título `Nombre - motivo - teléfono` |
| `60 - Cuando pasa a una persona` | V1 + Fase 1 | Sin `escalar_a_recepcion`. **No puede pasar la llamada** (no hay `transferCall` configurado): deja el aviso y lo apunta como `sin resolver` |
| `70 - Antes de colgar` | Fase 1 | **PROVISIONAL.** Apuntar la llamada con la herramienta nativa de Sheets; el `spreadsheetId` llega por `{{hoja_id}}`. **Lo retira la Fase 3** |
| `90 - Lo que sabe` | V1 | Solo huecos. Una prueba falla si aparece una cifra o un «€» |

**El diff del `30` respecto a la V1**, completo:

- `…y llamas a escalar_a_recepcion.` → `…y al colgar lo apuntas con google_sheets_tool como «sin resolver».`
- `…los horarios salen solo de consultar_huecos.` → `…solo de google_calendar_check.`
- `…llama a crear_cita con esa hora y espera la respuesta.` → `…llama a google_calendar_check con esa hora…`
  **Ojo, esto es a propósito y no una traducción mecánica:** en la V1 `crear_cita` comprobaba
  disponibilidad antes de crear. La nativa `google.calendar.event.create` **no comprueba nada**: crea el
  evento encima de otro. Traducirlo a `google_calendar_agendamiento` habría sido pedirle al bot que
  cree citas pisadas. La regla de fondo («pregunta a la herramienta, no descartes tú») se mantiene.
- `Tú solo reservas de lunes a viernes, en este horario: {{horario}}.` → `Tú reservas en este horario:` + `{{horario}}`
- Borrado: `…si la clínica abre sábados pero tú no puedes reservarlos, di que el sábado lo lleva recepción directamente.`

**Para la Fase 3:** cuando cambies a las herramientas propias, el `30`, el `50`, el `60` y el `70`
cambian otra vez de nombres de herramienta (está previsto en `ORQUESTACION.md`). En el `30`, **solo**
eso. La skill `portar-bloque-a-voz` ya lo dice.

## Los mensajes fijos — `contenido/mensajes/`

`firstMessage`, `endCallMessage` y `voicemailMessage` salen de plantillas con `{{bot}}` y `{{clinica}}`,
una variante por trato (`usted` / `tú`), y viajan **en el mismo `PATCH`** que el prompt (decisión del
humano, 24-sep). Cambiar `nombre_bot` en la hoja cambia también el saludo.

## El compilador

- **A mano (el botón de la demo):** `npm run compilar`. Con `-- --simular` enseña el contador y qué
  cambiaría, sin publicar, y deja el texto entero en `registro/simulacion-dentalvis.md`. Con otra
  clínica: `npm run compilar -- <carpeta-de-fichas>`.
- **El bucle de 5 minutos:** `npm run vigilar` (`scripts/vigilar.ts`). **Corre en local**: en una demo
  hay que dejar esa ventana abierta. Solo publica si algo ha cambiado. En Vercel irá al final del
  proyecto (ver *«Para la Fase 3»* y la propuesta 2).
- **El registro con el contador:** `registro/compilaciones.log`, una entrada por vuelta:

  ```
  2026-09-24 20:02:47 · dentalvis · PUBLICADO (prompt)
      Config: 9 leídas, 9 cargadas
      Tratamientos: 10 leídas, 9 cargadas · 1 confidencial
      FAQ: 11 leídas, 9 cargadas · 2 confidenciales
      Horarios: 11 tramos
  ```

  Lo último publicado, entero, en `registro/ultimo-prompt-dentalvis.md`. La copia del asistente tal
  como estaba **antes** de esta fase, en `registro/asistente-antes-fase2.json` (para volver atrás a mano).
- **Cómo publica:** GET del asistente → copia del `model` **entero** → cambia solo el texto del mensaje de
  sistema → `PATCH` con el `model` completo y los tres mensajes → **GET y comparación campo a campo**
  (nada de lo que había puede faltar ni cambiar) → si algo no cuadra, **vuelve a dejarlo como estaba** y
  lo dice. No publica encima de un asistente que ya esté roto (sin `toolIds`, sin modelo). Cada `PATCH`
  crea una versión nueva en Vapi (`latestVersion`): por eso solo publica si hay cambios.
- **La herramienta nativa de Sheets:** el compilador escribe el `spreadsheetId` de la ficha en su
  `metadata` y en su descripción (`contenido/herramientas/google_sheets_tool.md`), solo si es distinto
  (para Dentalvis no lo es). **Se niega** si esa herramienta la usa otro asistente: serían dos clínicas
  escribiendo en la misma hoja.
- **Comportamiento de aborto, verificado.** No publica nada, y lo deja escrito con el motivo, si:
  - en `público` hay algo que no es `sí`/`no` (**probado contra la hoja real**);
  - falta la columna `público` o cualquier columna obligatoria (**probado contra la hoja real**);
  - hay dos columnas con el mismo nombre; falta una pestaña;
  - una fila pública está incompleta (tratamiento sin duración numérica, FAQ sin respuesta, `Config`
    sin clave); falta una clave obligatoria de `Config` o no es pública; hay una clave repetida;
  - `trato` no es usted/tú; la zona horaria no existe; `privacidad` es un enlace;
  - un texto de la hoja lleva `{{ }}` o `{% %}` (Vapi pasa el prompt por LiquidJS en cada llamada);
  - queda un hueco que no es ni del compilador ni de Vapi;
  - **el texto de una fila excluida aparece en lo que se iba a publicar** (segunda red, después de renderizar);
  - horarios mal escritos o que se pisan;
  - falta un bloque obligatorio (`05`, `25`, `30`, `90`) o dos bloques comparten orden.

  **Y lo que NO aborta, a propósito:** una fila con la celda de `público` **vacía** no se carga, se cuenta
  como «sin marcar» y se avisa. Es lo que produce una nota suelta bajo la tabla, y el lector tiene que
  sobrevivir a eso sin parar la clínica. No hay fuga posible: la fila no entra.

## Campos de `Config` disponibles

`Config` tiene cuatro columnas: `clave · valor · público · comentario` (el comentario no llega nunca
al bot). `público` es nuevo (decisión del humano, 24-sep); por defecto todo `sí`. Ahora mismo no hay
nada confidencial en `Config`.

| Clave | Obligatoria | Valor en Dentalvis | Para qué |
| --- | --- | --- | --- |
| `nombre_clinica` | sí | Clínica Dentalvis | `{{clinica}}` |
| `nombre_bot` | sí | Diego | `{{bot}}` |
| `trato` | sí | usted | `{{trato}}` y la variante de los mensajes fijos |
| `zona_horaria` | sí | Europe/Madrid | `{{ahora}}`, `{{dia_semana}}`. **La Fase 3 la necesita** |
| `telefono_recepcion` | sí | 910 000 000 (**ficticio**) | Va en `{{datos}}`. **La Fase 3 la necesita** |
| `privacidad` | sí | Una frase hablada | `{{privacidad}}`, en el saludo y en el `05` |
| `direccion`, `parking`, `accesibilidad`, `mensaje_urgencia` | no | — | Van en `{{datos}}` |

Cualquier otra clave pública que añada la clínica entra también en `{{datos}}`. **Gabinetes y
duraciones** no están en `Config`: están por tratamiento, en `Tratamientos` (`gabinete`, `duracion_min`).

## Credenciales

> Dónde viven, nunca su valor.

- `.env` (raíz): `VAPI_PRIVATE_KEY`, `VAPI_ASSISTANT_ID`, `GOOGLE_SHEETS_SPREADSHEET_ID`, etc., como las dejó la Fase 1.
- **Nueva:** `GOOGLE_SERVICE_ACCOUNT_FILE=credenciales/cuenta-servicio.json`. Es la **ruta**, no el valor.
  El fichero es una copia de la cuenta de servicio que había repartida en trece líneas en
  `GOOGLE_SERVICE_ACCOUNT_JSON` (que sigue ahí, sin tocar). `credenciales/` está en `.gitignore`.
- **En Vercel** no hay ficheros: allí habrá que poner `GOOGLE_SERVICE_ACCOUNT_JSON` con el JSON **en una
  sola línea**. `cargarCuentaDeServicio()` ya acepta las dos formas.

## Para la Fase 3

1. **El calendario sigue sin compartir con la cuenta de servicio** (lo dijo la Fase 1 y sigue igual). Te
   bloquea: pídeselo al humano antes de empezar.
2. **Lo que cambia en los bloques:** nombres de herramienta en `30`, `50`, `60`; retirar el `70`; el `60`
   podrá pasar la llamada si se configura `transferCall`.
3. **Las herramientas de calendario nativas llevan `timeZone: Europe/Madrid` escrito a mano** en su
   `metadata`, no desde `Config`. Para Dentalvis da igual; para una clínica en Canarias no.
4. **`api/compilar.ts` y el cron** (decisión del humano: **Vercel Pro, al final del proyecto**). El ciclo
   ya existe (`cicloDeCompilacion` en `src/compilador/ciclo.ts`); el endpoint solo tiene que llamarlo.
   Dos cosas que cambiar al llevarlo a Vercel: el ciclo escribe el registro y un candado en
   `registro/` (disco local; en Vercel solo se puede escribir en `/tmp`, y no persiste), y la credencial
   de Google va en una línea (ver arriba).
5. **Google se salta la validación de la hoja si se escribe por API:** una prueba escribió «pendiente»
   por API en una celda con desplegable estricto y Google la aceptó. Ojo al escribir tú en `Citas`. El desplegable solo
   protege a quien edita a mano. La barrera de verdad es el filtro.

## Lo que no quedó cerrado

1. **La llamada de `Talk`** que oye «sesenta euros». Guion arriba. Es del humano.
2. **La reprueba por teléfono**, cuando haya número (Fase 0). Decisión del humano: al final, de golpe.
3. **El resumen de llamada sigue en inglés** (heredado de la Fase 1). No es de esta fase y no se tocó
   `analysisPlan`.
4. **El saludo es más largo.** Lleva ahora la frase de privacidad, porque el §9 pide el aviso en el
   primer mensaje y en voz el primer mensaje es el `firstMessage`. Son unos cuatro segundos más. Si
   molesta, se acorta la frase en `Config` → `privacidad` (lo decide la clínica), o se quita
   `{{privacidad}}` de `contenido/mensajes/primer-mensaje.md` (entonces solo lo dice si se lo preguntan).
   Para la Fase 4.
5. **El `30` dice «dos o tres opciones»** y el `20`/`50` dicen «como mucho dos». El del `30` es de la V1,
   palabra por palabra, y no se toca. En la práctica manda el flujo del `50`. Para la Fase 4, si se nota.
6. **La despedida puede salir dos veces**: la del `20` y el `endCallMessage` si cuelga el bot. Igual que
   en la Fase 1. Para la Fase 4.
7. **`/code-review` y `/security-review` no se han pasado**: trabajan sobre un diff y el repo no está en
   git. Lo que hay en su lugar: la batería de 82 pruebas (el filtro tratado como control de seguridad:
   valores raros, columnas ausentes o duplicadas, notas sueltas, columnas desconocidas, inyección de
   plantillas, segunda red de fugas, `PATCH` que pierde campos) y las dos pruebas de aborto contra la
   hoja real. Si el humano inicia git, conviene pasarlas.
8. **`npm install` avisó** de que `esbuild` tiene un script de instalación sin aprobar (npm 11). Todo
   funciona igual (`tsx` y `vitest` corren); si algún día fallan con un error de `esbuild`, es
   `npm approve-scripts esbuild`.

---

## Contradicciones con PLAN.md detectadas en esta fase

> `PLAN.md` es la fuente de verdad. Corregir el plan lo decide el humano.

### Ya aplicadas por orden del humano (24-sep)

- **§6:** *«Primera tarea de la fase 2»* → *«Primera tarea de la fase 3»* (capturar el POST del webhook).
- **§10:** *«≈ 0,12 € por llamada»* → *«≈ 0,12 € por minuto, es decir ≈ 0,37 € por llamada de tres minutos»*.
- Las dos marcadas como **YA CORREGIDA** en `fases/ORQUESTACION.md` (contradicciones 1 y 3).

### 1. El `30` no puede cruzar «palabra por palabra» entero — **PROPUESTA, PENDIENTE DE APROBAR**

- **Qué dice el §5:** *«Van palabra por palabra de la V1. No se reescriben, no se "mejoran", no se
  resumen»*, de `25` y `30`.
- **Qué pasa:** el `30` de la V1 (a) nombra `consultar_huecos`, `crear_cita` y `escalar_a_recepcion`, que
  no existen hasta la Fase 3, y (b) lleva escrito *«Tú solo reservas de lunes a viernes»* y una frase
  sobre los sábados: **un dato de la clínica dentro del código**, contra el §1, y falso para Dentalvis.
- **Ya aplicado en el bloque**, por decisión del humano (diff completo arriba).
- **Corrección propuesta para el §5**, en *«Los dos bloques que son el producto»*, añadir tras la lista:
  > *«El `30` se porta literal **en su regla de fondo**. Las dos únicas excepciones, que sí cambian
  > entre fases: **los nombres de herramienta** (las nativas de Vapi mientras existan, las propias desde
  > la Fase 3) y **cualquier dato de horario**, que nunca se escribe en el bloque: llega por
  > `{{horario}}`. El `25` va literal sin excepciones.»*

### 2. Un bucle de cinco minutos en Vercel no es «sin suscripción» — **PROPUESTA, PENDIENTE DE APROBAR**

- **Qué dicen el §2 y el §8:** compilador *«cada 5 minutos»*. **Qué dice el §6:** Node + Vercel, *«sin
  suscripción»*.
- **Qué dice la fuente oficial** (`vercel.com/docs/cron-jobs/usage-and-pricing`, actualizada el
  15-jul-2026): en el plan Hobby el cron va *«once per day»*, con precisión de ±59 minutos, y una
  expresión más frecuente *«will fail during deployment»*. Cada minuto solo en Pro.
- **Decisión del humano (24-sep):** **Vercel Pro, al final del proyecto.** Hasta entonces el bucle corre
  en local (`npm run vigilar`).
- **Corrección propuesta:**
  - **§6**, fila *Node + Vercel*, columna *A favor*: cambiar *«Sin suscripción»* por *«Las herramientas
    caben en el plan gratuito. **El bucle de cinco minutos del compilador no**: el cron de Vercel Hobby
    es una vez al día; hace falta el plan Pro»*.
  - **§8, Fase 2**, *«Bucle cada 5 minutos + disparo manual»*: añadir *«(en local durante el desarrollo;
    en Vercel Pro al desplegar)»*.
  - **§10, Costes**: añadir la línea del plan Pro de Vercel, con el precio verificado en
    `vercel.com/pricing` el día que se cotice (no lo he puesto yo: el §10 manda verificar precios en la
    fuente antes de escribirlos).
- *Alternativa que existe si algún día se prefiere no pagar Pro:* un cron externo gratuito (tipo
  cron-job.org) que llame a `api/compilar` cada cinco minutos. No es lo decidido.

### 3. Detalles del §4 y el §5 que se han quedado atrás por decisiones ya tomadas — **PROPUESTA, PENDIENTE**

Son decisiones del humano ya aplicadas en el código; esto es solo para que el plan no las contradiga:

- **§4, tabla de pestañas, `Config`:** añadir que lleva columna `público` (por defecto `sí`), como
  `Tratamientos` y `FAQ`.
- **§5, tabla de huecos:** añadir `{{hoja_id}}` (compilador, el `spreadsheetId` de la ficha) y
  `{{ahora}}` / `{{dia_semana}}` (el compilador los convierte en el filtro de fecha de Vapi con la zona
  de `Config`, que es lo que el §5 pide con `Europe/Madrid` escrito a mano). Y decir que `{{privacidad}}`
  es **una frase para decir en voz alta, no un enlace**.
- **§5, lista de bloques:** añadir `70 - Antes de colgar`, **provisional** mientras vivan las
  herramientas nativas (lo retira la Fase 3).
- **§2 / §8 Fase 2:** *«rellena huecos → `PATCH /assistant/{id}`»* → que diga que el `PATCH` lleva
  también `firstMessage`, `endCallMessage` y `voicemailMessage`, compilados con los mismos huecos.
