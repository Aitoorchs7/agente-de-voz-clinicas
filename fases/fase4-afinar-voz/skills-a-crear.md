# Skills propias de la Fase 4 — ya creadas

Estas dos skills cubren huecos específicos del proyecto que ninguna skill instalada resolvía. **Ya
están creadas** y viven en `.claude/skills/` en la raíz del repo, así que se cargan solas cuando
hacen falta.

| Skill | Ruta | Dónde se usa en el entregable |
| --- | --- | --- |
| `ronda-de-llamadas-reales` | `.claude/skills/ronda-de-llamadas-reales/SKILL.md` | En todo el entregable: *«cinco personas distintas llaman y ninguna se queda colgada»* |
| `banco-de-pruebas-diccion-es` | `.claude/skills/banco-de-pruebas-diccion-es/SKILL.md` | Punto 1: nombres y apellidos españoles con ruido de fondo |

## Qué hace cada una

### `ronda-de-llamadas-reales`

Convierte «que llamen cinco personas» en un procedimiento que produce datos comparables: a quién
reclutar (no cinco personas parecidas a ti), qué objetivo darle a cada una —un objetivo, **no un
guion**, porque si le das las frases pruebas tu guion y no el bot—, cómo repartir las condiciones
(ruido, mala cobertura, llamada larga, interrupciones) entre el grupo en vez de repetir la misma
cinco veces, y qué medir.

Lo que mide, y por qué: si consiguió la cita, **si se quedó colgada** (un silencio del que no se
sale, una llamada cortada o un bucle de repreguntas cuentan como colgada), cuántas veces repitió un
dato, **el silencio más largo en segundos** (el umbral del plan es ~1,5 s, no 3: se mide, no se
estima), **si el bot adivinó algún dato en vez de preguntarlo** —eso es un fallo, no una
tolerancia—, y qué le chirrió a la persona en sus palabras.

Incluye el aviso previo obligatorio de RGPD: cada persona sabe que habla con un bot, que es una
prueba, y usa nombre y teléfono ficticios. Y recuerda **no borrar los costes** que quedan en la
pestaña `Llamadas`: son la materia prima de los números de la Fase 5.

### `banco-de-pruebas-diccion-es`

El material que no existía en ninguna parte del proyecto, con el procedimiento para medir con él.
El corpus está en `references/corpus.md`: pares de apellidos peninsulares que se confunden
(Sánchez/Sáez/Sáenz, Herrero/Herrera, Villar/Billar), apellidos catalanes, gallegos y vascos,
nombres compuestos y con partícula, apellidos extranjeros frecuentes en clínicas españolas, y las
formas reales de decir teléfonos, horas y fechas.

Lo importante no es la tasa de acierto, sino la distinción entre **fallo declarado** (no lo entendió
y lo dijo: aceptable) y **fallo callado** (lo entendió mal y siguió, o lo completó él: inaceptable).
Un bot que acierta el 90% y se inventa el resto es peor que uno que acierta el 70% y pregunta.

Todos los nombres son ficticios o de uso público (§9, RGPD).

## Si las cambias

Están escritas contra `PLAN.md`. Si el plan cambia, cámbialas; si crees que el plan está mal,
señálalo para que se corrija en `PLAN.md` (ver `fases/ORQUESTACION.md`), no diverjas en la skill.

**Pendiente, opcional:** ninguna se ha pasado por el bucle de evaluación de
`anthropic-skills:skill-creator`, y en estas dos tiene menos sentido que en las de las fases 2 y 3:
su resultado depende de llamadas con personas reales, que es justo lo que no se puede simular en un
eval. Se juzgan usándolas.

**Pendiente de la propia fase:** el corpus de `references/corpus.md` está montado con criterio
lingüístico, no con datos de llamadas. Cuando pasen las cinco personas, conviene añadir los
apellidos que fallaron de verdad — esos valen más que los que parecían difíciles sobre el papel.
