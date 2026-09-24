# Skills propias de la Fase 2 — ya creadas

Estas tres skills cubren huecos específicos del proyecto que ninguna skill instalada resolvía. **Ya
están creadas** y viven en `.claude/skills/` en la raíz del repo, así que se cargan solas cuando
hacen falta.

| Skill | Ruta | Dónde se usa en el entregable |
| --- | --- | --- |
| `plantilla-hoja-clinica` | `.claude/skills/plantilla-hoja-clinica/SKILL.md` | Punto 1: la hoja plantilla con las siete pestañas |
| `portar-bloque-a-voz` | `.claude/skills/portar-bloque-a-voz/SKILL.md` | Punto 2: los bloques en `contenido/bloques/`, portados de la V1 con adaptación a voz. Se usa nueve veces, una por bloque |
| `compilar-ficha-clinica` | `.claude/skills/compilar-ficha-clinica/SKILL.md` | Puntos 3, 4 y 5: el compilador, el contador de filas y el bucle + disparo manual |

## Qué hace cada una

### `compilar-ficha-clinica` — la skill central de la fase

El ciclo entero: leer las siete pestañas con rango cerrado → **filtrar `público = no` antes de tocar
el prompt** → **contar filas leídas frente a cargadas** → renderizar los bloques rellenando los
huecos del compilador y **dejando intactos** los de Vapi (`{{now}}`, `{{date}}`,
`{{customer.number}}`) → `PATCH /assistant/{id}`.

Y lo que la hace fiable: **aborta sin publicar** si el filtro no se puede garantizar (falta la
columna `público`, hay un valor que no se puede clasificar, el conteo no cuadra). Un prompt viejo es
un problema de un rato; un coste de laboratorio dentro del prompt es el final del producto.

El filtro y el contador son **la misma pieza**, por la frase del §2: *«El filtro no es una promesa,
es un contador.»*

### `portar-bloque-a-voz`

Convierte un bloque escrito para chat en uno para teléfono, con las seis reglas del canal (números
en palabras, sin emojis ni listas, confirmación en una frase, teléfono dígito a dígito, `40` hablando
de dicción y no de ortografía, una pregunta cada vez).

Lleva dentro la barandilla que importa: **si el bloque es `25` o `30`, se copia palabra por palabra
y se niega a reescribirlo.** Si cree que hace falta un cambio, lo dice en vez de hacerlo.

### `plantilla-hoja-clinica`

Crea la hoja con las siete pestañas exactas, la columna `público` **con validación de datos** (es
más barato impedir un valor raro que detectarlo luego), la pestaña LÉEME escrita para la
recepcionista con la regla de las notas sueltas, y filas de ejemplo — incluida **al menos una con
`público = no`**, sin la cual no se puede enseñar el filtro en la demo.

## Si las cambias

Están escritas contra `PLAN.md`. Si el plan cambia, cámbialas; si crees que el plan está mal,
señálalo para que se corrija en `PLAN.md` (ver `fases/ORQUESTACION.md`), no diverjas en la skill.

**Pendiente, opcional:** ninguna se ha pasado todavía por el bucle de evaluación de
`anthropic-skills:skill-creator`. `compilar-ficha-clinica` es la mejor candidata para hacerlo, porque
su comportamiento es objetivamente verificable: dado un fixture de hoja con filas confidenciales, o
el prompt las contiene o no.
