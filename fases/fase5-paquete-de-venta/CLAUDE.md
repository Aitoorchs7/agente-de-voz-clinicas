# CLAUDE.md — Fase 5: El paquete de venta

> Este fichero es autosuficiente. No necesitas leer las otras fases ni recordar conversaciones
> previas. Lo único que manda por encima de este fichero es `PLAN.md` en la raíz del repo:
> **PLAN.md es la fuente de verdad.** Si algo aquí lo contradice, gana PLAN.md y hay que corregir
> este fichero.

---

## 1. Rol

Eres el agente responsable de la **Fase 5** del proyecto *Agente de voz para clínicas dentales*:
convertir un sistema que funciona en algo que se **vende** — el guion de la reunión, la capacidad de
dar de alta una clínica nueva en menos de una hora, los números de coste reales, y la propuesta y el
contrato.

---

## 2. El criterio que manda en esta fase

Del §0 del plan, y conviene leerlo antes de escribir una sola diapositiva:

> **El criterio de éxito de la demo no es técnico, es comercial.** La clínica tiene que terminar la
> llamada pensando *«esto lo puedo cambiar yo»*. Si termina pensando *«qué bien habla»*, la demo ha
> fallado: una voz bonita la tiene cualquiera, y la competencia la tendrá el mes que viene.

Y las tres cosas que la demo tiene que demostrar, **en este orden** (§0):

1. **Que la clínica manda.** Se abre la hoja delante de ella, se cambia un precio, y a los cinco
   minutos el bot lo dice por teléfono. *«Esto es el producto.»*
2. **Que no se inventa nada.** Se le pregunta a propósito algo que no está en la hoja y el bot dice
   que eso lo confirma recepción. *«Esto es lo que quita el miedo.»*
3. **Que la cita aparece de verdad.** El evento sale en Calendar y la fila en la hoja, mientras ella
   mira. *«Esto es lo que cierra.»*

*«Todo lo demás del plan existe para sostener estas tres frases.»*

---

## 3. Alcance

### Lo que construyes

Lo que dice el §8 del plan, literal:

- Guion de la demo (§7) ensayado
- Hoja de alta: rellenar la ficha de una clínica nueva en menos de una hora
- Números de coste por llamada, calculados con llamadas reales
- Propuesta y contrato — plantillas en `PAGO/PROFESIONALIZA TU AGENCIA IA/`

### El guion de la demo, que ya está escrito (§7)

No lo inventes: está en el plan y se **ensaya**, no se rediseña.

**Antes de la reunión** (30–45 min): *«se rellena la ficha con los datos reales de esa clínica
—sacados de su web y de su Google Business—, se compila y se prueba una llamada. La demo es de su
clínica, con sus tratamientos y su nombre. Una demo genérica no vende.»*

**En la reunión:**

1. **Que llame ella, desde su móvil.** No una grabación, no tu teléfono. Pide cita para una limpieza.
2. **Mientras habla, la pantalla compartida enseña el Calendar.** La cita aparece sola. Ese es el momento.
3. **Se abre la hoja y se cambia un precio delante de ella.** Se espera. Se vuelve a llamar. El bot dice el precio nuevo. → *«Esto lo cambia usted un martes por la mañana y a las once y cinco el bot ya lo dice.»*
4. **Se le pide que intente pillarlo.** Que pregunte algo que no está en la hoja. El bot dice que eso lo confirma recepción y lo apunta en `Escalados`. → *«No se inventa. Y lo que no sabe, se lo deja escrito a usted cada mañana.»*
5. **Se enseña la fila con `público = no`.** Un margen, un coste. → *«Esto está en la misma hoja y el bot no lo ha visto nunca. El filtro está antes del bot, no dentro.»*
6. **La pregunta del miedo, antes de que la haga ella:** *«¿y si falla?»* → Se enseña el desvío. Se quita delante de ella. El teléfono vuelve a sonar en recepción. Treinta segundos.

**La objeción que siempre sale** (§7): *«mis pacientes son mayores, no quieren hablar con una
máquina»*. Y la respuesta, que no es discutir: *«es el desvío por horario. El bot entra solo cuando
no hay nadie: noches, fines de semana, festivos, o cuando comunica. No sustituye a la
recepcionista; coge las llamadas que hoy se pierden. Se empieza ahí y se sube desde ahí.»*

### Lo que NO construyes

- **No tocas el compilador (Fase 2), ni las herramientas (Fase 3), ni la configuración de voz
  (Fase 4).** Si el ensayo del guion revela un fallo, se arregla en su fase y con sus reglas, y se
  anota. Un arreglo de última hora sin sus pruebas es lo que hace que una demo falle delante de un
  cliente.
- **No rediseñas el guion de venta.** Está en el §7 y sale de material ya probado. Lo ensayas, lo
  cronometras y lo pules; no lo reinventas.
- **No prometes producción.** Del §0: *«No es todavía el producto en producción de esa clínica. No
  toca su centralita, no porta su número, no ve sus datos reales de pacientes. Es una réplica fiel
  corriendo en paralelo.»* Ni la propuesta ni el guion pueden decir lo contrario.
- **No haces la Fase 0** (cuentas, número, facturación). Es manual y ya está hecha.

---

## 4. Punto de partida

De la **Fase 4** necesitas (está en `fases/fase4-afinar-voz/ESTADO.md`):

- **Las llamadas reales con su duración y su coste**, tal como quedaron en la pestaña `Llamadas`.
  Son la materia prima de tus números y no tienes otra fuente legítima.
- Qué falló con gente de verdad y qué se arregló: es material del argumentario y de la respuesta a
  la objeción de los pacientes mayores.
- La confirmación de que **cinco personas llamaron y ninguna se quedó colgada**.

De la **Fase 3**: las herramientas propias y el `end-of-call-report` rellenando `Llamadas` con coste.
De la **Fase 2**: el compilador con el filtro de `público`, el contador de filas y el **disparo
manual** (es el botón del punto 3 del guion), y la **hoja plantilla de las siete pestañas**, que es
la base de la hoja de alta.
De la **Fase 1**: el número español de Twilio funcionando — **sin él no hay demo**, porque el número
de EE. UU. le costaría a la clínica ~1,82-2 €/min (§9).

---

## 5. Restricciones duras — innegociables

1. **No inventes cifras de coste. Usa las de llamadas reales del `end-of-call-report`.** Del §10,
   sobre la tabla de costes del propio plan:

   > **≈ 0,12 € por llamada.** *«Un número para orientarse, no para poner en una propuesta: los
   > precios se verifican en vapi.ai/pricing y en Twilio antes de cotizar, y se recalculan con
   > llamadas reales al final de la fase 4, donde el `end-of-call-report` ya trae el coste real de
   > cada una.»*

   Es decir: **los ≈185 €/mes y los ≈0,12 €/llamada del §10 NO van en una propuesta.** Son
   orientativos. Tus números salen de la pestaña `Llamadas`, y los precios de lista se verifican en
   `vapi.ai/pricing` y en Twilio **el día que cotizas**.

2. **Dos notas que cambian la cuenta** (§10) y que hay que tener presentes al cotizar: *«cada línea
   concurrente por encima de la décima son 10 $/mes, y el modo HIPAA son 1.000 $/mes (no aplica
   aquí; en España el marco es el RGPD)»*.

3. **Nunca se porta el número. Se desvía.** Del §1, y es **argumentario**, no nota técnica:
   *«Una portabilidad tarda semanas y no tiene marcha atrás. Un desvío se quita en treinta segundos
   desde la centralita. Ese botón de pánico es parte del argumentario de venta.»* Es el punto 6 del
   guion. **Ninguna propuesta puede ofrecer portabilidad.**

4. **La demo es de SU clínica.** Del §7: *«La demo es de su clínica, con sus tratamientos y su
   nombre. Una demo genérica no vende.»* 30–45 minutos de preparación por reunión, con datos
   sacados de su web y su Google Business.

5. **RGPD en la reunión** (§9 y §12): **números ficticios y nada real**, y **grabación de llamadas
   apagada** — *«cuesta poco y quita una conversación incómoda sobre RGPD en la reunión de venta»*.
   Si el trato avanza, hace falta **contrato de encargado de tratamiento y retención corta**: eso va
   en la propuesta, no se improvisa en la reunión.

6. **El número de EE. UU. no aparece en ninguna demo.** Del §9: quien lo llame desde España paga
   tarifa internacional. *«Antes de cualquier demo o desvío real, pasar al número español de
   Twilio.»* Si el bundle de Twilio no está aprobado, **la demo no se hace**.

7. **Lo que se promete que la clínica puede cambiar sola es exactamente esto, y nada más** (§4):

   | Quiere que… | Hace… |
   | --- | --- |
   | Diga otro precio | Editar la respuesta en `FAQ` |
   | Responda algo nuevo | Añadir una fila a `FAQ` |
   | Una revisión dure 30 min | Cambiar `duracion_min` en `Tratamientos` |
   | Deje de ofrecer un tratamiento | Poner `público = no` |
   | Cambie el horario | Editar `Horarios` |
   | La tutee | Cambiar `trato` en `Config` |
   | Se llame de otra forma | Cambiar `nombre_bot` en `Config` |

   **El tono, los límites y las barandillas no están en esa lista y no se prometen** (§1): *«Si la
   clínica puede editarlos, un martes por la mañana alguien borra "no des consejo médico" sin saber
   lo que está haciendo.»*

8. **La regla de la hoja va en la hoja de alta** (§4): *«no poner notas ni comentarios sueltos debajo
   de una tabla. Google los cuenta como datos y desplaza las columnas.»* Es una incidencia real de
   la V1: la clínica tiene que leerla el primer día, no el día que se rompe.

9. **Las plantillas de `PAGO` son de solo lectura.** Se copian al repo y se adaptan aquí; no se
   edita nada en `PAGO`.

---

## 6. Entregable de la fase

Copia literal del §8:

> **Entregable: enseñárselo a una clínica de verdad**

Esto es el criterio de éxito, no una sugerencia. No es «tener la propuesta lista»: es **una reunión
con una clínica real**. Todo lo que produzcas —guion ensayado, hoja de alta, números, propuesta,
contrato— existe para que esa reunión se pueda celebrar.

---

## 7. Fuentes oficiales a consultar antes de dar nada por bueno

Del §11 y del §10 del plan, las que aplican a esta fase:

- **Precios de Vapi — `vapi.ai/pricing`**, el día que cotices. El §10 lo exige explícitamente.
- **Precios de Twilio** (número español y minutos entrantes), el día que cotices.
- Precios de Gemini, de Deepgram y del proveedor de TTS elegido en la Fase 1.
- Google Sheets (`google.sheets.row.append`, **append-only**) — `docs.vapi.ai/tools/google-sheets`
- Eventos del servidor y `end-of-call-report` — `docs.vapi.ai/server-url/events`

**Regla, y aquí es la más cara de saltarse:** cualquier dato técnico o económico que vaya a cambiar
—modelos, formatos de API, **precios**— se verifica **contra fuente oficial, no contra memoria ni
contra la tabla del §10**. Un precio equivocado en una propuesta no es un bug: es una conversación
incómoda con un cliente. Si una fuente oficial contradice a PLAN.md, **no diverjas en silencio**:
dilo, para que se corrija PLAN.md — empezando por la tabla de costes del §10.

> ⚠️ **No cargues la skill `claude-api`.** Trata de la API de Anthropic. Aquí el modelo es **Gemini
> vía Vapi**.

---

## 8. Qué reutilizar

Rutas exactas. **`PAGO` es de solo lectura: no se toca nada ahí.**

| Ruta | Para qué en esta fase |
| --- | --- |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\PROFESIONALIZA TU AGENCIA IA\03 - Propuesta comercial\Propuesta_Comercial_Automatizacion_IA_Plantilla.docx` | **La plantilla de propuesta** (§8, §11). También está el `.pdf` al lado, para ver el formato final |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\PROFESIONALIZA TU AGENCIA IA\04 - Contratos\Contrato_Prestacion_Servicios_Automatizacion_IA.docx` | **La plantilla de contrato** (§8, §11). En la misma carpeta hay `generador-contratos.zip` |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\07 - 7. eBook cómo vender Automatizaciones\` | **El argumentario del §7** (§11) |
| `...\02 - Recursos AILINK\19 - 19. Redefiniendo la Venta Profesional\` | Procesos de venta (§11) |
| `...\02 - Recursos AILINK\20 - 20. Entender antes de vender\` | Procesos de venta (§11) — especialmente útil para la fase de descubrimiento antes de la demo |
| `...\02 - Recursos AILINK\21 - 21. Procesos de ventas comunes\` | Procesos de venta (§11) |
| `...\02 - Recursos AILINK\22 - 22. Tu Primera llamada\` | Procesos de venta (§11) |
| `...\02 - Recursos AILINK\03 - 3. Plantilla propuesta comercial\` y `04 - 4. Plantilla de Propuesta Comercial HT\` | Dos plantillas más de propuesta, para contrastar con la de `PROFESIONALIZA` |
| `...\02 - Recursos AILINK\06 - 6. Looms Ganadores - Ejemplos\` | Ejemplos de demos grabadas que cerraron: útil para ensayar el tono del guion |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\05 - Claude Code Skills y Recursos\01 - Entrega de servicio (Método AILINK)\` | La skill **`production-ready`** para el paso a producción (§11). Tiene `SKILL (1).md`, `SKILL (2).md` y `checklist.md` |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\3 Operacion\O2 — Telefonía y número.md` | **La regla del desvío** (§11), que es el punto 6 del guion y el que responde a *«¿y si falla?»* |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\1 Proyecto\P1 — Qué es y en qué estado está.md` | Cómo se contó el proyecto en la V1: material para la propuesta |

---

## 9. Skills

### Skills ya disponibles que debes usar

| Skill | Cuándo usarla |
| --- | --- |
| `sales:account-research` | **En los 30–45 min de preparación antes de cada reunión** (§7): investigar la clínica —web, Google Business, tratamientos, horarios— para rellenar su ficha con datos reales. *«Una demo genérica no vende»* |
| `sales:call-prep` | Para preparar la reunión concreta: quién estará, qué le preocupa, y cómo encaja el guion del §7 en su caso |
| `sales:handle-objection` | Para la objeción que **siempre** sale (§7): *«mis pacientes son mayores, no quieren hablar con una máquina»*, y para *«¿y si falla?»*. La respuesta ya está en el plan: úsala para ensayarla, no para reinventarla |
| `sales:create-an-asset` | Para el one-pager o el material de apoyo. **Encaja especialmente bien porque su regla es no inventar números**, que es justo la restricción dura de esta fase |
| `small-business:proposal-builder` | Para montar la propuesta a partir de la plantilla de `PAGO` |
| `anthropic-skills:docx` | Las plantillas de propuesta y contrato **son `.docx`**: esta es la skill que las abre y las adapta sin romper el formato |
| `anthropic-skills:pdf` | Para leer la versión `.pdf` de la propuesta (formato final de referencia) y para entregar lo que cierres |
| `legal:review-contract` | Sobre el contrato antes de mandarlo, y muy en concreto sobre el **contrato de encargado de tratamiento** y la retención de datos que exige el §9 por tratarse de datos de salud |
| `engineering:documentation` | Para la **hoja de alta**: es un runbook para alguien que no es técnico y que tiene que rellenar una ficha en menos de una hora |
| `anthropic-skills:xlsx` | Para la plantilla de la ficha de alta, si se entrega como fichero de cálculo |

### Skills que NO debes cargar

- `claude-api` — es de la API de Anthropic; aquí el modelo es Gemini vía Vapi.
- `marketing:*` y el resto de `sales:*` que dependen de un CRM conectado (`sales:pipeline-review`,
  `sales:forecast`, `sales:deal-review`…): no hay CRM en este proyecto y pedirían datos que no
  existen. Esta fase es **una reunión con una clínica**, no una operación de ventas montada.

### Skills propias de esta fase (ya creadas)

Viven en `.claude/skills/` en la raíz del repo y se cargan solas cuando hacen falta:

| Skill | Cuándo usarla |
| --- | --- |
| `alta-clinica-nueva` | Punto 2 del entregable, y **antes de cada reunión**: los seis pasos para dejar la ficha de una clínica compilada y probada en menos de una hora, con su fila `público = no` obligatoria |
| `coste-por-llamada-real` | Punto 3: los números que van en la propuesta, sacados de la pestaña `Llamadas` y de precios verificados el mismo día. **Se niega a usar las cifras del §10** |
| `ensayar-guion-demo` | Punto 1, y antes de cada reunión: los seis pasos con cronómetro, lista de comprobación y plan B con una frase que decir por cada fallo posible |

Detalle de las tres en `skills-a-crear.md`, en esta misma carpeta.

---

## 10. Cuando termines

Deja escrito en `fases/fase5-paquete-de-venta/ESTADO.md`:

- Los **números de coste reales** con los que cotizas, la fecha en que verificaste los precios de
  lista, y de qué llamadas concretas salen. Caducan: anota cuándo hay que rehacerlos.
- El guion ensayado con tiempos, y qué se rompió al ensayarlo.
- La hoja de alta, y **cuánto se tardó de verdad** en rellenar la ficha de una clínica nueva (el
  objetivo del plan es menos de una hora: si son tres, dilo).
- La propuesta y el contrato adaptados, y qué decisiones quedaron pendientes de un humano.
- Qué pasó en la reunión con la clínica de verdad. Es el entregable, y es también la mejor fuente
  para corregir PLAN.md.
