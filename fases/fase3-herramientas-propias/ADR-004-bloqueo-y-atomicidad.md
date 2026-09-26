# ADR-004: El bloqueo temporal de horas y la atomicidad de `crear_cita`

**Estado:** Aceptada
**Fecha:** 26 de septiembre de 2026
**Decide:** el agente de la Fase 3, dentro de lo que fijan `PLAN.md` §6 y §9 y las decisiones del humano
del 25-sep (Redis de Upstash en la UE) y del 26-sep (tras la llamada 1)
**Fase:** 3 (la Fase 4 cuelga llamadas a mitad de agendar: le afecta la caducidad)

---

## Contexto

El entregable de la fase es *«dos llamadas a la vez sin pisarse»*: dos personas piden la misma hora al
mismo tiempo y solo una se la lleva. Las herramientas nativas de Vapi no pueden hacerlo: comprueban un
rango libre/ocupado y nada más.

La plantilla de reservas del curso resuelve esto con un registro temporal al consultar que se borra al
confirmar. El patrón vale; su almacén no: lo guarda en Airtable, **sin caducidad** y con una **carrera
entre buscar y crear** (dos llamadas ven la hora libre y la bloquean las dos).

Condiciones de este proyecto:

- Las herramientas corren en Vercel: **sin memoria compartida** entre peticiones ni entre instancias.
- Cada herramienta es un turno del modelo con el paciente esperando: cada viaje de red cuenta.
- `crear_cita` escribe en **dos sitios** que no comparten transacción: Google Calendar y la hoja.
- Una llamada se puede cortar en cualquier momento, también a mitad de `crear_cita`.

## Decisión

1. **El bloqueo vive en Redis (Upstash, `eu-west-1`) y se toma en UNA operación atómica** (un script
   Lua). Cada bloqueo es un intervalo `[inicio, fin)` de un calendario (un gabinete) en un día, con el ID
   de la llamada. El script borra los caducados, mira si el intervalo pisa uno vivo de **otra** llamada y,
   si no, lo apunta. Nadie se puede meter entre mirar y apuntar. `src/bloqueo/bloqueos.ts`.
2. **Caduca a los 4 minutos desde la última herramienta de esa llamada.** Cada herramienta lo renueva.
   Y se suelta en el acto: al crear la cita, al elegir una de las dos horas ofrecidas (la otra queda
   libre), al volver a consultar y **al colgar** (`end-of-call-report`). La caducidad solo actúa si se
   pierde el aviso de fin de llamada.
3. **`consultar_huecos` reserva lo que ofrece.** Calcula los huecos (horario, duración entera dentro del
   tramo, calendario del gabinete) y pide a Redis los dos primeros que no choquen, en el orden en que se
   quieren ofrecer. Lo que ofrece ya es suyo.
4. **`crear_cita` es una saga con compensación, bajo un candado por llamada:**
   - comprueba a la vez que el bloqueo sigue siendo suyo (si caducó, lo intenta retomar) y que nadie ha
     ocupado esa hora a mano en el calendario;
   - crea el evento en Calendar con un **ID determinista** (llamada + calendario + hora): si se repite,
     encuentra el mismo evento y no hace otro;
   - escribe la fila en `Citas` (sin duplicar por `id_evento`);
   - si la hoja falla, **borra el evento** y le dice al bot que la cita NO está creada.
   - Solo si las dos cosas salen bien devuelve «Cita creada». Si Vapi reintenta, contesta lo mismo.
5. **Al colgar, bajo el mismo candado de la llamada,** se buscan los eventos de esa llamada (propiedad
   privada `id_llamada`) que no tengan fila en `Citas` y se borran: un evento huérfano de una función que
   murió entre Calendar y la hoja. El candado impide borrar uno que se está creando en ese instante.
6. **La hoja se escribe con su propio candado por pestaña**, calculando la fila libre (nunca `append`),
   en `RAW` y comprobando lo que Google dice que ha quedado guardado.

## Consecuencias

- **Dos llamadas a la vez por la misma hora: una se la lleva.** Probado sin red y contra Upstash de
  verdad: diez reservas simultáneas del mismo hueco, una gana.
- **Una llamada que cuelga a mitad libera su hora en el acto** (llamada 3, 26-sep: otra llamada pidió esa
  hora justo después y le dijo «Libre»). Si el aviso de fin de llamada se perdiera, tardaría **4 minutos**.
  → **Fase 4:** si cuelga una llamada a mitad y otra pide la misma hora en esos minutos, y el aviso no ha
  llegado, la segunda no la verá libre. Es lo esperado, no un fallo.
- Redis guarda datos de la llamada (la ficha con nombre y teléfono) durante dos horas como mucho y se
  borran al colgar. Con pacientes reales, Upstash tiene que entrar en el contrato de encargado del
  tratamiento; en la demo todo es ficticio.
- Hay un servicio más que puede fallar. Si Redis no responde, la herramienta devuelve el texto de fallo
  técnico y el bot sigue el apartado «si algo falla» del prompt: nunca da una cita sin bloqueo.
- Las horas que ve el paciente no incluyen las reservadas por otras llamadas en curso: se le ofrecen otras.

## Alternativas descartadas

- **Airtable o la propia hoja como almacén de bloqueos** (la plantilla): sin atomicidad ni caducidad.
- **Un evento «provisional» en Calendar como bloqueo:** crear y borrar eventos en la agenda de la clínica
  a cada consulta, visible para recepción, y sin forma atómica de «crear solo si no hay otro».
- **Memoria del proceso:** en Vercel cada petición puede ir a una instancia distinta.
- **Sin bloqueo, comprobando solo al crear:** la segunda persona se entera de que no hay hora después de
  haber dado todos sus datos.
