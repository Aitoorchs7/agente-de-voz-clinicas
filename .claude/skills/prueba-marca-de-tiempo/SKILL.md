---
name: prueba-marca-de-tiempo
description: Verifica que el bot no da citas para ayer — comprueba el filtro de LiquidJS con Europe/Madrid, prueba las horas peligrosas (23:00-01:00) y los dos lados del cambio de horario de verano, y exige la llamada real de las 00:30. Úsala siempre que se toque el renderizado de fechas u horas, cuando una cita salga con hora desplazada o para el día equivocado, cuando se hable de UTC, zona horaria, {{now}}, {{date}} o del desfase de una o dos horas. Proyecto "Agente de voz para clínicas dentales", Fase 3.
---

# La prueba de la marca de tiempo

## El fallo que busca

Del `PLAN.md` §5, con el aviso puesto por quien ya lo ha sufrido:

> ⚠️ **La marca de tiempo es donde más se falla.** Las variables de fecha de Vapi van **en UTC**. En
> España eso son una o dos horas de desfase, y un bot que cree que son las 23:00 cuando son las
> 01:00 da citas para ayer.

Lo desagradable de este fallo es que **no se ve durante el día**. A las once de la mañana, una hora
de desfase es una hora de desfase: el bot dice las diez cuando son las once y alguien lo nota y lo
arregla. A la una de la madrugada, esa misma hora de desfase cambia el **día**, y el bot agenda para
ayer con total naturalidad. Como casi nadie prueba a esa hora, el fallo llega a producción intacto.

Por eso el plan no pide un test: pide **una llamada a las 00:30**.

## Lo que se comprueba

### 1. El filtro lleva la zona

La solución del §5 es el filtro de fecha de LiquidJS indicando la zona:

```
{{ "now" | date: "%A %d de %B de %Y, %H:%M", "Europe/Madrid" }}
```

Revisa **todos** los sitios donde se renderiza una fecha o una hora: los bloques del prompt, las
respuestas de las herramientas y lo que se escribe en Calendar y en la hoja. Basta con que uno se
quede en UTC para que el bot se contradiga a sí mismo a mitad de conversación, que es aún más
confuso que equivocarse siempre.

Ten presente la frontera de los dos mundos de `{{...}}` (§5): `{{now}}`, `{{date}}` y
`{{customer.number}}` los rellena **Vapi en la llamada**, no el compilador. Si el compilador los
resuelve, el bot se queda con la hora del momento de compilar — y como se compila cada cinco
minutos, el error es intermitente y cuesta mucho de ver.

### 2. Las horas peligrosas, con el reloj simulado

La franja **23:00–01:00** hora española, minuto a minuto si hace falta. Ahí es donde el desfase deja
de mover la hora y empieza a mover el día.

Comprueba en cada caso: qué día cree el bot que es, qué día ofrece, y qué fecha acaba en el evento
de Calendar y en la fila de `Citas`. Las tres tienen que coincidir. Un bot que dice «mañana jueves»
y crea el evento el miércoles ha fallado aunque diga la hora correcta.

### 3. Los dos lados del cambio de horario

En España el desfase con UTC es de **una hora en invierno y dos en verano**. Prueba los dos, y
prueba también una cita que se pide **antes** del cambio **para después** del cambio: es el caso que
se escapa siempre, porque el desfase cambia entre el momento de agendar y el de la cita.

### 4. La llamada real de las 00:30

**Las pruebas con reloj simulado no la sustituyen.** El §8 la pone como punto del entregable de la
Fase 3 con esas palabras: *«Prueba de la marca de tiempo a las 00:30»*.

Hay un motivo para insistir: el reloj simulado prueba *tu* código, y en esta cadena hay piezas que
no son tuyas —Vapi rellenando `{{now}}`, el modelo interpretando la fecha, Calendar guardando el
evento con su zona—. La llamada real prueba la cadena entera.

Cuando la hagas, **anota la fecha y la hora reales** de la llamada y qué pasó. Es lo que demuestra
que se hizo.

## Cuándo volver a pasarla

- Cada vez que se toque el renderizado de fechas u horas, en cualquier capa.
- Antes de cada cambio de horario de verano.
- Cuando alguien informe de una cita en el día equivocado, antes de buscar en otro sitio.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §5 (*«Los huecos»* y el aviso de la marca de
tiempo) y §9 (fila «Marca de tiempo en UTC»). Dueña: **Fase 3**; se repasa en la Fase 4 y antes de
cada demo.

Documentación oficial: `docs.vapi.ai/assistants/dynamic-variables`, y la documentación de LiquidJS
para el filtro `date` con zona horaria.
