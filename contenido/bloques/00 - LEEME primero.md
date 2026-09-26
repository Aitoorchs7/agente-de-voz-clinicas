---
orden: 0
activo: no
titulo: Leeme primero
---

# Cómo funciona esta carpeta

Cada fichero es **un trozo del prompt del asistente**. El compilador (`npm run compilar`) los junta
por el campo `orden`, salta los que tienen `activo: no` y los que empiezan por `_`, rellena los huecos
con la hoja de la clínica y publica el resultado en Vapi. Este fichero lleva `activo: no`: no entra.

**Aquí se escribe cómo es el bot. Lo que sabe va en la hoja** (PLAN.md §1). Un precio, un horario o el
nombre de la clínica escritos aquí obligan a la clínica a llamarte para cambiarlos. Hay una prueba
(`tests/bloques.test.ts`) que falla si el `90` lleva una cifra o si algún bloque nombra la clínica.

## Los huecos

| Hueco | Lo rellena | Con |
| --- | --- | --- |
| `{{clinica}}`, `{{bot}}` | Compilador | `Config` → `nombre_clinica`, `nombre_bot` |
| `{{trato}}` | Compilador | «Trata siempre de usted…» o «Tutea…», según `Config` → `trato` |
| `{{privacidad}}` | Compilador | `Config` → `privacidad`: una **frase hablada**, no un enlace |
| `{{datos}}` | Compilador | Filas públicas de `Config` que no tienen hueco propio |
| `{{tratamientos}}`, `{{faq}}` | Compilador | Solo filas con `público = sí` |
| `{{horario}}` | Compilador | `Horarios`, día a día; un día sin tramos sale como «cerrado» |
| `{{ahora}}`, `{{dia_semana}}` | Compilador → **Vapi** | Se convierten en `{{"now" \| date: …, "<zona de Config>"}}`, que Vapi resuelve en cada llamada |
| `{{customer.number}}` y demás de Vapi | **Vapi** | Se dejan intactos. Ningún bloque los usa desde la Fase 3: si la llamada trae número lo dice `anotar` en su respuesta, en el momento en que hace falta |

Un hueco que no sea de ninguno de los dos mundos **para la publicación**: no se deja en blanco.

## Los que no se tocan

- `25 - No interpretes de mas`: **palabra por palabra de la V1**, byte a byte. Una prueba lo comprueba.
- `30 - Que no puede decir`: palabra por palabra de la V1 **salvo** los nombres de herramienta (cambian
  con la fase) y el dato de horario que traía escrito (se quitó el 24-sep: va por `{{horario}}`).

## Las herramientas

Los bloques nombran las herramientas propias por su nombre exacto: `consultar_huecos`, `anotar`,
`crear_cita` y `escalar_a_recepcion` (se definen en `src/herramientas/definiciones.ts`). El compilador no
publica un prompt que nombre una herramienta que el asistente no tenga enganchada.

El `70 - Antes de colgar` y el hueco `{{hoja_id}}` se retiraron en la Fase 3 (26-sep-2026): la fila de
cada llamada en `Llamadas` la escribe el `end-of-call-report`, con el coste real, sin que el bot haga nada.

## Los mensajes fijos

`contenido/mensajes/` tiene las plantillas de `firstMessage`, `endCallMessage` y `voicemailMessage`,
con una variante para `usted` y otra para `tú`. Se publican en el mismo `PATCH` que el prompt.
