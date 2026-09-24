# Agente de voz para clínicas dentales — código

El plan está en [`PLAN.md`](PLAN.md) y el reparto por fases en [`fases/`](fases/ORQUESTACION.md). Esto
explica cómo se usa lo que hay.

## Lo que hay hoy (Fase 2): el compilador

Lee la hoja de cálculo de una clínica, **quita las filas con `público = no` antes de construir nada**,
cuenta cuántas ha cargado de cuántas, rellena los bloques del prompt y lo publica en el asistente de
Vapi. La clínica cambia un precio en su hoja y a los cinco minutos el asistente lo dice.

```
npm install
npm test                                 # 82 pruebas: el filtro, los huecos, los bloques, la publicación
npm run compilar -- --simular            # contador + qué cambiaría, sin publicar nada
npm run compilar                         # compila y publica (el «botón» de la demo)
npm run vigilar                          # el bucle: recompila cada 5 minutos (dejar la ventana abierta)
npm run preparar-hoja -- <id> --semilla=plantilla   # pestañas, validación y LÉEME en una hoja nueva
```

Por defecto trabaja con la clínica de `fichas/dentalvis/`. Para otra: `npm run compilar -- <carpeta>`.

## Dónde está cada cosa

| Ruta | Qué |
| --- | --- |
| `contenido/bloques/` | **Lo que el bot es.** Los bloques del prompt. Nada de datos de clínica aquí |
| `contenido/mensajes/` | Saludo, despedida y buzón, con variante usted / tú |
| `fichas/<clinica>/ficha.json` | **Una clínica = su hoja + su asistente.** Nada más |
| `src/hoja/` | El lector de la hoja (compartido con la Fase 3) y la forma de la hoja (`esquema.ts`) |
| `src/compilador/` | Filtro y contador, render de huecos, publicación segura en Vapi, el ciclo |
| `scripts/` | Los comandos de arriba |
| `registro/` | El log con el contador, el último prompt publicado y la copia del asistente de antes (no se versiona) |

## Configuración

En `.env` (nunca en un `.md`): `VAPI_PRIVATE_KEY` y `GOOGLE_SERVICE_ACCOUNT_FILE` (ruta al JSON de la
cuenta de servicio, dentro de `credenciales/`, que no se versiona). La hoja de cada clínica tiene que
estar compartida con la cuenta de servicio como **Editor**.

## Tres cosas que no hay que olvidar

- **`PATCH /assistant` de Vapi reemplaza los objetos anidados.** El compilador manda siempre el `model`
  entero y comprueba con un GET después. No escribas otro cliente que mande `{"model":{"messages":…}}`.
- **Los bloques `25` y `30` no se reescriben.** El `25` va byte a byte de la V1; el `30` solo cambia en los
  nombres de herramienta. Hay pruebas que lo vigilan.
- **Datos ficticios siempre.** Son datos de salud.
