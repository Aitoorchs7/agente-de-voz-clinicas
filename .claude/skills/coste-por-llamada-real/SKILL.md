---
name: coste-por-llamada-real
description: Calcula el coste por llamada del agente de voz a partir de las llamadas reales de la pestaña Llamadas y de los precios de lista verificados el mismo día, y se niega a usar las cifras orientativas del plan en una propuesta. Úsala siempre que haya que cotizar, poner un precio, calcular márgenes, estimar el coste mensual del bot, responder "cuánto cuesta esto", o preparar una propuesta comercial para una clínica. Proyecto "Agente de voz para clínicas dentales", Fase 5.
---

# El coste por llamada, con llamadas de verdad

## Antes de nada: el §10 tiene un error de 3× que hay que conocer

La tabla del `PLAN.md` §10 suma bien —2 + 15 + 70 + 28 + 14 + 56 = **185 €/mes**— pero la cifra por
llamada que escribe debajo **está mal etiquetada**. Sobre el volumen que el propio §10 fija (500
llamadas de unos 3 minutos ≈ 1.500 minutos):

| Operación | Resultado |
| --- | --- |
| 185 € ÷ **500 llamadas** | **0,370 € por llamada** |
| 185 € ÷ **1.500 minutos** | **0,1233 € por minuto** |

El plan dice *«≈ 0,12 € por llamada»*, que es la cifra **por minuto** con la etiqueta equivocada.

No lo repitas, ni siquiera como referencia orientativa: si en una reunión alguien divide 185 entre
500, el número no te va a cuadrar delante del cliente. Está señalado en `fases/ORQUESTACION.md`
para que se corrija en `PLAN.md`; hasta que se corrija, la cifra orientativa buena es **≈0,37 € por
llamada de tres minutos**.

Esto es también un recordatorio de por qué existe esta skill: una cifra heredada sin recalcular se
propaga y nadie la vuelve a mirar.

## La regla que ordena esta skill

Dicho lo anterior, el §10 acierta en lo importante, que es qué hacer con sus propios números:

> *«Un número para orientarse, **no para poner en una propuesta**: los precios se verifican en
> vapi.ai/pricing y en Twilio antes de cotizar, y se recalculan con llamadas reales al final de la
> fase 4, donde el `end-of-call-report` ya trae el coste real de cada una.»*

Así que: **las cifras del §10 no van en una propuesta.** Sirven para saber si el negocio tiene
sentido, no para cotizarle a una clínica. Si alguien te pide el número sin que haya llamadas reales
detrás, dilo en voz alta en vez de repetir el 0,12 €: un precio equivocado en una propuesta no es un
bug, es una conversación incómoda con un cliente y, si va por lo bajo, un servicio que pierde dinero
en cada llamada.

## De dónde salen los números buenos

### 1. Las llamadas reales

La pestaña **`Llamadas`** de la hoja, que el `end-of-call-report` rellena sola al colgar con fecha,
duración, teléfono, resumen, transcripción, motivo de fin y **coste** (§4, §6).

Ese coste es el que Vapi cobró de verdad por esa llamada. No hay mejor fuente y no hace falta
estimarla.

### 2. Los precios de lista, verificados hoy

Del §10, y es una exigencia explícita: **`vapi.ai/pricing` y Twilio antes de cotizar**. Añade los
del resto de la cadena: Gemini, Deepgram y el proveedor de TTS que se eligió en la Fase 1.

Los precios cambian. Un cálculo de hace seis meses metido en una propuesta de hoy es un error que se
descubre facturando.

## Cómo se calcula

1. **Saca las llamadas reales** de la pestaña `Llamadas`: coste y duración de cada una.

2. **Descarta lo que no cuenta**: llamadas cortadas a los dos segundos, pruebas de configuración,
   llamadas donde el bot estaba roto. Y **di cuáles descartaste y por qué**. Una media que incluye
   veinte llamadas de un segundo no dice nada.

3. **Calcula coste medio por llamada y por minuto**, y di **cuántas llamadas** sostienen el número y
   **de qué fechas** son. Diez llamadas no son una muestra: dilo tal cual en vez de dar un número
   con tres decimales que aparenta una precisión que no tiene. Da también el rango (la más barata y
   la más cara), que para cotizar es más útil que la media sola.

4. **Comprueba que la duración media se parece a la real.** El §10 proyecta sobre llamadas de unos
   3 minutos. Si las tuyas duran 5, la proyección se va casi el doble.

5. **Proyecta a volumen.** La referencia del §10 son 500 llamadas/mes ≈ 1.500 minutos. Desglosa por
   concepto —número, minutos entrantes, plataforma Vapi, modelo, STT, TTS— para poder explicar de
   dónde sale cada euro cuando te pregunten.

6. **Suma las dos notas que cambian la cuenta** (§10):
   - Cada línea concurrente por encima de la décima son **10 $/mes**.
   - El modo HIPAA son **1.000 $/mes** — *no aplica aquí; en España el marco es el RGPD*. Menciónalo
     solo si alguien pregunta por cumplimiento, y con esa aclaración.

7. **Ponle fecha de caducidad al resultado.** Qué día verificaste los precios y cuándo hay que
   rehacerlo. Sin eso, el número sobrevive al cambio de tarifas y acaba en una propuesta.

## Lo que no se hace

- **No se inventa una cifra** para rellenar un hueco de la propuesta. Si faltan llamadas reales, el
  resultado es «faltan llamadas reales», no una estimación con cara de dato.
- **No se convierte el coste en precio.** El coste es lo que te cuesta a ti; el precio es una
  decisión comercial que incluye tu trabajo, el alta, el soporte y el margen. Esta skill da lo
  primero. Mezclarlos es como acabas cobrando 0,12 € por llamada.
- **No se cotiza el número de EE. UU.** No se usa: es *«US national calling only»* y las pruebas
  internas van por llamada web desde el panel (`Talk`). Si alguien lo llamara desde España pagaría
  ~1,82-2 €/min de su bolsillo (§9). No entra en ninguna cuenta.

## Lo que sí conviene decir en la propuesta

Que el coste de la **demo** es de unos pocos euros: número, un puñado de llamadas y créditos de
prueba (§10). Quita presión a la primera reunión.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §10 (*«Costes»*, con la advertencia sobre no usar
esas cifras en una propuesta), §4 y §6 (la pestaña `Llamadas` y el `end-of-call-report`). Dueña:
**Fase 5**; depende de que la Fase 3 esté escribiendo el coste en la hoja y de que la Fase 4 haya
dejado llamadas reales.

Fuentes de precios a verificar el día del cálculo: `vapi.ai/pricing`, Twilio, Google (Gemini),
Deepgram y el proveedor de TTS.
