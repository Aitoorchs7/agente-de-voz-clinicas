# CLAUDE.md — Fase 3: Las herramientas propias

> Este fichero es autosuficiente. No necesitas leer las otras fases ni recordar conversaciones
> previas. Lo único que manda por encima de este fichero es `PLAN.md` en la raíz del repo:
> **PLAN.md es la fuente de verdad.** Si algo aquí lo contradice, gana PLAN.md y hay que corregir
> este fichero.

---

## 1. Rol

Eres el agente responsable de la **Fase 3** del proyecto *Agente de voz para clínicas dentales*:
sustituir las herramientas nativas de Vapi por **herramientas propias** en un servicio de Node/
TypeScript en Vercel, que sepan de duraciones por tratamiento, de gabinetes, del horario de la
clínica, y que no dejen que dos llamadas simultáneas cojan la misma hora.

---

## 2. Alcance

### Lo que construyes

Lo que dice el §8 del plan, literal:

- **Capturar un POST real de `tool-calls` y fijar el contrato** *(antes de nada)*
- Servicio en Vercel con `consultar_huecos`, `anotar`, `crear_cita`, `escalar_a_recepcion`
- Duración por tratamiento, gabinete, horario de la clínica
- **Bloqueo temporal** contra reservas simultáneas
- `end-of-call-report` → pestaña `Llamadas`
- **Prueba de la marca de tiempo a las 00:30**

Las herramientas, con lo que hace cada una y lo que devuelve (§6):

| Herramienta | Tipo | Qué hace | Devuelve |
| --- | --- | --- | --- |
| `consultar_huecos` | Custom (webhook) | Huecos reales según **duración del tratamiento** y **gabinete**. No es un free/busy pelado | 2–3 opciones, en lenguaje natural |
| `anotar` | Custom (webhook) | Valida **un dato cada vez** (nombre, teléfono, tratamiento, día) | OK, o el problema concreto |
| `crear_cita` | Custom (webhook) | Evento en Calendar **+** fila en `Citas`, de forma atómica | Confirmación o el motivo del fallo |
| `escalar_a_recepcion` | Custom (webhook) | Fila en `Escalados` + aviso | Confirmación |
| `transferir_llamada` | Nativa Vapi | Pasa al teléfono de recepción | — |
| `finalizar_llamada` | Nativa Vapi | Cuelga | — |
| *(al colgar)* | `end-of-call-report` | Fila en `Llamadas` con resumen, transcripción, duración y coste | — |

`transferir_llamada` y `finalizar_llamada` **siguen siendo nativas de Vapi**: no las reimplementes.

### Lo que NO construyes

- **No reescribes el compilador de la Fase 2.** Ni el lector de la hoja: lo **reutilizas**. Del §6:
  *«El compilador y las herramientas comparten el lector de la hoja»*. Si necesitas un campo nuevo
  de `Config`, lo añades a la hoja y al lector existente; no montas un segundo camino de lectura.
- **No tocas los bloques del prompt.** Son de la Fase 2. Si una herramienta necesita que el bot la
  llame de otra forma, el cambio del bloque `50` se pide, se razona, y se hace en
  `contenido/bloques/` respetando las reglas de la Fase 2 — en particular que **`25` y `30` no se
  tocan**.
- **No añades datos al prompt.** Del §6: *«Todo lo demás lo responde desde el prompt, que ya lleva
  la hoja compilada dentro: para el tamaño de datos de una clínica, meterlos en el prompt es más
  rápido, más barato y más predecible que montar un RAG.»* **No montes un RAG.**
- **No afinas la voz ni la conversación.** Ruido de fondo, nombres españoles, interrupciones,
  latencia percibida y llamadas largas son de la **Fase 4**. Tú pruebas **concurrencia y
  corrección**, no experiencia.
- **No haces el paquete de venta** (guion, propuesta, costes). Es la Fase 5. Sí dejas listo el
  `end-of-call-report` escribiendo el **coste real de cada llamada** en la pestaña `Llamadas`,
  porque de ahí saldrán los números de la Fase 5.
- **No haces la Fase 0** (cuentas, número, facturación). Es manual y ya está hecha.

---

## 3. Punto de partida

De la **Fase 2** necesitas (está en `fases/fase2-compilador/ESTADO.md`):

- **El lector de la hoja** ya escrito y su interfaz: es tu dependencia principal, lo compartes.
- El compilador funcionando, con el filtro de `público` y el contador de filas.
- Los nueve bloques en `contenido/bloques/`, ya portados a voz.
- El `spreadsheetId` de la hoja de la clínica de pruebas, con las siete pestañas creadas — incluidas
  `Citas`, `Escalados` y `Llamadas`, que son las que tú vas a rellenar.
- Los campos de `Config` disponibles: zona horaria, teléfono de recepción, gabinetes, y las
  duraciones por tratamiento en la pestaña `Tratamientos`.

De la **Fase 1**: el `assistantId` de Vapi y las credenciales de Google (cuenta de servicio con
acceso a Calendar y Sheets).

Y necesitas el repo Node/TypeScript ya iniciado (§6): *«un servicio propio en Node/TypeScript
desplegado en Vercel, en el mismo repositorio que el compilador y los bloques»*.

---

## 4. Restricciones duras — innegociables

### 4.1 El contrato del webhook — antes de nada

1. **Capturar un POST real de `tool-calls` y fijar el contrato ANTES de escribir el manejador.** Es
   el primer punto del entregable, marcado *(antes de nada)*, y una fila entera de la tabla de
   riesgos del §9: *«`toolCalls` vs `toolCallList`: las plantillas del curso pueden no encajar →
   Capturar un POST real antes de escribir el manejador.»*

2. **No escribas el manejador contra las plantillas del curso.** Del §6, el aviso completo:

   > ⚠️ **Ojo con las plantillas del curso.** Usan `message.toolCalls[0].id` y
   > `.function.arguments`. La documentación actual de Vapi usa **`toolCallList`**, con `id`, `name`
   > y `arguments` directamente. Los flujos de n8n de `PAGO` siguen siendo válidos como
   > **arquitectura**, pero las rutas de los campos hay que verificarlas contra un webhook real
   > antes de dar nada por bueno.

   Los JSON de `PAGO` se leen **como arquitectura**: webhook → `tool-calls` → disponibilidad →
   bloqueo temporal → alternativas → confirmar → borrar bloqueo → registrar. **Las rutas de los
   campos, no.**

3. **La respuesta es exactamente esta forma** (§6). Vapi manda al `serverUrl` un POST con
   `message.type = "tool-calls"` y espera **exactamente** esto de vuelta:

   ```json
   { "results": [ { "toolCallId": "...", "result": "..." } ] }
   ```

   **Verifícalo también contra el POST capturado y contra `docs.vapi.ai/tools/custom-tools`**, no
   solo contra esta cita.

4. **El POST capturado se guarda como fixture en el repo** y los tests corren contra él. Un contrato
   «fijado» que vive en la cabeza de alguien no está fijado. Si Vapi cambia el formato, quieres que
   te lo diga un test, no una demo.

> **Nota sobre una contradicción del plan.** El §6 dice *«Primera tarea de la fase 2: capturar un
> POST real y fijar el contrato»*, pero el §8 lo pone en la **Fase 3** con *(antes de nada)*, el §9
> lo asocia a escribir el manejador (que es tuyo), y la lista de tareas de la Fase 2 no lo incluye.
> **La tarea es tuya.** Está señalado en `fases/ORQUESTACION.md` para que se corrija en PLAN.md; no
> lo des por resuelto por la Fase 2 sin comprobarlo.

### 4.2 El bloqueo temporal

5. **Sin bloqueo temporal, dos llamadas simultáneas cogen la misma hora.** Del §6: *«No puede hacer
   bloqueo temporal, y sin bloqueo temporal dos llamadas simultáneas cogen la misma hora. Las
   plantillas de reservas del curso resuelven esto exactamente así —crear un registro temporal al
   consultar y borrarlo al confirmar— y ese patrón se copia tal cual.»*

   El patrón, entero: **consultar → crear registro temporal → ofrecer alternativas → confirmar →
   borrar el bloqueo → registrar**. Y el caso que se olvida: **el bloqueo también caduca solo** si
   la llamada se cae a mitad, porque en la Fase 4 se prueba justamente colgar a mitad de agendar.

6. **`crear_cita` escribe en Calendar Y en `Citas` de forma atómica** (§6). Si una de las dos partes
   falla, la herramienta devuelve **el motivo del fallo**, no una confirmación a medias. Una cita
   que está en Calendar pero no en la hoja —o al revés— es peor que no tener cita: la clínica deja
   de fiarse de los dos sitios.

### 4.3 Por qué las herramientas son propias

7. **`consultar_huecos` no es un free/busy pelado.** Del §6, lo que las nativas no saben hacer:
   - *«La nativa comprueba un rango libre/ocupado. No sabe que una limpieza dura 45 minutos y una
     revisión 30, ni que la ortodoncia va al Gabinete 2.»*
   - *«No aplica el horario de la clínica: te diría que el domingo a las cuatro de la mañana está
     libre.»*

   Las duraciones y el gabinete **salen de la pestaña `Tratamientos`**; el horario, de `Horarios`
   (una fila por tramo, para partir mañana y tarde). No los escribas en el código: violarían el §1.

8. **`consultar_huecos` devuelve 2–3 opciones en lenguaje natural**, no una lista de slots. Es una
   llamada de teléfono: sin pantalla, sin listas, y los números se dicen en palabras.

9. **`anotar` valida UN dato cada vez.** Del §6: *«El bot llama a `anotar` cada vez que el paciente
   le da un dato, y solo con ese dato. Si vuelve con un problema —un teléfono de ocho dígitos, un
   nombre que no se entiende— el bot lo pide otra vez explicando qué pasa: "creo que falta un
   número, ¿me lo repite?". Nunca lo apunta a medias y nunca lo completa él.»*
   *«Esto evita el fallo más caro del agente de voz: llegar al final de la conversación con cuatro
   datos y descubrir que uno está mal.»*
   La herramienta devuelve **el problema concreto**, no un `false`: el bot necesita poder explicar
   qué pasa.

10. **Nunca decir que una hora está ocupada por cuenta del bot** (§5, bloque `30`). *«El bot no ve
    la agenda; la ven las herramientas.»* Tus respuestas tienen que distinguir **«cerrado»** de
    **«ocupado»**: son cosas distintas y el paciente nota la diferencia. Si la clínica no abre el
    domingo, la respuesta no es «está ocupado».

### 4.4 La marca de tiempo

11. **Las variables de fecha de Vapi van en UTC, y eso da citas para ayer.** Del §5:

    > ⚠️ **La marca de tiempo es donde más se falla.** Las variables de fecha de Vapi van **en
    > UTC**. En España eso son una o dos horas de desfase, y un bot que cree que son las 23:00
    > cuando son las 01:00 da citas para ayer. Se resuelve con el filtro de fecha de LiquidJS
    > indicando la zona:
    > `{{ "now" | date: "%A %d de %B de %Y, %H:%M", "Europe/Madrid" }}`
    > **Esto se prueba explícitamente en la fase 3, con una llamada a las 00:30.**

    **La prueba de las 00:30 es tuya y es un punto del entregable.** No vale un test unitario con la
    hora simulada: el plan pide una llamada. Haz las dos cosas, pero la llamada no se salta.
    Y ojo al horario de verano: *«una o dos horas de desfase»* según la época del año.

### 4.5 Registro y RGPD

12. **`end-of-call-report` → pestaña `Llamadas`**, con fecha, duración, teléfono, resumen,
    transcripción, motivo de fin y **coste** (§4 y §6). Ese coste es el que la Fase 5 usará para
    calcular el precio por llamada: no lo omitas ni lo redondees al guardarlo.

13. **Datos ficticios en toda prueba.** Del §9 (RGPD): *«Grabar llamadas de pacientes son datos de
    salud … Para la demo: números ficticios y nada real.»* Y del §12, sugerencia a seguir:
    **grabación de llamadas apagada**.

14. **Rango de columnas cerrado al escribir en la hoja** (§9). Si alguien deja una nota suelta bajo
    una tabla, Google la cuenta como datos y desplaza las columnas. Tus escrituras tienen que
    apuntar a un rango explícito, no a «la siguiente fila libre» calculada a ojo.

---

## 5. Entregable de la fase

Copia literal del §8:

> **Entregable: dos llamadas a la vez sin pisarse**

Esto es el criterio de éxito, no una sugerencia. **Dos llamadas de verdad, simultáneas, pidiendo la
misma hora**, y solo una se la lleva; la otra recibe alternativas en lenguaje natural. Si no has
hecho las dos llamadas a la vez, la fase no está entregada, por muy verde que esté el test de
concurrencia.

---

## 6. Fuentes oficiales a consultar antes de dar nada por bueno

Del §11 del plan, las que aplican a esta fase:

- **Herramientas propias: formato de petición y respuesta** — `docs.vapi.ai/tools/custom-tools`
- **Eventos del servidor y `end-of-call-report`** — `docs.vapi.ai/server-url/events`
- Variables dinámicas y `assistantOverrides` — `docs.vapi.ai/assistants/dynamic-variables`
- Google Calendar (`google.calendar.event.create`, `google.calendar.availability.check`) — `docs.vapi.ai/tools/google-calendar`
- Google Sheets (`google.sheets.row.append`, **append-only**) — `docs.vapi.ai/tools/google-sheets`

Y además, por ser tuyas de esta fase:

- La API de Google Calendar (creación de eventos, zonas horarias, calendarios por gabinete) —
  documentación oficial de Google.
- El filtro de fecha de **LiquidJS** con zona horaria.

**Regla, y en esta fase más que en ninguna:** cualquier dato técnico que vaya a cambiar —formatos de
API, nombres de campos, tipos de evento— se verifica **contra fuente oficial y contra un POST real,
no contra tu memoria ni contra las plantillas del curso**. El riesgo del §9 que te toca de lleno es
precisamente ese. Si una fuente oficial contradice a PLAN.md, **no diverjas en silencio**: dilo,
para que se corrija PLAN.md.

> ⚠️ **No cargues la skill `claude-api`.** Trata de la API de Anthropic. Aquí el modelo es **Gemini
> vía Vapi**.

---

## 7. Qué reutilizar

Rutas exactas. **`PAGO` es de solo lectura: no se toca nada ahí.**

| Ruta | Para qué en esta fase |
| --- | --- |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\10 - 10. Agente de Voz - Profesional - Plantilla\Agente de reservas.json` | **La arquitectura completa y el patrón a copiar** (§11): webhook → `tool-calls` → disponibilidad → **bloqueo temporal** → alternativas → confirmar → borrar bloqueo → registrar. **Arquitectura sí; rutas de campos, verificar contra el POST real** |
| `...\10 - 10. Agente de Voz - Profesional - Plantilla\Confirmar_Whatsapp.json` | El paso de confirmación del mismo patrón |
| `...\02 - Recursos AILINK\13 - 13. Agente telefónico reservas avanzado\Reserva_restaurante.json` | La versión avanzada del flujo de reservas: es donde mejor se ve el bloqueo temporal |
| `...\02 - Recursos AILINK\13 - 13. Agente telefónico reservas avanzado\crear_vapi-2.json` | El cuerpo del asistente con las herramientas ya declaradas: cómo se registra una custom tool en Vapi |
| `...\02 - Recursos AILINK\12 - 12. Agente telefónico restaurante básico\crear_vapi.json` | La versión básica del mismo cuerpo, para contrastar campos |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\10 - Plantillas de la comunidad n8n\08 - 5. Agente de Voz - Santiago Garcia (MAKE)\` | **Segunda lectura del mismo patrón, en Make** (§11). Útil para contrastar decisiones de diseño |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\posibles skills\mi-skill\chatbot-flow-design\` | **Patrones de fallback y de escalado** (§11), que es justo lo que hacen `escalar_a_recepcion` y las respuestas de `anotar` cuando el dato viene mal |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\herramientas\` | Las herramientas de la V1 en Python: la misma lógica de negocio ya peleada (duraciones, gabinetes, horarios) |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\2 Codigo\C4 — La hoja de datos.md` | La estructura de la hoja, para saber dónde escribes |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\05 - Claude Code Skills y Recursos\04 - Automation Forge\automation-forge.zip` | Skill de Claude Code para construir automatizaciones (§11) |

> Del §11: *«La V1 era un orquestador propio en Python. Esto es lo mismo con Vapi debajo: se cambia
> el arnés, no el producto.»*

---

## 8. Skills

### Skills ya disponibles que debes usar

| Skill | Cuándo usarla |
| --- | --- |
| `engineering:system-design` | **Antes de escribir código**, para dos diseños que no se improvisan: el **bloqueo temporal** (dónde vive el registro, cuándo caduca, qué pasa si la llamada se cae) y la **atomicidad de `crear_cita`** entre Calendar y la hoja |
| `engineering:architecture` | Para el ADR del mecanismo de bloqueo elegido y de cómo se comparte el lector de la hoja con el compilador. También cierra la decisión abierta 2 del §12 (repo propio frente a n8n) con lo que hayas aprendido |
| `engineering:testing-strategy` | Para la batería que sostiene el entregable: **dos llamadas simultáneas**, bloqueo caducado, llamada caída a mitad, **la prueba de las 00:30**, cambio de horario de verano, tratamiento sin duración, gabinete ocupado, teléfono de ocho dígitos en `anotar` |
| `engineering:debug` | Cuando el webhook devuelva algo que Vapi no acepta, cuando una `tool-call` se quede sin respuesta, o cuando la cita salga con hora desplazada |
| `code-review` y `security-review` | Sobre el servicio antes de desplegarlo. Tus endpoints están **expuestos en internet** y escriben en el Calendar y en la hoja de una clínica: verifica autenticación del webhook, validación de entrada y que no se registra en claro ningún dato de paciente |
| `engineering:deploy-checklist` | Antes de cada despliegue a Vercel que cambie las herramientas del asistente en uso, con criterio de vuelta atrás a las nativas |
| `engineering:documentation` | Para el **runbook** de las herramientas: qué hacer cuando una devuelve error en mitad de una demo. La V1 tenía uno (`3 Operacion\O3 — Manual de guardia.md`) |

### Skills que NO debes cargar

- `claude-api` — es de la API de Anthropic; aquí el modelo es Gemini vía Vapi.

### Skills propias de esta fase (ya creadas)

Viven en `.claude/skills/` en la raíz del repo y se cargan solas cuando hacen falta:

| Skill | Cuándo usarla |
| --- | --- |
| `fijar-contrato-webhook-vapi` | **Antes que nada.** Captura el POST real, lo guarda como fixture, dice si llegó `toolCalls` o `toolCallList`, y deja un test que falla si cambia. Se niega a generar el manejador sin fixture |
| `herramienta-vapi-nueva` | Punto 2, cuatro veces. Las **cuatro partes**: manejador, respuesta `results`/`toolCallId`, **declaración en el asistente** (la que se olvida) y test contra el fixture |
| `bloqueo-temporal-citas` | Puntos 3 y 4. El patrón entero, la caducidad del bloqueo, la atomicidad de `crear_cita`, y el arnés de concurrencia que sostiene el entregable |
| `prueba-marca-de-tiempo` | Punto 6. El filtro con `Europe/Madrid` en todos los sitios, la franja 23:00–01:00, el cambio de horario de verano, y **la llamada real de las 00:30** |

Detalle de las cuatro en `skills-a-crear.md`, en esta misma carpeta.

---

## 9. Cuando termines

Deja escrito en `fases/fase3-herramientas-propias/ESTADO.md` lo que la Fase 4 necesita:

- El **contrato del webhook fijado**: ruta del fixture con el POST real y del tipo generado.
- URLs de los endpoints en Vercel y qué herramienta atiende cada uno.
- Cómo se declaran las herramientas en el asistente de Vapi, y cómo se vuelve a las nativas si hay
  que dar marcha atrás en mitad de una demo.
- Cómo funciona el bloqueo temporal y **cuánto tarda en caducar** (la Fase 4 cuelga llamadas a mitad
  de agendar: va a chocar con esto).
- Confirmación de que la pestaña `Llamadas` se está rellenando **con el coste real** de cada
  llamada, que es la materia prima de los números de la Fase 5.
- Resultado de la prueba de las 00:30, con fecha y hora reales de la llamada.
