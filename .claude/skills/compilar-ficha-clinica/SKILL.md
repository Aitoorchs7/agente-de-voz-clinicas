---
name: compilar-ficha-clinica
description: Compila la hoja de cálculo de una clínica en el prompt del asistente de Vapi — lee las siete pestañas, FILTRA las filas con público = no antes de construir el prompt, rellena los huecos de los bloques, cuenta filas leídas frente a cargadas y publica con PATCH /assistant/{id}. Úsala siempre que haya que compilar, recompilar o publicar la ficha de una clínica, cuando se cambie un precio, un horario, una FAQ o un tratamiento en la hoja y haya que verlo reflejado en el bot, cuando se dé de alta una clínica nueva, o cuando se hable del filtro de confidencialidad, del contador de filas o del bucle de cinco minutos. Proyecto "Agente de voz para clínicas dentales", Fase 2.
---

# Compilar la ficha de una clínica

## Por qué esta pieza es el producto

Del `PLAN.md` §1, la decisión de la que sale todo lo demás:

> **Lo que el bot *sabe* vive en una hoja de cálculo de la clínica. Lo que el bot *es* vive en el
> código.**

El compilador es la bisagra entre esas dos mitades. Y existe como **paso previo a la llamada**, no
como herramienta en llamada, por una restricción técnica que conviene tener presente (§2): la
integración de Google Sheets de Vapi es **append-only** — *«only supports adding new rows … does not
support reading from or modifying existing data»*. El bot no puede leer la hoja mientras habla. Por
eso se compila antes.

Y eso resulta ser mejor, no peor:

> *«El filtro de confidencialidad se aplica en un sitio, fuera de la llamada, donde se puede
> **contar**. Si en la hoja hay 12 tratamientos y el compilador carga 11, la que falta es la
> confidencial. **El filtro no es una promesa, es un contador.**»*

Esa frase es la razón de que el filtro y el contador sean **la misma pieza**. Si en tu
implementación se pueden desactivar por separado, está mal diseñada.

## El ciclo, en orden

El orden no es un detalle de estilo: el filtro va **antes** de construir el prompt, no después de
renderizarlo. Un filtro que corre al final es un filtro que un día se salta un camino.

### 1. Leer

Lee las siete pestañas por `spreadsheetId`: `Config`, `Tratamientos`, `FAQ`, `Horarios`, `Citas`,
`Llamadas`, `Escalados`. Para el prompt solo importan las cuatro primeras; las otras tres las
rellenan las herramientas.

**Lee con el rango de columnas cerrado**, no «hasta donde haya datos». El §4 del plan documenta una
incidencia real de la V1: si alguien escribe una nota suelta debajo de una tabla, Google la cuenta
como datos y desplaza las columnas. Tu lector tiene que **sobrevivir** a eso, no confiar en que no
pase. La regla está escrita para la clínica, pero la gente escribe notas igualmente.

### 2. Filtrar — antes de tocar el prompt

- `público = sí` → la fila entra
- `público = no` → **la fila no sale de la hoja**

Aplica a `Config`, `Tratamientos` y `FAQ` (`Config` lleva `público` desde el 24-sep, decisión del
humano). Sé generoso interpretando el valor (mayúsculas, `si` sin tilde, espacios de más) y
**estricto ante la duda**. Tal como está implementado:

- **Valor escrito que no es ni `sí` ni `no`** («pendiente», «x», «?») → **se aborta la publicación**
  entera. Es la regla del `CLAUDE.md` de la Fase 2 (§5.1.3).
- **Celda de `público` vacía en una fila con algo escrito** → la fila **no se carga**, se cuenta como
  *sin marcar* y se avisa en el registro. Es lo que pasa con una nota suelta bajo la tabla, y el lector
  tiene que **sobrevivir** a eso, no pararse: la fila no entra, así que no hay fuga posible.

Equivocarse hacia dentro publica un margen de laboratorio en un prompt; equivocarse hacia fuera solo
hace que el bot no mencione un tratamiento.

### 3. Contar

Por pestaña: **filas leídas frente a filas cargadas**. Formato del §8: *«12 leídas, 11 cargadas»*.

Este contador no es un log de depuración: es lo que se le enseña a la clínica en la reunión de venta
(§7, punto 5). Si no se puede leer en voz alta delante de alguien, no sirve. Escríbelo pensando en
esa persona, no en ti.

### 4. Renderizar

Concatena los bloques de `contenido/bloques/` por su `orden`, saltando los que tengan
`activo: false`. Y respeta la frontera entre los dos mundos de `{{...}}`, que comparten sintaxis y
no comparten dueño (§5):

| Hueco | Quién lo rellena |
| --- | --- |
| `{{clinica}}`, `{{bot}}`, `{{trato}}`, `{{privacidad}}` | **Tú**, desde `Config` |
| `{{datos}}`, `{{tratamientos}}`, `{{faq}}`, `{{horario}}` | **Tú**, solo con las filas `público = sí` |
| `{{now}}`, `{{date}}`, `{{customer.number}}` | **Vapi, en la llamada. Déjalos intactos** |

Si resuelves los de Vapi, el bot se queda con la fecha del momento de compilar en vez de la de la
llamada — y como el compilador corre cada cinco minutos, el fallo es intermitente y desquiciante de
diagnosticar.

### 5. Publicar

`PATCH /assistant/{id}` con el prompt renderizado. Verifica el formato del `PATCH` en
`docs.vapi.ai`, no en las plantillas del curso.

> ⚠️ **Un `PATCH` de `model` sustituye el objeto `model` entero, no solo el campo que mandas.** Si
> envías únicamente `{"model": {"messages": [...]}}`, puedes dejar al asistente **sin proveedor, sin
> modelo y sin herramientas** — es decir, mudo, y con un `200 OK` en la mano.
>
> La secuencia segura es **GET → modificar → PATCH completo**: recuperas el asistente, coges el
> objeto `model` tal como está, le cambias solo el texto del *system message*, y lo mandas entero.
>
> Confírmalo en `docs.vapi.ai/api-reference/assistants/update` antes de la primera publicación real,
> y comprueba también que el prompt siga viviendo en `model.messages[role=system].content`.
>
> Después de publicar, **verifica**: un GET del asistente y comparar lo que ha quedado con lo que
> mandaste. Un `200 OK` no es una publicación correcta.

### 6. Abortar si el filtro no se puede garantizar

Para **sin publicar** y deja el asistente como estaba si: falta la columna `público`, hay un valor
que no se puede clasificar, el conteo no cuadra, o la lectura devolvió algo inesperado.

Un prompt viejo es un problema de un rato. Un coste de laboratorio o un acuerdo con una mutua dentro
del prompt es el final del producto: es exactamente lo que el §4 vende como *«el argumento de venta
más fuerte que tiene el producto»*. Ante la duda, no publiques.

## Los dos disparos

- **Cada cinco minutos**, en bucle.
- **A mano**, con un botón.

El manual no es un extra para desarrolladores: es el punto 3 del guion de demo (§7). Se cambia un
precio delante de la clínica, se espera, se vuelve a llamar, y el bot dice el precio nuevo. *«Esto
lo cambia usted un martes por la mañana y a las once y cinco el bot ya lo dice.»*

## Lo que no hace esta skill

- **No escribe datos en los bloques.** Si te ves metiendo un precio o un horario en un fichero de
  `contenido/bloques/`, has roto el §1: eso va en la hoja.
- **No toca la configuración del asistente** (voz, modelo, transcriber, `toolIds`, `analysisPlan`).
  Eso es `configurar-asistente-vapi`. Aquí viajan **el prompt y los tres mensajes fijos**
  (`firstMessage`, `endCallMessage`, `voicemailMessage`, que llevan `{{bot}}` y `{{clinica}}`), y el
  `spreadsheetId` de la herramienta nativa de Sheets. Nada más. Decisión del humano, 24-sep.
- **No lee la hoja durante la llamada.** No se puede, y un diseño que lo asuma se cae entero (§9).

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §1 (la decisión), §2 (los dos caminos de datos y el
append-only), §4 (las siete pestañas y la columna `público`) y §5 (bloques y huecos). Dueña:
**Fase 2**; la reutiliza la Fase 5 al dar de alta cada clínica nueva.

Documentación oficial: `docs.vapi.ai/assistants/dynamic-variables`,
`docs.vapi.ai/tools/google-sheets`, y la API de Google Sheets para la lectura por rangos.

Estructura de hoja ya peleada en la V1:
`C:\Users\chica\Desktop\Bot Clinica Demo V1\2 Codigo\C4 — La hoja de datos.md`
