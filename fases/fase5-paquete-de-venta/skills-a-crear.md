# Skills propias de la Fase 5 — ya creadas

Estas tres skills cubren huecos específicos del proyecto que ninguna skill instalada resolvía. **Ya
están creadas** y viven en `.claude/skills/` en la raíz del repo, así que se cargan solas cuando
hacen falta.

| Skill | Ruta | Dónde se usa en el entregable |
| --- | --- | --- |
| `ensayar-guion-demo` | `.claude/skills/ensayar-guion-demo/SKILL.md` | Punto 1: el guion del §7 ensayado. Y antes de cada reunión |
| `alta-clinica-nueva` | `.claude/skills/alta-clinica-nueva/SKILL.md` | Punto 2: la ficha de una clínica nueva en menos de una hora. **La que más veces se usará en la vida del producto** |
| `coste-por-llamada-real` | `.claude/skills/coste-por-llamada-real/SKILL.md` | Punto 3: números de coste calculados con llamadas reales |

## Qué hace cada una

### `alta-clinica-nueva`

Los seis pasos que llevan a una clínica de «una web y un perfil de Google Business» a «ficha
compilada y llamada de prueba hecha»: recoger sus datos públicos (se apoya en
`sales:account-research`), rellenar las siete pestañas, **dejar al menos una fila con
`público = no`**, compilar y mirar el contador, llamar para probar, y entregar la lista de lo que
falta por confirmar con la clínica.

El paso de la fila confidencial no es opcional: es el punto 5 del guion de demo, y una ficha sin
ella es una ficha con la que **no se puede enseñar el filtro**, que es el argumento de venta más
fuerte del producto.

Y no inventa nada que no esté publicado: lo que no encuentra va a la lista del paso 6. Un precio
inventado en una demo es una conversación muy incómoda.

### `coste-por-llamada-real`

Saca el coste de las llamadas reales de la pestaña `Llamadas`, descarta lo que no cuenta **y dice
qué descartó**, calcula media y rango diciendo **cuántas llamadas** sostienen el número y de qué
fechas son, verifica los precios de lista el mismo día en `vapi.ai/pricing` y Twilio, proyecta a
volumen con las dos notas que cambian la cuenta, y le pone **fecha de caducidad** al resultado.

Lo que la define: **se niega a usar las cifras del §10 en una propuesta.** Los ≈185 €/mes y los
≈0,12 €/llamada son orientativos, y el propio plan lo dice. Si faltan llamadas reales, el resultado
es «faltan llamadas reales», no una estimación con cara de dato.

Tampoco convierte coste en precio: el coste es lo que te cuesta a ti; el precio incluye tu trabajo,
el alta, el soporte y el margen. Mezclarlos es como se acaba cobrando 0,12 € por llamada.

### `ensayar-guion-demo`

Los seis pasos del §7 con cronómetro, lista de comprobación del mismo día, y **plan B por cada paso
con una frase que decir** — porque lo que hunde una demo no es el fallo, es el silencio de treinta
segundos mientras lo arreglas.

Tiene dos aciertos que conviene no perder si se edita: el tratamiento del **paso 3**, que es el
único con un silencio de cinco minutos dentro (o disparo manual, o se usa el rato para los pasos 5 y
6), y el hecho de que **algunos fallos se pueden convertir en argumento**: si el compilador aborta,
*«ha parado porque algo en la hoja no cuadraba; prefiero que pare a que publique un dato que no
debe»* refuerza justamente el paso 5.

Y la comprobación final, que no es «¿ha funcionado todo?» sino **«¿se han contado las tres frases,
en orden?»**: la clínica manda → no se inventa nada → la cita aparece de verdad. Una demo en la que
todo funciona y solo se demuestra que el bot habla bien es una demo fallida (§0).

## Si las cambias

Están escritas contra `PLAN.md`. Si el plan cambia, cámbialas; si crees que el plan está mal,
señálalo para que se corrija en `PLAN.md` (ver `fases/ORQUESTACION.md`), no diverjas en la skill.

**Pendiente, opcional:** ninguna se ha pasado por el bucle de evaluación de
`anthropic-skills:skill-creator`. `coste-por-llamada-real` es la mejor candidata de las tres: dado
un fixture de la pestaña `Llamadas`, el resultado es objetivamente verificable, y se puede probar
justo lo que importa —que **se niegue** a dar una cifra cuando no hay llamadas reales detrás—.
