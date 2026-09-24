# ADR-003: El compilador y el lector compartido de la hoja

**Estado:** Aceptada
**Fecha:** 24 de septiembre de 2026
**Decide:** el agente de la Fase 2, dentro de lo que fija `PLAN.md` §2, §4, §5 y §6 y las decisiones del
humano del 24-sep
**Fase:** 2 (la Fase 3 hereda el lector)

---

## Contexto

Lo que el bot **sabe** vive en la hoja de la clínica; lo que **es**, en el código (§1). Vapi no sabe leer
Sheets (su integración es *append-only*), así que la hoja se convierte en prompt **antes** de la llamada,
y el filtro de confidencialidad se aplica ahí, donde se puede **contar** (§2). El §6 pide un único repo
Node/TypeScript en Vercel en el que el compilador y las herramientas **comparten el lector**.

Tres hechos de esta máquina y de las APIs que condicionan la forma:

- Python no tiene certificados raíz aquí; **Node sí**. Y la credencial de Google está repartida en trece
  líneas del `.env`, que ningún lector de `.env` entiende.
- `PATCH /assistant` de Vapi **reemplaza** los objetos anidados y devuelve `200 OK` aunque deje el bot mudo.
  Ha pasado dos veces en este proyecto.
- El cron de Vercel Hobby es **una vez al día**. El humano decidió Vercel Pro, **al final del proyecto**.

## Decisión

1. **Node 24 + TypeScript, sin librerías de Google.** El JWT de la cuenta de servicio se firma con
   `node:crypto` y todo va por `fetch`. Dependencias solo de desarrollo (`typescript`, `tsx`, `vitest`).
   Menos piezas que se rompan en Vercel y ninguna que dependa de los certificados de Python.
2. **Una sola definición de la hoja** (`src/hoja/esquema.ts`) y **un solo lector** (`src/hoja/lector.ts`),
   que encuentra las columnas **por su cabecera** y nunca devuelve columnas que no conoce. El lector **no
   filtra**: devuelve `público` en crudo. Filtrar está en `src/compilador/filtro.ts`, y las herramientas de
   la Fase 3 tienen que pasar por él igual que el compilador.
3. **El filtro y el contador son la misma función.** El contador sale de contar las listas que produce
   el filtro, y el render solo recibe la lista de cargadas. Después de renderizar, **una segunda red**
   comprueba que ningún texto de una fila excluida aparece en lo que se va a publicar.
4. **Ante la duda, no se publica.** Valor raro en `público`, columna ausente o duplicada, fila pública
   incompleta, llaves de plantilla en la hoja, hueco sin dueño: el asistente se queda como estaba y el
   motivo queda escrito. La única excepción deliberada: una celda de `público` **vacía** no aborta; esa
   fila no se carga y se avisa (es lo que produce una nota suelta, y no debe parar a la clínica).
5. **Publicación segura:** GET → copia del `model` entero → cambiar solo el mensaje de sistema → `PATCH`
   completo con los tres mensajes fijos → GET y comparación campo a campo → vuelta atrás automática si
   algo no cuadra. Solo se publica si hay cambios (cada `PATCH` crea una versión nueva en Vapi).
6. **Compilado puro, efectos en los bordes.** `compilarFicha()` no toca red ni disco: por eso se puede
   probar con la ficha real de Dentalvis construida en memoria. La red está en el lector y en `publicar()`,
   y el disco en `ciclo.ts`.
7. **El bucle, en local mientras tanto.** `scripts/vigilar.ts` llama al mismo ciclo que el botón manual.
   Al desplegar, un `api/compilar.ts` llamará a `cicloDeCompilacion()` desde el cron de Vercel Pro.

## Opciones descartadas

- **`googleapis` / `google-auth-library`**: funcionan en Node, pero pesan, y para leer cuatro rangos y
  firmar un JWT sobra con `fetch` y `node:crypto`.
- **Leer por posición de columna (`A:F`)**: más simple, pero una columna insertada por la clínica
  desplazaría `público`, que es justo la columna que no puede equivocarse.
- **Tratar un `público` vacío como error**: más estricto, pero una nota suelta bajo la tabla pararía las
  actualizaciones de la clínica, que es lo que el §4 dice que hay que sobrevivir.
- **El cron nativo de Vercel en Hobby**: no permite cada cinco minutos (ver `ESTADO.md`, propuesta 2).

## Consecuencias

**Más fácil:** dar de alta una clínica es crear la hoja, `npm run preparar-hoja` y una `ficha.json`. La
Fase 3 tiene el lector y el filtro hechos y probados.

**Más difícil:** el ciclo escribe su registro y su candado en disco (`registro/`); en Vercel eso tiene que
ir a `/tmp` o a otro sitio. Y la credencial de Google, en una sola línea.

**Para vigilar:** si Vapi cambia su API y un campo nuevo aparece en el `model` tras el `PATCH`, la
comparación lo tolera (solo exige que no falte ni cambie nada de lo que había). Si Vapi empezase a
**quitar** un campo propio al guardar, el compilador lo tomaría por un fallo y volvería atrás: ruidoso,
pero del lado seguro.
