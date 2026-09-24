---
name: bloqueo-temporal-citas
description: Implementa y prueba el bloqueo temporal que impide que dos llamadas simultáneas cojan la misma hora — crear registro temporal al consultar, borrarlo al confirmar, caducarlo solo si la llamada se cae — con arnés de prueba de concurrencia. Úsala siempre que se hable de doble reserva, de dos llamadas a la vez, de reservar o confirmar una cita, de huecos que se pisan, o de qué pasa si el paciente cuelga a mitad de agendar. Proyecto "Agente de voz para clínicas dentales", Fase 3.
---

# Bloqueo temporal contra la doble reserva

## El problema

Dos pacientes llaman a la vez. Los dos preguntan por el jueves a las diez. Los dos oyen que está
libre, porque cuando se les preguntó lo estaba. Los dos la confirman. La clínica tiene dos personas
en la puerta a la misma hora y deja de fiarse del sistema — y con razón, porque el fallo no es raro:
es lo que pasa siempre que no hay bloqueo.

Del `PLAN.md` §6, entre los motivos de que las herramientas sean propias y no las nativas de Vapi:

> *«No puede hacer **bloqueo temporal**, y sin bloqueo temporal dos llamadas simultáneas cogen la
> misma hora. Las plantillas de reservas del curso resuelven esto exactamente así —crear un registro
> temporal al consultar y borrarlo al confirmar— y ese patrón se copia tal cual.»*

Y no es un detalle de implementación: **es el entregable de la Fase 3** — *«dos llamadas a la vez sin
pisarse»*.

## El patrón, entero

```
consultar → crear registro temporal → ofrecer alternativas → confirmar → borrar el bloqueo → registrar
```

Paso por paso, con lo que se olvida en cada uno:

1. **Consultar.** Huecos reales según **duración del tratamiento** y **gabinete** — no un free/busy
   genérico. Una limpieza de 45 minutos y una revisión de 30 no caben en el mismo hueco, y la
   ortodoncia va al Gabinete 2. Eso sale de la hoja (`Tratamientos`), no del código.

2. **Crear el registro temporal** sobre las horas que vas a ofrecer, **antes** de decirlas. Si
   bloqueas después de ofrecerlas, has dejado abierta justo la ventana que querías cerrar.

3. **Ofrecer alternativas**: dos o tres opciones, en lenguaje natural. Los huecos bloqueados por
   *otra* llamada no se ofrecen; y no se dice que estén «ocupados», porque puede que en un minuto ya
   no lo estén.

4. **Confirmar**: crear el evento en Calendar y la fila en `Citas`, de forma atómica.

5. **Borrar el bloqueo.** Los tuyos, todos: si ofreciste tres horas y el paciente cogió una, las
   otras dos se liberan **en ese momento**, no cuando caduquen. Una hora retenida sin motivo es un
   hueco que la clínica pierde.

6. **Registrar.**

## Los tres casos que se olvidan

**Que el bloqueo caduque solo.** Si la llamada se cae a mitad —y se cae: la Fase 4 lo prueba a
propósito, colgando mientras el bot confirma— nadie va a ejecutar el paso 5. Sin caducidad, esa hora
queda retenida para siempre y la clínica pierde huecos sin entender por qué.

El plazo tiene dos fuerzas en contra: demasiado corto y el bloqueo expira mientras el paciente
todavía se lo está pensando; demasiado largo y una llamada caída congela una hora media mañana.
Elige pensando en cuánto dura de verdad la parte de la conversación entre «te ofrezco» y
«confirmado», mídelo con llamadas reales, y **déjalo escrito**: la Fase 4 va a chocar con este
número y necesita saberlo.

**Que la confirmación sea atómica.** Si el evento se crea en Calendar y la fila en `Citas` falla —o
al revés— la herramienta devuelve **el motivo del fallo**, no una confirmación a medias. Una cita
que está en un sitio y no en el otro es peor que no tener cita: la clínica deja de fiarse de los
dos sitios a la vez.

**Que el bloqueo respete el horario de la clínica.** Una nativa *«te diría que el domingo a las
cuatro de la mañana está libre»* (§6). Libre y abierto no son lo mismo, y **cerrado y ocupado
tampoco**: son cosas distintas y el paciente nota la diferencia (§5, bloque `30`).

## El arnés de concurrencia

El entregable de la fase pide **dos llamadas de verdad, a la vez, pidiendo la misma hora**. Monta el
arnés para poder repetirlo cuando quieras, porque lo vas a repetir:

- Dos llamadas simultáneas a la misma hora → **una cita, no dos**, y la otra llamada recibe
  alternativas en lenguaje natural sin decir que la hora estuviera «ocupada» de antemano.
- Llamada caída después de bloquear → la hora **vuelve a estar disponible** al caducar el bloqueo.
- Bloqueo caducado mientras el paciente se lo piensa → el bot no confirma sobre un bloqueo muerto:
  vuelve a comprobar antes de crear la cita.
- Dos tratamientos de distinta duración pidiendo horas solapadas.
- Dos tratamientos que van a **gabinetes distintos** a la misma hora → **las dos caben**. Si tu
  bloqueo lo impide, estás bloqueando por hora y no por gabinete, y le estás quitando capacidad a la
  clínica.

Un test unitario con relojes simulados es útil y no sustituye a las dos llamadas: el plan pide
llamadas porque es donde aparecen las latencias reales entre consultar y confirmar.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §6 (*«Por qué `consultar_huecos` es propia y no la
nativa de Vapi»*), §8 (entregable de la Fase 3) y §9 (fila «Dos llamadas, misma hora»). Dueña:
**Fase 3**.

El patrón ya montado y probado, **como arquitectura** (las rutas de campos se verifican contra el
contrato fijado):
`C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\13 - 13. Agente telefónico reservas avanzado\Reserva_restaurante.json`
y `...\10 - 10. Agente de Voz - Profesional - Plantilla\Agente de reservas.json`
