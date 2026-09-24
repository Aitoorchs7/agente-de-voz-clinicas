---
name: verificar-modelo-gemini
description: Comprueba que el modelo de Gemini del agente de voz CONTESTA de verdad antes de abrir el teléfono, y baja por el catálogo de respaldo si no. Úsala siempre antes de una tanda de llamadas de prueba, antes de cualquier demo con un cliente, y en cuanto el bot escuche bien pero no diga una palabra o suelte que tiene un problema técnico. Úsala también cuando se hable de cuota, de 429, de modelo jubilado, de "el bot se ha quedado mudo", o cuando alguien vaya a elegir o cambiar el modelo del asistente de Vapi. Proyecto "Agente de voz para clínicas dentales", Fase 1.
---

# Verificar el modelo de Gemini

## Por qué existe esta skill

Hay dos fallos que se parecen desde fuera —el bot escucha bien y no dice nada— y que tienen causas
opuestas. Los dos están en la tabla de riesgos del `PLAN.md` (§9) porque ya costaron una tarde:

- **Modelo jubilado.** Google retira modelos sin avisar y `ListModels` los sigue listando. *Estar en
  la lista no es poder usarlo.* El bot no dice una palabra, nunca, desde la primera frase.
- **Cuota agotada.** Los modelos `preview` en plan gratuito son 5 peticiones/minuto y 20 al día, y
  una llamada gasta una petición **por frase**. A la cuarta o quinta, Google devuelve `429`. *No es
  un modelo lento: es un modelo agotado.*

La diferencia importa porque la solución es distinta: uno se arregla cambiando de modelo, el otro
activando facturación. Y los dos se ven **solo en el registro**, así que si no se mira el registro,
se diagnostica al revés.

Comprobar esto cuesta segundos. Descubrirlo en mitad de una demo con una clínica delante cuesta la
venta.

## El catálogo

Modelos que Vapi acepta con `provider: "google"`:

`gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-2.5-pro`,
`gemini-2.5-flash`, `gemini-2.5-flash-lite`

> ⚠ **Esa lista es la que publica Vapi, y miente.** Verificado el 23-sep-2026: `gemini-2.5-flash`,
> `gemini-2.5-flash-lite` y `gemini-2.5-pro` devuelven `404 — no longer available to new users`. **La
> trampa de esta skill se aplica también al catálogo del proveedor, no solo a `ListModels`.**
> Y esta lista también caduca: **re-verifícala, no te fies de ella.**

**Elección del proyecto y orden de respaldo**, del §3 del plan:

1. `gemini-3.5-flash` ← el elegido
2. `gemini-3.1-flash-lite` ← **el único respaldo vivo**

No hay tercero. Quedan **dos** modelos usables en total.

**Nunca un modelo `preview` en producción ni en una demo.** Es la primera fila de la tabla de
riesgos. En el catálogo de arriba, `gemini-3-flash-preview` queda descartado por esto.

## Cómo verificar

1. **Pide una palabra por el camino real.** Manda una petición mínima al modelo *a través de la
   configuración que usará la llamada* (`provider: "google"` en Vapi), no contra la API de Google por
   tu cuenta. Lo que se verifica es el camino entero, no que la API de Google esté viva: una API key
   válida con un modelo que Vapi no puede invocar deja el teléfono igual de mudo.

2. **Interpreta lo que vuelve.** Distingue los tres casos, porque llevan a sitios distintos:

   | Lo que vuelve | Qué es | Qué se hace |
   | --- | --- | --- |
   | Una palabra | Funciona | Seguir |
   | Error de modelo no encontrado / no disponible | **Modelo jubilado** | Bajar al siguiente del catálogo |
   | `429` o mención de cuota | **Cuota agotada** | Comprobar que la facturación está activa; si lo está, mirar límites de la cuenta. **No** bajar de modelo: el problema no es el modelo |
   | Silencio o timeout | Indeterminado | Reintentar una vez; si repite, tratar como jubilado y decirlo |

3. **Si toca bajar, baja en orden** y vuelve al paso 1 con el siguiente. Si se agota el catálogo,
   para y dilo: no hay modelo, no hay demo. Con solo dos modelos vivos, el catálogo se agota rápido.

   > **Bajar de modelo es MANUAL.** Vapi no tiene respaldo automático de modelo: rechaza
   > `model.fallbackModels`, `model.fallbackPlan` y `modelFallbackPlan`. Se hace con
   > `PATCH /assistant/{id}` mandando el objeto `model` **completo** — provider, model, temperature,
   > `messages` con el prompt entero y `toolIds`. Si lo mandas a medias, Vapi **reemplaza** el objeto
   > anidado, te borra el prompt y las herramientas, y devuelve `200 OK`. El bot se queda mudo y nada
   > da error. Por eso esta skill se pasa **antes** de la demo y no durante.

4. **Déjalo en el registro, siempre.** Aunque salga bien. Qué modelo se pidió, qué respondió cada
   uno, cuál quedó activo, y la hora. El registro es lo único que permite diagnosticar el fallo de
   mañana, y si hoy no escribes la línea buena, mañana no la tienes.

5. **Si el modelo activo ya no es el elegido, dilo alto.** Que el bot funcione con el segundo
   respaldo es una noticia, no un detalle: significa que el catálogo se está quedando corto y que
   alguien tiene que revisar la configuración del asistente.

## Lo que esta skill no hace

- **No cambia el prompt.** Si el bot contesta pero improvisa, eso no es un fallo de verificación. El
  §3 del plan es explícito: *«Si el bot empieza a improvisar pese al prompt, la alternativa no es
  tocar el prompt: es cambiar de modelo.»* Cambia de modelo y vuelve a verificar.
- **No activa facturación** ni toca la cuenta de Google Cloud. Eso es trabajo manual de la Fase 0.
  Si detectas que la facturación no está activa, **para y dilo**: sin ella, cualquier prueba larga
  va a devolver `429` y vas a diagnosticar mal todo lo que venga después.

## Cuándo volver a pasarla

- Antes de cada tanda de llamadas de prueba.
- **Antes de cada demo con un cliente**, sin excepción.
- Después de cambiar el modelo del asistente.
- Cuando el bot se quede mudo, antes de tocar ninguna otra cosa.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §3 (*«Sobre el modelo de Gemini — la trampa que ya
nos costó una tarde»*) y §9 (tabla de riesgos). Dueña: **Fase 1**, pero la usan todas las fases.

Documentación oficial a consultar si algo no cuadra —y **antes** de fiarte de la lista de modelos de
arriba, que caduca—: `docs.vapi.ai/providers/model/gemini`.

Material previo sobre esta misma trampa, ya peleada:
`C:\Users\chica\Desktop\Bot Clinica Demo V1\5 Decisiones\D1 - Que modelo, que voz, que de todo.md`
