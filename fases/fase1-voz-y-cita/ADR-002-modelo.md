# ADR-002: Modelo del asistente — `gemini-3.5-flash`, con respaldo manual

**Estado:** Aceptada
**Fecha:** 24 de septiembre de 2026
**Decide:** el humano. La elección de modelo venía del §3 de `PLAN.md`; lo que esta ADR cierra es
**qué quedó activo y qué respaldo hay de verdad**
**Fase:** 1

---

## Contexto

El §3 del plan elige `gemini-3.5-flash` con facturación de Google activa, y avisa de dos trampas que
ya habían costado una tarde en la V1:

> *«Google jubila modelos sin avisar y `ListModels` sigue listándolos. **Estar en la lista no es poder
> usarlo.**»*

> *«Los modelos `preview` en plan gratuito son 5 peticiones/minuto y 20 al día. Una llamada gasta una
> petición **por frase**. A la cuarta o quinta, Google devuelve `429` y el bot se queda mudo. **No es
> un modelo lento: es un modelo agotado.**»*

Y fija un catálogo de respaldo: `gemini-2.5-flash` → `gemini-2.5-flash-lite`.

**Al verificar el 23-sep pidiéndole una palabra a cada modelo, el catálogo de respaldo estaba muerto
entero:**

| Modelo | Respuesta real contra Google |
| --- | --- |
| `gemini-3.5-flash` | **`listo`** |
| `gemini-2.5-flash` | `404 NOT_FOUND — no longer available to new users` |
| `gemini-2.5-flash-lite` | `404 NOT_FOUND — no longer available to new users` |
| `gemini-2.5-pro` | `404 NOT_FOUND — no longer available to new users` |
| `gemini-3.1-flash-lite` | **`listo`** |
| `gemini-3-flash-preview` | Contesta, pero es `preview`: **prohibido** por el §3 y el §9 |

Y la trampa se repitió un nivel más arriba: **`docs.vapi.ai/providers/model/gemini` sigue publicando
los tres modelos jubilados como disponibles.** El plan avisaba de que la lista de Google miente;
resulta que la de Vapi también.

Segundo hallazgo, este peor: **Vapi no tiene respaldo automático de modelo.** Rechaza con
`400 — property should not exist` los campos `model.fallbackModels`, `model.fallbackPlan` y
`modelFallbackPlan`. `fallbackPlan` existe **solo** para `voice` y para `transcriber`.

## Decisión

**Modelo activo: `gemini-3.5-flash`, `provider: "google"`, `temperature: 0.3`.**

**Respaldo: `gemini-3.1-flash-lite`, y el cambio es MANUAL.** No hay configuración que lo haga solo.
Si el modelo cae, alguien tiene que hacer:

```
PATCH /assistant/2de1097d-fc5e-4684-b2ed-2c5399ef9368
{"model": {"provider":"google","model":"gemini-3.1-flash-lite","temperature":0.3,
           "messages":[...el prompt entero...],"toolIds":[...los tres...]}}
```

> ⚠️ El objeto `model` hay que mandarlo **completo**: los `PATCH` de Vapi **reemplazan** los objetos
> anidados en lugar de fusionarlos. Mandar solo `{"model":{"model":"..."}}` borra el prompt y las
> herramientas, devuelve `200 OK`, y deja el bot mudo sin un solo error.

## Opciones consideradas

### Opción A: `gemini-3.5-flash` ← **elegida**

| Dimensión | Valoración |
| --- | --- |
| Disponibilidad | Verificada: contesta |
| Coste | ~0,02 $/min según el §10; el real medido fue ~0,11 $/min **todo incluido** (modelo + voz + transcripción + plataforma) |
| Calidad en llamada | Probada: entendió motivos implícitos («carillas» → estética), calculó fechas relativas bien y llamó a las herramientas con los argumentos correctos |
| Riesgo | El que tiene cualquier modelo de Google: que lo jubilen sin avisar |

**A favor:** es la elección del plan, está viva, y se comportó bien en llamada real.
**En contra:** ninguna detectada.

### Opción B: `gemini-3.1-flash-lite`

| Dimensión | Valoración |
| --- | --- |
| Disponibilidad | Verificada: contesta |
| Coste | Menor (es `lite`) |
| Calidad en llamada | **Sin probar** |
| Riesgo | Al ser `lite`, más probable que improvise o siga peor el prompt |

**A favor:** el único respaldo vivo que Vapi acepta.
**En contra:** no se ha probado en llamada. Si hay que bajar a él en una urgencia, se baja a ciegas.

### Opción C: `gemini-3.6-flash` o `gemini-3.5-flash-lite`

Los recomienda **el propio mensaje de error de Google** al pedir los modelos jubilados, y los dos
contestan. **Pero Vapi no los acepta**: no están en su catálogo. Descartados por eso, no por calidad.

### Opción D: `gemini-3-flash-preview`

Contesta. **Descartada de plano:** es `preview`, y la primera fila de la tabla de riesgos del §9
prohíbe `preview` en producción o demo por el límite de 5 peticiones/minuto.

## Análisis de la decisión

La elección de modelo no estaba en duda: el plan ya la había hecho y la verificación la confirmó.
**Lo que esta ADR resuelve es el respaldo**, y ahí la conclusión incómoda es que hay menos de lo que
el plan creía:

- Cruzando *«lo que Vapi acepta»* × *«lo que Google todavía sirve»* × *«no `preview`»*, quedan
  **dos modelos en total**. El catálogo no es una lista de seis con margen de sobra: son dos.
- Y ese respaldo **no es un plan, es un procedimiento**. La diferencia importa: un respaldo
  configurado actúa en milisegundos y sin nadie delante; un procedimiento manual necesita que alguien
  esté mirando, diagnostique bien y tenga el cuerpo del `PATCH` a mano. **En mitad de una demo con una
  clínica delante, eso no pasa.**

De ahí la consecuencia operativa que sí es una decisión nueva: **verificar el modelo el mismo día de
cada demo deja de ser buena costumbre y pasa a ser obligatorio**, porque no hay red debajo.

## Consecuencias

**Lo que queda más fácil**
- Nada. Esta ADR no facilita: documenta un margen más estrecho del que se creía.

**Lo que queda más difícil**
- **No hay recuperación automática si Gemini falla a mitad de llamada.** El bot se queda mudo hasta
  que una persona intervenga.
- **El catálogo caduca solo, y rápido:** tres modelos se jubilaron sin que el plan se enterara, y la
  documentación de Vapi sigue anunciándolos. Cualquier agente de fase posterior que se fíe de la
  lista del plan o de la de Vapi va a probar modelos muertos **justo cuando algo va mal**.
- La skill `verificar-modelo-gemini` lleva el catálogo viejo en su texto. Mientras no se corrija
  `PLAN.md` §3, la skill sigue mandando bajar a dos modelos que dan `404`.

**Lo que hay que revisar**
- **Probar `gemini-3.1-flash-lite` en una llamada real** antes de necesitarlo. Un respaldo sin probar
  no es un respaldo.
- Re-verificar el catálogo **al empezar cada fase**, no una vez al principio del proyecto.
- Vigilar si Vapi añade `gemini-3.6-flash` a su catálogo: es el sucesor que Google recomienda.

## Tareas

1. [x] Verificar que `gemini-3.5-flash` contesta de verdad, no que salga en una lista
2. [x] Verificar los dos respaldos del plan — **los dos dan `404`**
3. [x] Encontrar el respaldo vivo (`gemini-3.1-flash-lite`) y verificarlo
4. [x] Comprobar si Vapi admite respaldo automático de modelo — **no lo admite**
5. [x] Confirmar en llamada real que Vapi consigue invocar el modelo (llamada del 24-sep)
6. [ ] **Corregir `PLAN.md` §3 y §9** con la cadena de respaldo real y con que el cambio es manual
       *(propuestas 2 y 3 de `ESTADO.md`, pendientes de aprobación del humano)*
7. [ ] Corregir el catálogo de la skill `verificar-modelo-gemini` cuando se apruebe lo anterior
8. [ ] Probar `gemini-3.1-flash-lite` en una llamada, para no bajar a ciegas
