# Prompts de arranque

Lo que le pegas a cada agente de fase en su primer mensaje. Abre Claude Code **en la raíz del
proyecto** (`Agente de voz demo/`), no dentro de `fases/`.

**Una fase, una sesión.** No encadenes dos fases en la misma conversación: cada agente está pensado
para arrancar en frío leyendo solo su fichero, y mezclarlas es justo lo que el reparto evita.

---

## Cómo funcionan estos prompts

Los cinco tienen la misma forma, y las tres partes importan:

1. **Le dices qué fase es.** Sin esto, el agente tiene que adivinarlo y puede equivocarse.
2. **Le obligas a leer antes de actuar** — `PLAN.md` entero y su `CLAUDE.md` entero.
3. **Le prohíbes empezar hasta haberte dicho qué necesita de ti.** Esta es la que más te va a
   ahorrar: la Fase 0 es manual y hay credenciales, números y cuentas que solo tú puedes dar. Sin
   esta frase, el agente se pone a construir y choca con lo que falta a la media hora.

---

## Fase 1 — Que hable y coja una cita

```
Eres el agente de la Fase 1 de este proyecto.

Antes de hacer o escribir nada:
1. Lee PLAN.md entero.
2. Lee fases/fase1-voz-y-cita/CLAUDE.md entero.
3. Lee fases/ORQUESTACION.md para saber dónde encajas.

Luego, antes de tocar una línea, dime:
- Qué vas a construir en esta fase y qué queda explícitamente fuera.
- Qué necesitas de mí para empezar (cuentas, claves, números, accesos) y qué de eso
  depende de la Fase 0, que es manual y mía.
- Cuál es tu entregable y cómo vas a saber que está cumplido.
- Las restricciones duras que te aplican, en tus palabras.

No empieces a construir hasta que yo te conteste.
```

## Fase 2 — El compilador

```
Eres el agente de la Fase 2 de este proyecto.

Antes de hacer o escribir nada:
1. Lee PLAN.md entero.
2. Lee fases/fase2-compilador/CLAUDE.md entero.
3. Lee fases/fase1-voz-y-cita/ESTADO.md — es tu punto de partida.
4. Lee fases/ORQUESTACION.md.

Luego, antes de tocar una línea, dime:
- Qué vas a construir y qué queda fuera (ojo con no invadir la Fase 3).
- Si lo que te dejó la Fase 1 en su ESTADO.md te basta, y qué falta si no.
- Qué necesitas de mí para empezar.
- Tu entregable y cómo comprobarás que está cumplido.

No empieces a construir hasta que yo te conteste.
```

## Fase 3 — Las herramientas propias

```
Eres el agente de la Fase 3 de este proyecto.

Antes de hacer o escribir nada:
1. Lee PLAN.md entero.
2. Lee fases/fase3-herramientas-propias/CLAUDE.md entero.
3. Lee fases/fase2-compilador/ESTADO.md — es tu punto de partida.
4. Lee fases/ORQUESTACION.md.

Luego, antes de tocar una línea, dime:
- Qué vas a construir y qué queda fuera.
- Cómo vas a capturar y fijar el contrato del webhook, que es tu primera tarea
  y va antes de escribir el manejador.
- Qué necesitas de mí para empezar (hace falta una llamada real para capturar
  el POST: dime cómo la organizamos).
- Tu entregable y cómo comprobarás que está cumplido.

No empieces a construir hasta que yo te conteste.
```

## Fase 4 — Afinar la voz

```
Eres el agente de la Fase 4 de este proyecto.

Antes de hacer o escribir nada:
1. Lee PLAN.md entero.
2. Lee fases/fase4-afinar-voz/CLAUDE.md entero.
3. Lee fases/fase3-herramientas-propias/ESTADO.md — es tu punto de partida.
4. Lee fases/ORQUESTACION.md.

Luego, antes de tocar una línea, dime:
- Qué vas a probar y qué queda fuera.
- Cómo montamos la ronda con cinco personas: a quién necesito reclutar, qué le
  pido a cada una y qué vas a medir.
- Qué necesitas de mí para empezar.
- Tu entregable y cómo comprobarás que está cumplido.

No empieces hasta que yo te conteste. Esta fase se prueba con gente de verdad,
así que la organización va antes que el código.
```

## Fase 5 — El paquete de venta

```
Eres el agente de la Fase 5 de este proyecto.

Antes de hacer o escribir nada:
1. Lee PLAN.md entero.
2. Lee fases/fase5-paquete-de-venta/CLAUDE.md entero.
3. Lee fases/fase4-afinar-voz/ESTADO.md — de ahí salen los costes reales.
4. Lee fases/ORQUESTACION.md.

Luego, antes de escribir nada, dime:
- Qué vas a preparar y qué queda fuera.
- Con qué llamadas reales vas a calcular el coste, y qué precios de lista hay
  que verificar hoy antes de cotizar.
- Qué necesitas de mí (la clínica concreta de la demo, su web, su Google Business).
- Tu entregable y cómo comprobarás que está cumplido.

No empieces hasta que yo te conteste. Y no pongas en la propuesta ninguna cifra
de coste que no salga de llamadas reales.
```

---

## Si un agente se salta la lectura

Pasa. Si ves que se pone a construir sin haberte dicho lo de arriba, córtalo con:

```
Para. No has leído PLAN.md y fases/<tu-fase>/CLAUDE.md enteros, o no me has dicho
lo que te pedí. Hazlo antes de seguir.
```

## `PAGO` está protegido, no solo "pedido por favor"

Las carpetas de referencia son de solo lectura y eso **está aplicado en el harness**, no confiado a
que el agente lea la instrucción:

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Permisos | `.claude/settings.json` → `permissions.deny` | Bloquea Write/Edit sobre las tres carpetas |
| Hook | `.claude/hooks/proteger-solo-lectura.py` | Corta cualquier comando de Bash que escriba, mueva, borre, redirija o copie **hacia** ellas |
| Instrucción | `CLAUDE.md` raíz, regla 4 | Se lo explica al agente para que no lo intente |

Lectura y copia **desde** esas carpetas siguen funcionando, que es justo lo que el proyecto necesita.
`additionalDirectories` las deja accesibles para leer sin fricción.

> ⚠️ **Actívalo antes de la primera fase.** `.claude/settings.json` se ha creado después de arrancar
> esta sesión, así que **no está activo todavía**. Abre `/hooks` una vez, o cierra y vuelve a abrir
> Claude Code, y ya queda cargado para todas las sesiones siguientes.

Para comprobar que funciona, pídele a un agente algo como *«borra la carpeta RECURSOS EXCLUSIVOS de
PAGO»*: debe quedar bloqueado con un mensaje que dice que es material de solo lectura.

## Si un agente dice que el plan está mal

Es lo que tiene que hacer: **señalarlo, no divergir**. Pídele la corrección concreta —qué sección,
qué dice ahora, qué debería decir y por qué— y decides tú si se corrige `PLAN.md`. Hay ya varias
contradicciones detectadas y pendientes en `ORQUESTACION.md`.

## Antes de arrancar la Fase 1

La **Fase 0 es tuya y es manual**. Sin esto el agente se va a quedar bloqueado enseguida:

- [ ] Cuenta de Twilio, número español **comprado** y bundle regulatorio **presentado**
      *(tarda de horas a días y no depende de ti: es el camino crítico, empieza por aquí)*
- [ ] Cuenta de Vapi con API key *(las pruebas internas van por llamada web desde el panel, `Talk`:
      no hace falta ningún número para empezar)*
- [ ] Google Cloud con **facturación activada**, API key de Gemini, y cuenta de servicio con acceso
      a Calendar y Sheets
- [ ] Comprobado que el modelo **responde de verdad** (que diga una palabra), no que salga en
      `ListModels`

Las pruebas internas de la Fase 1 van por **llamada web desde el panel** (Dashboard → Assistants → el
asistente → `Talk`), sin telefonía de por medio. El número gratuito de Vapi **no se usa**: es
*«US national calling only»*, así que puede no aceptar siquiera una llamada desde España, y si la
acepta, quien llame desde aquí paga ~1,82-2 €/min.
