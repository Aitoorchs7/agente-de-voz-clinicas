# ADR-001: Voz del asistente — `es-ES-DarioNeural` (Azure)

**Estado:** Aceptada, con una comprobación pendiente (latencia)
**Fecha:** 24 de septiembre de 2026
**Decide:** el humano (dueño del proyecto), oyéndola. Cierra la **decisión abierta 1 del §12** de `PLAN.md`
**Fase:** 1

---

## Contexto

El §3 del plan es tajante sobre por qué esto no es una cuestión de calidad de audio:

> *«El acento importa más que la calidad. Una voz latinoamericana perfecta genera más desconfianza en
> una clínica de Barcelona que una peninsular normalita. El paciente no sabe decir por qué, pero nota
> que "no es de aquí".»*

Y el §12 añade cómo se decide: **oyéndolas y midiendo latencia en pruebas reales, no leyendo tablas
comparativas.**

Tres hechos del catálogo, comprobados por API el 23-sep contra `GET /voice-library/{provider}` de Vapi:

- De los once proveedores de voz que Vapi ofrece, **solo Azure tiene voces de España**. Cartesia,
  OpenAI, las propias de Vapi, Rime, Inworld, MiniMax, Neuphonic, LMNT y PlayHT dan **cero** voces
  `es-ES`. No hay elección de proveedor: hay Azure o no hay peninsular.
- Azure ofrece **24 voces `es-ES`**, de las que **9 son masculinas**. El bot se llama Diego, así que
  el corte es por ahí.
- **ElevenLabs queda fuera por decisión de producto, no técnica.** El §3 la reserva como argumento de
  venta (*«podemos clonar la voz de su recepcionista»*). Meterla en la configuración base gastaría la
  carta antes de jugarla.

## Decisión

**Voz: `es-ES-DarioNeural`, proveedor `azure`.**

Con plan de respaldo, que Vapi **sí** admite para voz (a diferencia del modelo, ver
[ADR-002](ADR-002-modelo.md)):

```
es-ES-DarioNeural  →  es-ES-AlvaroNeural  →  es-ES-ArnauNeural
```

Las tres son peninsulares a propósito: si salta el respaldo en mitad de una llamada, cambia el timbre
pero **no cambia el acento**, que es lo único que el plan considera irrenunciable.

## Opciones consideradas

De las nueve masculinas se preseleccionaron tres. Las otras seis (`es-ES-EliasNeural`,
`es-ES-NilNeural`, `es-ES-SaulNeural`, `es-ES-TeoNeural`, `es-ES-TristanMultilingualNeural`,
`es-ES-ArnauNeural`) se descartaron sin escuchar: o son variantes del mismo registro o son
multilingües, que es justo lo que diluye el acento.

### Opción A: `es-ES-AlvaroNeural`

| Dimensión | Valoración |
| --- | --- |
| Acento | Peninsular, neutro |
| Registro | Adulto, profesional, algo locutor |
| Latencia | Neural estándar — la baja del catálogo |
| Riesgo | Ninguno; es la voz de referencia en castellano |

**A favor:** la apuesta segura. Nadie la va a encontrar rara.
**En contra:** suena a locución institucional. Para una clínica de barrio es más distante de lo que
interesa.

### Opción B: `es-ES-DarioNeural` ← **elegida**

| Dimensión | Valoración |
| --- | --- |
| Acento | Peninsular, neutro |
| Registro | Más joven y cálido, conversacional |
| Latencia | Neural estándar — igual que Álvaro |
| Riesgo | Ninguno |

**A favor:** suena a persona que coge el teléfono, no a contestador. Es lo que se busca: que el
paciente no note el salto entre el mostrador y el bot.
**En contra:** algo menos «autoridad» que Álvaro, si algún día se quiere un tono más formal.

### Opción C: `es-ES-Tristan:DragonHDLatestNeural`

| Dimensión | Valoración |
| --- | --- |
| Acento | Peninsular |
| Registro | El más natural de prosodia del catálogo (modelo HD) |
| Latencia | **Sin medir, y previsiblemente peor**: los modelos HD generan más lento |
| Riesgo | Medio — si añade retardo, empeora la llamada aunque suene mejor |

**A favor:** técnicamente la mejor.
**En contra:** en teléfono, **medio segundo de retardo se nota más que la calidad del timbre**. No se
llegó a probar.

## Análisis de la decisión

Se escucharon **A y B en llamada web real** (botón `Talk`, 24-sep). C no se probó.

El criterio que decidió no fue la calidad de audio —las dos son equivalentes— sino **el registro**:
Álvaro suena a locución, Darío suena a recepción. Como el producto que se vende es *«que no se note
que no hay nadie»*, el registro conversacional gana.

**Lo que no se hizo, y hay que decirlo:** el §12 pide **medir latencia**, y no se midió. Se eligió
oyéndola, que es la mitad del criterio. Álvaro y Darío son el mismo tipo de modelo (neural estándar,
no HD), así que es razonable suponer latencia equivalente entre las dos —pero **suponer no es
medir**. Esta ADR se da por aceptada porque la comparación entre A y B no dependía de la latencia;
queda abierto si alguna vez se quiere valorar C, que es donde la latencia sí decidiría.

## Consecuencias

**Lo que queda más fácil**
- Cambiar de voz es un `PATCH` de un campo. Ninguna otra pieza depende de cuál sea.
- Si Azure se cae, la llamada sigue con acento peninsular en lugar de quedarse muda.

**Lo que queda más difícil**
- **Dependemos de un solo proveedor de TTS para el acento.** No es diversificable: nadie más tiene
  `es-ES` en Vapi. Si Azure retira las voces `es-ES` o Vapi quita la integración, no hay plan B
  peninsular dentro de Vapi. Esto debería ser una fila de riesgo del §9 y no lo es.
- La Fase 4, que afina parámetros de voz y turnos, parte de Darío. Si se cambia después, hay que
  repetir ese ajuste.

**Lo que hay que revisar**
- Medir latencia de verdad cuando haya llamadas por teléfono (no por navegador): la latencia de la
  línea y la del TTS se suman, y solo la segunda es nuestra.
- Si en una demo la clínica pide voz femenina, las candidatas equivalentes son `es-ES-ElviraNeural`
  (registro de Álvaro) y `es-ES-AbrilNeural` o `es-ES-VeraNeural` (registro de Darío).

## Tareas

1. [x] Confirmar que Vapi acepta `provider: azure` con voz `es-ES` sin credencial propia de Azure
2. [x] Dejar `es-ES-DarioNeural` activa en el asistente `2de1097d-fc5e-4684-b2ed-2c5399ef9368`
3. [x] Configurar `voice.fallbackPlan` con las dos peninsulares de respaldo
4. [ ] **Medir latencia de TTS en llamada telefónica real** (Fase 1 al colgar el número, o Fase 4)
5. [ ] Escuchar `es-ES-Tristan:DragonHDLatestNeural` **solo si** se quiere revisar la decisión; con
       latencia medida al lado, no a oído
6. [ ] Proponer para el §9 la fila de riesgo *«Azure es el único proveedor con voz peninsular en
       Vapi»*
