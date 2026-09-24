---
name: ensayar-guion-demo
description: Ensaya los seis pasos del guion de la demo de venta con cronómetro, lista de comprobación previa y plan B por cada paso, y verifica que la demo cuenta las tres frases en su orden (la clínica manda, no se inventa nada, la cita aparece de verdad). Úsala antes de cualquier reunión o demo con una clínica, cuando haya que ensayar o preparar la presentación del bot, cuando se hable del guion de venta, de qué enseñar en la reunión, o de qué hacer si la demo falla en directo. Proyecto "Agente de voz para clínicas dentales", Fase 5.
---

# Ensayar el guion de la demo

## Lo que la demo tiene que conseguir

Del `PLAN.md` §0, y conviene leerlo antes de ensayar nada:

> **El criterio de éxito de la demo no es técnico, es comercial.** La clínica tiene que terminar la
> llamada pensando *«esto lo puedo cambiar yo»*. Si termina pensando *«qué bien habla»*, la demo ha
> fallado: una voz bonita la tiene cualquiera, y la competencia la tendrá el mes que viene.

Y las tres frases, **en este orden**:

1. **Que la clínica manda.** *«Esto es el producto.»*
2. **Que no se inventa nada.** *«Esto es lo que quita el miedo.»*
3. **Que la cita aparece de verdad.** *«Esto es lo que cierra.»*

Al ensayar, la pregunta no es «¿ha funcionado todo?». Es **«¿se han contado las tres frases, en
orden?»**. Una demo en la que todo funciona y solo se demuestra que el bot habla bien es una demo
fallida.

## Los seis pasos (§7)

No se rediseñan: se ensayan y se cronometran.

1. **Que llame ella, desde su móvil.** No una grabación, no tu teléfono. Pide cita para una limpieza.
2. **Mientras habla, la pantalla compartida enseña el Calendar.** La cita aparece sola. *Ese es el
   momento.*
3. **Se abre la hoja y se cambia un precio delante de ella.** Se espera. Se vuelve a llamar. El bot
   dice el precio nuevo. → *«Esto lo cambia usted un martes por la mañana y a las once y cinco el bot
   ya lo dice.»*
4. **Se le pide que intente pillarlo.** Que pregunte algo que no está en la hoja. El bot dice que eso
   lo confirma recepción y lo apunta en `Escalados`. → *«No se inventa. Y lo que no sabe, se lo deja
   escrito a usted cada mañana.»*
5. **Se enseña la fila con `público = no`.** Un margen, un coste. → *«Esto está en la misma hoja y el
   bot no lo ha visto nunca. El filtro está antes del bot, no dentro.»*
6. **La pregunta del miedo, antes de que la haga ella:** *«¿y si falla?»* → Se enseña el desvío. Se
   quita delante de ella. El teléfono vuelve a sonar en recepción. Treinta segundos.

## El paso 3 es el que hay que ensayar de verdad

Es el que demuestra la primera frase, y es el único que tiene **un silencio dentro**: el compilador
tarda hasta cinco minutos. Cinco minutos de silencio en una reunión son eternos y es donde una demo
buena se vuelve incómoda.

Dos formas de resolverlo, y conviene decidir cuál usas **antes**:

- **Usar el disparo manual** del compilador. Es inmediato y sigue siendo verdad, pero di que existe
  el bucle automático: *«esto lo he lanzado yo ahora, pero solo se hace cada cinco minutos»*.
- **Esperar de verdad** y usar el rato para los pasos 5 y 6, que no necesitan llamada. Es más
  honesto y más largo.

Cronometra el recorrido entero. Si pasa de veinte minutos, sobra algo.

## Lista de comprobación previa

Repásala **el mismo día**, no la víspera:

- [ ] **El número español de Twilio está activo** y es el que se va a llamar. **Nunca el de EE. UU.**:
      quien lo llame desde España paga ~1,82-2 €/min (§9).
- [ ] **El modelo responde**: pasa `verificar-modelo-gemini`. Un bot mudo delante de un cliente es el
      peor final posible, y es un fallo previsto.
- [ ] **La ficha de *esa* clínica está compilada** y el contador cuadra. *«Una demo genérica no
      vende»* (§7).
- [ ] **Hay al menos una fila con `público = no`** visible y verosímil: sin ella no hay paso 5.
- [ ] **Sabes qué preguntarle al bot que no esté en la hoja**, para el paso 4, y has comprobado que
      responde como debe.
- [ ] **Grabación apagada y datos ficticios** (§9, §12).
- [ ] **Calendar compartido, limpio de citas de prueba viejas** y en la vista del día correcto.
- [ ] **La hoja abierta por la pestaña que vas a enseñar**, con el zoom suficiente para que se lea en
      pantalla compartida.
- [ ] **El desvío preparado** para el paso 6, y sabes cómo se quita.

## Plan B, paso por paso

Cada uno con **una frase que decir**, no solo un arreglo técnico. Lo que hunde una demo no es el
fallo: es el silencio de treinta segundos mientras intentas arreglarlo.

| Si falla | Qué haces | Qué dices |
| --- | --- | --- |
| El bot no coge la llamada | Comprueba el número asignado; llama tú desde otro teléfono | *«Un momento, que compruebo el número»* — y sigue hablando mientras |
| El bot no dice nada | Es modelo o cuota (§9). Cambia al respaldo | *«Esto es justo lo que le contaba del registro: aquí se ve por qué»* — y enséñalo. Un fallo explicado con el registro delante **vende el registro** |
| El compilador no publica | Probablemente el filtro abortó, que es lo correcto | *«Ha parado porque algo en la hoja no cuadraba. Prefiero que pare a que publique un dato que no debe»* — esto **refuerza** el paso 5 |
| La cita no aparece en Calendar | No insistas en directo | Pasa al paso 5 y vuelve luego |
| El bot se inventa algo | No lo tapes | Apúntalo delante de ella y enséñale `Escalados`. Es peor negarlo |
| `429` a mitad de demo | Cuota. Respaldo | Ver «no dice nada» |

## Las dos objeciones

**«Mis pacientes son mayores, no quieren hablar con una máquina.»** La respuesta del §7 no es
discutir: es **el desvío por horario**. *«El bot entra solo cuando no hay nadie: noches, fines de
semana, festivos, o cuando comunica. No sustituye a la recepcionista; coge las llamadas que hoy se
pierden.»* Se empieza ahí y se sube desde ahí.

**«¿Y si falla?»** Es el paso 6, y se hace **antes de que la pregunte ella**. El desvío se quita en
treinta segundos desde la centralita, delante de ella. Del §1: *«Ese botón de pánico es parte del
argumentario de venta, no una nota técnica.»*
Y lo que **nunca** se ofrece: portar el número. *«Una portabilidad tarda semanas y no tiene marcha
atrás.»*

## Lo que no se promete

Del §0: *«No es todavía el producto en producción de esa clínica. No toca su centralita, no porta su
número, no ve sus datos reales de pacientes. Es una réplica fiel corriendo en paralelo.»* Que el
guion no diga lo contrario, ni de pasada.

Y de lo que la clínica puede cambiar sola, se promete exactamente la lista del §4 (precios y
respuestas en `FAQ`, duraciones, `público`, horarios, `trato`, `nombre_bot`) y **nada más**. El
tono, los límites y las barandillas no se editan desde la hoja, por el motivo del §1: *«un martes
por la mañana alguien borra "no des consejo médico" sin saber lo que está haciendo»*.

## Contexto

Fuente de verdad: `PLAN.md` en la raíz del repo, §0 (qué tiene que demostrar la demo), §7 (el guion
entero y las objeciones), §1 (el desvío) y §9 (los fallos previstos). Dueña: **Fase 5**.

Argumentario: `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\07 - 7. eBook cómo vender Automatizaciones\`
y las carpetas `19` a `22` de esa misma ruta (procesos de venta).
Ejemplos de demos grabadas que cerraron: `...\02 - Recursos AILINK\06 - 6. Looms Ganadores - Ejemplos\`
La regla del desvío: `C:\Users\chica\Desktop\Bot Clinica Demo V1\3 Operacion\O2 — Telefonía y número.md`
