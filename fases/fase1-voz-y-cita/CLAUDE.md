# CLAUDE.md — Fase 1: Que hable y coja una cita

> Este fichero es autosuficiente. No necesitas leer las otras fases ni recordar conversaciones
> previas. Lo único que manda por encima de este fichero es `PLAN.md` en la raíz del repo:
> **PLAN.md es la fuente de verdad.** Si algo aquí lo contradice, gana PLAN.md y hay que corregir
> este fichero.

---

## 1. Rol

Eres el agente responsable de la **Fase 1** del proyecto *Agente de voz para clínicas dentales*:
conseguir que un número de teléfono suene, conteste un asistente de voz en español, y que una
llamada de verdad termine convertida en un evento de Google Calendar.

---

## 2. Alcance

### Lo que construyes

Lo que dice el §8 del plan, literal:

- Asistente en Vapi: Gemini + voz peninsular + Deepgram `nova-2` español
- Probar el asistente con **llamada web desde el panel de Vapi** (`Talk`), sin telefonía ni número de por medio, mientras el bundle de Twilio está en trámite
- En cuanto el número español de Twilio esté aprobado (Fase 0), importarlo y **colgar el asistente de ese número**
- Prompt de una pieza, a mano, con datos de una clínica inventada
- Calendar y Sheets **nativos** de Vapi

### Lo que NO construyes

- **No escribes el compilador.** Eso es la Fase 2. Tu prompt es *de una pieza, a mano*, con datos de
  una clínica **inventada**. No montes lectura de Google Sheets, no partas el prompt en bloques
  numerados, no implementes el filtro de `público`. Tu prompt es deliberadamente desechable: la
  Fase 2 lo sustituye entero.
- **No escribes herramientas propias.** Nada de `consultar_huecos`, `anotar`, `crear_cita` ni
  `escalar_a_recepcion` en un servidor tuyo. Eso es la Fase 3. Tú usas **las nativas de Vapi**
  (`google.calendar.availability.check`, `google.calendar.event.create`,
  `google.sheets.row.append`), conectadas por OAuth desde el panel. El §6 del plan lo autoriza
  explícitamente: *«Son cómodas y para la demo de la fase 1 valen»*.
- **No montas el servicio de Vercel ni el repo Node/TypeScript.** No hay código de servidor en esta
  fase. Si te ves escribiendo un endpoint, te has salido de la fase.
- **No haces la Fase 0.** Las cuentas de Twilio/Vapi/Google Cloud, la compra del número español, el
  bundle regulatorio y la activación de facturación son trabajo manual del humano, y están hechos o
  en trámite cuando tú empiezas. Si falta algo de eso, **para y dilo**, no lo suplas.

---

## 3. Punto de partida

Necesitas que la **Fase 0** esté hecha (es manual, no la haces tú):

- Cuenta Twilio, número español **comprado** y bundle regulatorio **presentado** (puede seguir en
  trámite: por eso empiezas por llamada web, sin número).
- Cuenta Vapi con API key.
- Google Cloud con **facturación activada**, API key de Gemini, y cuenta de servicio para Calendar y
  Sheets.
- Comprobado que el modelo elegido **responde de verdad** (que diga una palabra), no que aparezca en
  `ListModels`.

Si el bundle de Twilio sigue en trámite, **arrancas igual** con la llamada web del panel y cuelgas
el asistente del número español en cuanto esté aprobado. Eso no es un atajo: está escrito en el plan.

---

## 4. Restricciones duras — innegociables

Copiadas del §1, §3, §5, §9 y §12 del plan. No se negocian, no se «mejoran», no se saltan «solo
para probar».

1. **Facturación de Google activada desde el día uno, y nunca un modelo `preview` en producción.**
   Del §3: *«Los modelos `preview` en plan gratuito son 5 peticiones/minuto y 20 al día. Una llamada
   gasta una petición por frase. A la cuarta o quinta, Google devuelve `429` y el bot se queda mudo
   o dice que tiene un problema técnico. No es un modelo lento: es un modelo agotado.»*

2. **El modelo se verifica, no se consulta.** Del §3: *«Google jubila modelos sin avisar y
   `ListModels` sigue listándolos. Estar en la lista no es poder usarlo. El arranque debe pedirle al
   modelo que diga una palabra antes de abrir el teléfono; si no contesta, bajar por el catálogo de
   respaldo y decirlo en el registro.»*
   **Elección:** `gemini-3.5-flash` con facturación activa. **Respaldo: `gemini-3.1-flash-lite`, el
   único vivo.** Vapi publica seis modelos, pero `gemini-2.5-flash`, `gemini-2.5-flash-lite` y
   `gemini-2.5-pro` están **jubilados** (`404 — no longer available to new users`, verificado el
   23-sep-2026) y `gemini-3-flash-preview` está prohibido por ser `preview`. **La lista de Vapi
   miente igual que la de Google: re-verifícala tú al empezar.**
   Y el cambio de modelo **es manual**: Vapi no admite respaldo automático de modelo, solo de voz y
   de transcriber. Si bajas de modelo, manda el objeto `model` **completo** en el `PATCH` o borrarás
   el prompt y las herramientas con un `200 OK`.

3. **Si el bot improvisa, no toques el prompt: cambia de modelo.** Del §3, literal: *«Si el bot
   empieza a improvisar pese al prompt, la alternativa no es tocar el prompt: es cambiar de
   modelo.»*

4. **Voz peninsular, y el acento manda sobre la calidad.** Del §3: *«El acento importa más que la
   calidad. Una voz latinoamericana perfecta genera más desconfianza en una clínica de Barcelona que
   una peninsular normalita. El paciente no sabe decir por qué, pero nota que "no es de aquí".»*
   Se elige **oyéndolas**, midiendo latencia en pruebas reales, no leyendo una tabla comparativa
   (§12, decisión abierta 1). **ElevenLabs no se usa aquí**: se reserva como argumento de venta
   (*«podemos clonar la voz de su recepcionista»*), no como mejora técnica.

5. **Transcripción: Deepgram `nova-2` con `language: "es"`**, como en las plantillas del curso.

6. **El número gratuito de Vapi no se usa.** Del §3 y §9: es *«US national calling only»*, así que
   **puede no aceptar siquiera una llamada desde España**, y si la acepta, quien llame paga
   ~1,82-2 €/min de tarifa internacional. Tus pruebas internas van por **llamada web desde el panel**
   (Dashboard → Assistants → el asistente → **Talk**), que no pasa por telefonía. La demo y cualquier
   desvío real, **solo** por el número español de Twilio.

7. **El aviso inicial es obligatorio, no cortesía.** Del §5, bloque `05 - Aviso inicial`: el prompt
   tiene que decir desde la primera frase que es un asistente virtual. Aunque tu prompt sea de una
   pieza y provisional, esto va dentro. Es requisito de RGPD (§9), no de estilo.

8. **Esto es una llamada, no un chat** (§5). Aunque el prompt sea provisional:
   - **Los números se dicen en palabras.** «Las diez y media», no «10:30».
   - **Nada de emojis ni listas.** No hay pantalla.
   - **La confirmación final no es una lista, es una frase:** *«Entonces le apunto para el jueves
     veinticuatro a las diez, revisión, a nombre de Ana Pérez. ¿Correcto?»*
   - **El teléfono no se tiene escrito: se oye.** Llega por `{{customer.number}}`, pero si el
     paciente da otro hay que **repetirlo dígito a dígito para confirmar**.

9. **Nunca decir que una hora está ocupada por tu cuenta** (§5, bloque `30`). *«El bot no ve la
   agenda; la ven las herramientas. Que una hora no estuviera entre las que ofreció no significa que
   esté cogida. Y "cerrado" y "ocupado" son cosas distintas: el paciente nota la diferencia.»*
   Esto aplica ya en tu prompt de una pieza.

10. **Datos ficticios, siempre.** Del §9 (RGPD): *«Para la demo: números ficticios y nada real»*. La
    clínica de esta fase es **inventada**. Ningún dato de paciente real, ningún teléfono real que no
    sea el tuyo. Sugerencia del §12 que conviene seguir ya: **grabación de llamadas apagada**.

11. **Nunca se porta el número. Se desvía** (§1). No inicies ninguna portabilidad, por cómoda que
    parezca: *«Una portabilidad tarda semanas y no tiene marcha atrás. Un desvío se quita en treinta
    segundos desde la centralita.»*

---

## 5. Entregable de la fase

Copia literal del §8:

> **Entregable: una llamada de verdad, ya desde el número español de Twilio, que acaba en un evento
> de Calendar**

Esto es el criterio de éxito, no una sugerencia. Ojo al *«ya desde el número español de Twilio»*:
las pruebas por llamada web valen para avanzar, pero **la fase no está cerrada hasta que la llamada
entra por teléfono, por el número español**. Si el bundle regulatorio de Twilio sigue bloqueado, la
fase queda **abierta y bloqueada por Fase 0**, y se dice así — no se da por entregada con una llamada
de navegador.

---

## 6. Fuentes oficiales a consultar antes de dar nada por bueno

Del §11 del plan, las que aplican a esta fase:

- Importar número de Twilio — `docs.vapi.ai/phone-numbers/import-twilio`
- Modelos Gemini y `provider: "google"` — `docs.vapi.ai/providers/model/gemini`
- Google Calendar (`google.calendar.event.create`, `google.calendar.availability.check`) — `docs.vapi.ai/tools/google-calendar`
- Google Sheets (`google.sheets.row.append`, **append-only**) — `docs.vapi.ai/tools/google-sheets`
- Variables dinámicas y `assistantOverrides` — `docs.vapi.ai/assistants/dynamic-variables`
- Llamada web de prueba desde el panel (**Talk**) — `docs.vapi.ai/quickstart/dashboard`
- Límites del número gratuito (*US national calling only*, *inbound only*) — `docs.vapi.ai/free-telephony`, `docs.vapi.ai/phone-calling`

**Regla:** cualquier dato técnico que pueda haber cambiado —lista de modelos disponibles, nombres de
las voces del catálogo, cuerpo de `POST /assistant`, precios— se verifica **contra la fuente
oficial, no contra tu memoria ni contra las plantillas del curso**. Si una fuente oficial contradice
a PLAN.md, **no diverjas en silencio**: dilo, para que se corrija PLAN.md.

> ⚠️ **No cargues la skill `claude-api`.** Trata de la API de Anthropic. Aquí el proveedor del
> modelo es **Google (Gemini) a través de Vapi**, así que no aplica y solo gasta contexto.

---

## 7. Qué reutilizar

Rutas exactas. **`PAGO` es de solo lectura: no se toca nada ahí.**

| Ruta | Para qué en esta fase |
| --- | --- |
| `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO\RECURSOS EXCLUSIVOS\02 - Recursos AILINK\12 - 12. Agente telefónico restaurante básico\crear_vapi.json` | **La plantilla del asistente**: el cuerpo real del `POST /assistant` (voz, transcriber, `serverMessages`, `analysisPlan` con `structuredDataSchema`). Tu punto de partida para crear el asistente |
| `...\02 - Recursos AILINK\13 - 13. Agente telefónico reservas avanzado\crear_vapi-2.json` | Segunda versión del mismo cuerpo, más completa. Contrasta campos entre las dos antes de fijar el tuyo |
| `...\02 - Recursos AILINK\10 - 10. Agente de Voz - Profesional - Plantilla\Agente de reservas.json` | La arquitectura completa del agente de voz del curso. Aquí solo como **lectura de orientación**; su implementación de herramientas es cosa de la Fase 3 |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\5 Decisiones\D1 - Que modelo, que voz, que de todo.md` | **Las trampas de Gemini ya peleadas** en la V1: cuotas, modelos jubilados, elección de voz. Léelo antes de elegir nada |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\3 Operacion\O2 — Telefonía y número.md` | La **regla del desvío** y la operativa de telefonía de la V1 |
| `C:\Users\chica\Desktop\Bot Clinica Demo V1\4 Agente\` | Los bloques del prompt de la V1 (`10` a `90`). Aquí solo los **saqueas** para escribir tu prompt de una pieza. **No los portes en condiciones: eso es la Fase 2** |

> Del §11: *«La V1 era un orquestador propio en Python. Esto es lo mismo con Vapi debajo: se cambia
> el arnés, no el producto.»*

---

## 8. Skills

### Skills ya disponibles que debes usar

| Skill | Cuándo usarla |
| --- | --- |
| `engineering:architecture` | Para dejar por escrito, como ADR, las decisiones que cierras en esta fase: **qué voz concreta** (decisión abierta 1 del §12) y **qué modelo quedó activo** tras la verificación. Sin ese registro, la Fase 4 no sabrá por qué sonaba así |
| `engineering:debug` | Cuando el bot **escucha bien y no dice una palabra** (modelo jubilado), cuando salta un `429` a mitad de llamada (cuota), o cuando la llamada entra y se cae. Son tres de los fallos previstos en el §9 |
| `engineering:deploy-checklist` | **Antes de colgar el asistente del número español de Twilio.** Es el paso que cierra la fase y el que puede dejar el teléfono mudo: merece checklist y criterio de vuelta atrás |
| `engineering:documentation` | Para el registro de configuración del asistente (modelo, voz, transcriber, IDs de Vapi y de Twilio) que la Fase 2 necesita para poder hacerle `PATCH` |

### Skills que NO debes cargar

- `claude-api` — es de la API de Anthropic; aquí el modelo es Gemini vía Vapi.

### Skills propias de esta fase (ya creadas)

Viven en `.claude/skills/` en la raíz del repo y se cargan solas cuando hacen falta:

| Skill | Cuándo usarla |
| --- | --- |
| `verificar-modelo-gemini` | **Antes de cada tanda de pruebas y de cada demo.** Comprueba que el modelo contesta de verdad y baja por el catálogo de respaldo si no. Distingue «modelo jubilado» de «cuota agotada», que se parecen y no son lo mismo |
| `configurar-asistente-vapi` | Al crear el asistente, al cambiar voz o modelo, y al **colgarlo del número español de Twilio** — la operación que cierra la fase |

Detalle de las dos en `skills-a-crear.md`, en esta misma carpeta.

---

## 9. Cuando termines

Deja escrito en `fases/fase1-voz-y-cita/ESTADO.md` lo que la Fase 2 necesita como punto de partida:

- `assistantId` de Vapi y el `phoneNumberId` del número español de Twilio.
- Modelo que quedó activo tras la verificación, y respaldos probados.
- Voz elegida y por qué (latencia medida, no opinión).
- El prompt de una pieza que escribiste, tal cual, para que la Fase 2 lo pueda trocear en bloques.
- Qué credenciales existen y **dónde viven** (nunca el valor de la credencial).
- Qué conexiones OAuth nativas de Calendar/Sheets quedaron montadas en el panel de Vapi.
