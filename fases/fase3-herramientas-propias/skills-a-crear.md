# Skills propias de la Fase 3 — ya creadas

Estas cuatro skills cubren huecos específicos del proyecto que ninguna skill instalada resolvía.
**Ya están creadas** y viven en `.claude/skills/` en la raíz del repo, así que se cargan solas
cuando hacen falta.

| Skill | Ruta | Dónde se usa en el entregable |
| --- | --- | --- |
| `fijar-contrato-webhook-vapi` | `.claude/skills/fijar-contrato-webhook-vapi/SKILL.md` | **Punto 1, antes de nada** |
| `herramienta-vapi-nueva` | `.claude/skills/herramienta-vapi-nueva/SKILL.md` | Punto 2: las cuatro herramientas en Vercel. Se usa cuatro veces |
| `bloqueo-temporal-citas` | `.claude/skills/bloqueo-temporal-citas/SKILL.md` | Puntos 3 y 4, y **sostiene el entregable entero** |
| `prueba-marca-de-tiempo` | `.claude/skills/prueba-marca-de-tiempo/SKILL.md` | Punto 6: la prueba de las 00:30 |

## Qué hace cada una

### `fijar-contrato-webhook-vapi` — la primera que se usa

Levanta un receptor que no interpreta nada, provoca una `tool-call` real, **guarda el POST crudo
como fixture** en `fixtures/vapi/`, dice explícitamente cuál de las dos formas ha llegado
(`message.toolCalls[0].id` + `.function.arguments`, o **`toolCallList`** con `id`, `name` y
`arguments`), genera los tipos desde el fixture y deja un test que falla si el formato cambia.

Se niega a generar el manejador si no hay fixture: ese es el punto entero. Escribir contra la forma
equivocada no da un error claro, da `undefined` donde esperabas un nombre.

### `herramienta-vapi-nueva`

Monta las **cuatro partes** de una herramienta sin que se olvide ninguna: manejador leyendo por el
contrato fijado, respuesta con la forma `results` / `toolCallId` exacta, **declaración en el
asistente de Vapi** (la que más se olvida: el endpoint funciona, los tests pasan, y el bot nunca la
llama), y test contra el fixture.

Con las reglas del proyecto dentro: el `result` se escribe para ser dicho en voz alta, los errores
devuelven **el problema concreto** y no un `false`, y nunca se afirma que una hora está ocupada si
no consta — distinguiendo **cerrado** (sale de `Horarios`) de **ocupado** (sale de Calendar).

### `bloqueo-temporal-citas`

El patrón entero —consultar → bloquear → ofrecer → confirmar → borrar → registrar— con los tres
casos que se olvidan: que el bloqueo **caduque solo** cuando la llamada se cae, que la confirmación
sea **atómica** entre Calendar y la hoja, y que respete el horario de la clínica.

Incluye el arnés de concurrencia reutilizable, porque *«dos llamadas a la vez sin pisarse»* es
literalmente el entregable. Y un caso que se hace mal a menudo: dos gabinetes distintos a la misma
hora **sí caben**; si tu bloqueo lo impide, estás bloqueando por hora y le quitas capacidad a la
clínica.

### `prueba-marca-de-tiempo`

Comprueba que el filtro de LiquidJS lleva `Europe/Madrid` en **todos** los sitios donde se renderiza
una fecha, prueba la franja 23:00–01:00 con reloj simulado y los dos lados del cambio de horario de
verano, y **exige la llamada real de las 00:30**: las piezas que fallan no son todas tuyas (Vapi
rellenando `{{now}}`, el modelo interpretando, Calendar guardando), así que solo la llamada prueba
la cadena entera.

## Si las cambias

Están escritas contra `PLAN.md`. Si el plan cambia, cámbialas; si crees que el plan está mal,
señálalo para que se corrija en `PLAN.md` (ver `fases/ORQUESTACION.md`), no diverjas en la skill.

**Pendiente, opcional:** ninguna se ha pasado todavía por el bucle de evaluación de
`anthropic-skills:skill-creator`. `fijar-contrato-webhook-vapi` y `herramienta-vapi-nueva` se
prestan bien, porque su salida es verificable contra un fixture.
