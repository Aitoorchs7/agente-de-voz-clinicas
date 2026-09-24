# Skills propias de la Fase 1 — ya creadas

Estas dos skills cubren huecos específicos del proyecto que ninguna skill instalada resolvía. **Ya
están creadas** y viven en `.claude/skills/` en la raíz del repo, así que se cargan solas cuando
hacen falta.

| Skill | Ruta | Dónde se usa en el entregable |
| --- | --- | --- |
| `verificar-modelo-gemini` | `.claude/skills/verificar-modelo-gemini/SKILL.md` | Antes de cada tanda de pruebas y de cada demo. Cubre dos filas de la tabla de riesgos del §9 («Cuota de Gemini», «Modelo jubilado sin aviso») y el último punto de la Fase 0 |
| `configurar-asistente-vapi` | `.claude/skills/configurar-asistente-vapi/SKILL.md` | Puntos 1, 2 y 3 del entregable: crear el asistente, colgarlo del número de pruebas, y **pasarlo al número español de Twilio** |

## Qué hace cada una

### `verificar-modelo-gemini`

Comprueba que el modelo **contesta de verdad** —pidiéndole una palabra por el camino real de Vapi—
antes de abrir el teléfono, y baja por el catálogo de respaldo (`gemini-3.5-flash` →
`gemini-3.1-flash-lite`, que son los dos únicos vivos: los `2.5` están jubilados) si no responde. Distingue los dos fallos que se
parecen y no son lo mismo: **modelo jubilado** (no responde nunca) y **cuota agotada** (`429` a la
cuarta o quinta frase). Deja el resultado en el registro, que es el único sitio donde se ve.

No cambia el prompt ni activa facturación: si detecta que la facturación no está activa, para y lo
dice, porque sin ella cualquier prueba larga devuelve `429` y se diagnostica mal todo lo demás.

### `configurar-asistente-vapi`

Crea o actualiza el asistente con los valores que fija el plan (modelo Gemini, voz peninsular,
Deepgram `nova-2` español, `serverMessages`, `analysisPlan`), partiendo del `crear_vapi.json` de
`PAGO` y **verificando el cuerpo contra `docs.vapi.ai`** antes de mandarlo. Sabe cambiar el
asistente de número sin recrearlo, que es la operación que cierra la fase.

Mueve **configuración, no contenido**: no escribe el prompt. En la Fase 1 el prompt es de una pieza
y provisional; a partir de la Fase 2 lo produce el compilador.

## Si las cambias

Están escritas contra `PLAN.md`. Si el plan cambia, cámbialas; si crees que el plan está mal,
señálalo para que se corrija en `PLAN.md` (ver `fases/ORQUESTACION.md`), no diverjas en la skill.

**Pendiente, opcional:** ninguna de las dos se ha pasado todavía por el bucle de evaluación de
`anthropic-skills:skill-creator` (casos de prueba, comparación con y sin skill, revisión). Se puede
hacer cuando se usen de verdad y haya material para juzgarlas.
