---
name: plantilla-hoja-clinica
description: Crea la hoja de cálculo de una clínica con las siete pestañas exactas (Config, Tratamientos, FAQ, Horarios, Citas, Llamadas, Escalados), la columna público con validación, la pestaña LÉEME con la regla de las notas sueltas, y filas de ejemplo. Úsala siempre que haya que crear la hoja plantilla, montar la ficha de una clínica nueva, añadir o cambiar columnas de la hoja, o cuando se hable de la estructura de la hoja, de las siete pestañas o de qué puede editar la clínica. Proyecto "Agente de voz para clínicas dentales", Fase 2.
---

# La hoja de la clínica

## Qué es una clínica, en este proyecto

Del `PLAN.md` §4:

> Cada clínica es **una hoja de cálculo** (un `spreadsheetId`) más **una fila de identidad**. Nada
> más. Dar de alta una clínica nueva es duplicar una plantilla y rellenarla.

Esa frase es el modelo de negocio entero. Si la hoja necesita algo de fuera para funcionar —un
fichero de configuración, una variable de entorno por clínica, un caso especial en el código—, dar
de alta la siguiente clínica deja de costar una hora y pasa a costar una tarde tuya.

Y hay un motivo para que sea una hoja de cálculo y no una base de datos: *«Es la única base de datos
que una recepcionista sabe usar sin formación. Ese es el argumento entero»* (§3).

## Las siete pestañas

| Pestaña | Contenido | Quién la toca |
| --- | --- | --- |
| **Config** | Nombre de la clínica, nombre del bot, trato (tú/usted), zona horaria, dirección, teléfono de recepción, política de privacidad, mensaje de urgencia, parking… | La clínica |
| **Tratamientos** | Código, nombre, duración en minutos, gabinete, frase para el bot, `público` | La clínica |
| **FAQ** | Pregunta, **respuesta exacta aprobada**, categoría, `público` | La clínica |
| **Horarios** | Día, de, a (tramos; **una fila por tramo**, para partir mañana y tarde) | La clínica |
| **Citas** | Toda cita creada, con quién llamó y para quién | Se rellena solo |
| **Llamadas** | Fecha, duración, teléfono, resumen, transcripción, motivo de fin, coste | Se rellena solo |
| **Escalados** | Lo que el bot no supo resolver | **Se revisa cada mañana** |

Las cuatro primeras las lee el compilador. Las tres últimas las escriben las herramientas y el
`end-of-call-report`: créalas con sus cabeceras aunque nazcan vacías, porque las herramientas
escriben en rangos cerrados y necesitan que las columnas existan.

Dos detalles que parecen menores y no lo son:

- **`Horarios` lleva una fila por tramo.** Una clínica que abre de 9 a 14 y de 16 a 20 son dos
  filas, no una con un guion en medio. Si no, no hay forma de que el bot sepa que a las 15:00 está
  cerrado.
- **`FAQ` guarda la respuesta exacta aprobada**, no un apunte para que el bot improvise a partir de
  ahí. El bot lee esa respuesta; si está a medias, la completa él, y completar es justo lo que no
  queremos.

## La columna `público`

Es la barrera de confidencialidad, y el §4 la llama *«el argumento de venta más fuerte que tiene el
producto»*:

- `público = sí` → el compilador mete la fila en el prompt
- `público = no` → **la fila no sale de la hoja**

Va en `Tratamientos` y en `FAQ`. **Ponle validación de datos** para que solo acepte `sí` y `no`: es
mucho más barato impedir que alguien escriba «pendiente» que detectarlo luego en el compilador y
tener que decidir qué hacer con ello. La validación es la primera mitad del filtro; el compilador es
la segunda.

Gracias a esta columna, *«un margen, un coste de laboratorio o un acuerdo con una mutua pueden vivir
en la misma hoja sin riesgo»* (§1).

## La pestaña LÉEME

Escríbela **para la recepcionista**, no para un técnico. Lo mínimo que tiene que llevar:

- **La regla de las notas sueltas**, que es una incidencia real de la V1 (§4): *«no poner notas ni
  comentarios sueltos debajo de una tabla. Google los cuenta como datos y desplaza las columnas. Si
  hacen falta, van en una columna de comentarios o en una pestaña LÉEME.»*
- **Qué puede cambiar ella sola** y dónde:

  | Quiere que… | Hace… |
  | --- | --- |
  | Diga otro precio | Editar la respuesta en `FAQ` |
  | Responda algo nuevo | Añadir una fila a `FAQ` |
  | Una revisión dure 30 min | Cambiar `duracion_min` en `Tratamientos` |
  | Deje de ofrecer un tratamiento | Poner `público = no` |
  | Cambie el horario | Editar `Horarios` |
  | La tutee | Cambiar `trato` en `Config` |
  | Se llame de otra forma | Cambiar `nombre_bot` en `Config` |

- **Que los cambios tardan unos cinco minutos** en oírse por teléfono.
- **Que las pestañas `Citas`, `Llamadas` y `Escalados` se rellenan solas** y no hay que tocarlas — y
  que `Escalados` conviene mirarla cada mañana, porque ahí está lo que el bot no supo resolver.

Lo que **no** va en el LÉEME, porque no se promete: el tono, los límites y las barandillas del bot
no se editan desde la hoja. Del §1: *«Si la clínica puede editarlos, un martes por la mañana alguien
borra "no des consejo médico" sin saber lo que está haciendo.»*

## Filas de ejemplo

Deja una fila de ejemplo por pestaña, **marcada claramente como ejemplo** para que se vea que hay
que borrarla o sustituirla. Y en la plantilla, **al menos una fila con `público = no`** —un margen,
un coste de laboratorio—: es el punto 5 del guion de demo (§7), y una ficha sin ninguna fila
confidencial es una ficha con la que no se puede enseñar el filtro.

## Si la creas como fichero

La skill `anthropic-skills:xlsx` sirve para la parte mecánica. Ten en cuenta que produce `.xlsx` y
el destino es una Google Sheet: al importar, comprueba que no se han roto la validación de datos ni
los formatos de hora, que es lo primero que se pierde en la conversión.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §4 (*«El modelo de personalización — la ficha de la
clínica»*) y §1 (qué vive en la hoja y qué en el código). Dueña: **Fase 2**; la Fase 5 la usa en cada
alta de clínica nueva, donde el objetivo es rellenar una ficha entera en **menos de una hora**.

Estructura ya peleada en la V1:
`C:\Users\chica\Desktop\Bot Clinica Demo V1\2 Codigo\C4 — La hoja de datos.md`
Modelo de ficha por clínica del proyecto hermano:
`C:\Users\chica\Desktop\Bot Clinica WhatsApp\fichas\`
