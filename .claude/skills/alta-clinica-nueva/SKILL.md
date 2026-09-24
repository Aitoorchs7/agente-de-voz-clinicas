---
name: alta-clinica-nueva
description: Da de alta una clínica nueva en menos de una hora — saca sus datos de su web y su Google Business, rellena las siete pestañas de su hoja, deja al menos una fila con público = no para poder enseñar el filtro, compila, comprueba el contador y hace una llamada de prueba. Úsala siempre que haya que preparar una demo para una clínica concreta, dar de alta un cliente nuevo, rellenar o revisar la ficha de una clínica, o cuando se hable de personalizar el bot para una clínica. Proyecto "Agente de voz para clínicas dentales", Fase 5.
---

# Dar de alta una clínica nueva

## Por qué esto tiene que costar menos de una hora

Dos motivos, y los dos son de negocio.

El primero, del `PLAN.md` §7: *«se rellena la ficha con los datos reales de esa clínica —sacados de
su web y de su Google Business—, se compila y se prueba una llamada. La demo es de **su** clínica,
con **sus** tratamientos y **su** nombre. **Una demo genérica no vende.**»* Son 30–45 minutos por
reunión, y hay que hacerlo antes de **cada** reunión.

El segundo: si el alta cuesta una tarde, el producto no escala y cada cliente nuevo te cuesta un día
tuyo. Del §4: *«Dar de alta una clínica nueva es duplicar una plantilla y rellenarla.»* Si te ves
tocando código para dar de alta a alguien, algo está mal en otro sitio.

## Los seis pasos

### 1. Recoger los datos públicos

De su web y de su ficha de Google Business. Lo que buscas:

- **Identidad**: nombre de la clínica, dirección, teléfono de recepción, parking.
- **Horarios**, incluidos los tramos de mañana y tarde por separado.
- **Tratamientos** que anuncia, con precios si los publica.
- **Preguntas frecuentes** que ya tenga respondidas en su web.
- **El tono con el que se dirige a sus pacientes.** De ahí sale `trato` (tú o usted). Una clínica que
  tutea en Instagram y otra que trata de usted en su web no quieren el mismo bot.
- **Cómo se llaman a sí mismos**: «la doctora», «el equipo», «nosotros».

La skill `sales:account-research` ayuda con este paso.

**No inventes nada que no esté publicado.** Lo que no encuentres va a la lista del paso 6, para
preguntárselo a la clínica. Un precio inventado en una demo es una conversación muy incómoda.

### 2. Rellenar la hoja

Duplica la plantilla de las siete pestañas (skill `plantilla-hoja-clinica`) y rellena las cuatro que
lee el compilador:

- **Config** — identidad, `trato`, zona horaria, teléfono de recepción, política de privacidad,
  mensaje de urgencia.
- **Tratamientos** — código, nombre, **duración en minutos**, gabinete, frase para el bot, `público`.
- **FAQ** — pregunta, **respuesta exacta aprobada**, categoría, `público`.
- **Horarios** — **una fila por tramo**. Una clínica de 9 a 14 y de 16 a 20 son dos filas.

`Citas`, `Llamadas` y `Escalados` se quedan vacías: se rellenan solas.

Dos cosas que se hacen mal con prisa: poner la duración a ojo (si no la publica, pregunta o usa una
por defecto y **anótalo como pendiente**), y meter en `FAQ` un apunte en vez de la respuesta
completa. El bot lee esa respuesta tal cual; si está a medias, la completa él, y completar es justo
lo que no queremos.

### 3. Dejar al menos una fila con `público = no`

**Esto no es opcional.** Es el punto 5 del guion de demo (§7): se enseña una fila con un margen o un
coste de laboratorio y se dice *«esto está en la misma hoja y el bot no lo ha visto nunca. El filtro
está antes del bot, no dentro.»*

Una ficha sin ninguna fila confidencial es una ficha con la que **no se puede enseñar el filtro**, y
el filtro es *«el argumento de venta más fuerte que tiene el producto»* (§4). Ponla desde el
principio, con un dato verosímil para una clínica dental: el coste de laboratorio de una corona, el
margen de un blanqueamiento, el acuerdo con una mutua.

### 4. Compilar y mirar el contador

Con la skill `compilar-ficha-clinica`. Comprueba el registro: **filas leídas frente a cargadas**
(«12 leídas, 11 cargadas»). Ese número se enseña en la reunión, así que míralo antes: si leídas y
cargadas coinciden, o no hay ninguna fila confidencial (vuelve al paso 3) o el filtro no está
haciendo su trabajo.

### 5. Hacer una llamada de prueba

Del §7: *«se compila y se prueba una llamada»*. No es opcional y no es una formalidad: es donde se
descubre que un tratamiento tiene la duración mal puesta o que el nombre de la clínica suena raro
dicho en voz alta.

Pregúntale al bot por un par de tratamientos de **esa** clínica y por su horario. Y pregúntale algo
que **no** esté en la hoja, para confirmar que dice que lo confirma recepción en vez de inventarlo:
es el punto 4 del guion.

**Desde el número español de Twilio**, nunca desde el de EE. UU. (§9).

### 6. Entregar la lista de lo que falta

Lo que no estaba en su web y no se puede inventar: precios que no publica, duraciones reales de sus
tratamientos, qué hacer con las urgencias, si quieren que el bot dé precios por teléfono o no.

Esta lista es útil dos veces: evita inventar, y **da conversación en la reunión**. Preguntarle a una
clínica por sus duraciones reales es una forma de que se vea dentro del producto.

## Antes de dar la ficha por buena

- ¿El bot dice el nombre de la clínica **bien** en voz alta? Los nombres con siglas o en otro idioma
  se dicen fatal y se arregla escribiéndolos como suenan en `Config`.
- ¿El `trato` es el que usa la clínica con sus pacientes?
- ¿Hay al menos una fila con `público = no`?
- ¿Cuadra el contador?
- ¿Los horarios tienen los tramos partidos?
- ¿La llamada de prueba se hizo desde el número español?

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §4 (la ficha de la clínica), §7 (el guion de la
demo y la preparación previa) y §8 (entregable de la Fase 5: *«Hoja de alta: rellenar la ficha de
una clínica nueva en menos de una hora»*). Dueña: **Fase 5**; se usa antes de cada reunión de venta.

Skills que encadena: `sales:account-research` (paso 1), `plantilla-hoja-clinica` (paso 2),
`compilar-ficha-clinica` (paso 4).
