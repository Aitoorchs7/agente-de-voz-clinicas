# Agente de voz para clínicas dentales

> **Este fichero solo enruta. No contiene instrucciones de trabajo.**
> Las instrucciones de cada fase viven en el `CLAUDE.md` de su carpeta, y cada uno es
> autosuficiente. Este de aquí existe porque es el único que Claude Code carga solo al abrir el
> proyecto, y su único trabajo es mandarte a leer el tuyo.

---

## 1. Antes de tocar nada

**Dos lecturas obligatorias, en este orden, y completas:**

1. **`PLAN.md`** (raíz del repo). Es **la fuente de verdad** del proyecto entero.
2. **El `CLAUDE.md` de tu fase** (tabla de abajo). Ahí está tu alcance, tus restricciones duras, tu
   entregable y qué reutilizar.

Si nadie te ha dicho de qué fase eres, **pregúntalo antes de empezar**. No lo deduzcas del último
commit ni de lo que encuentres a medias en el repo: empezar en la fase equivocada significa pisar el
trabajo de otro agente.

## 2. Las cinco fases

| Fase | Carpeta con tu `CLAUDE.md` | Entregable en una línea |
| --- | --- | --- |
| **1** | `fases/fase1-voz-y-cita/` | Una llamada real desde el número español que acaba en un evento de Calendar |
| **2** | `fases/fase2-compilador/` | Cambiar un precio en la hoja y oírlo por teléfono cinco minutos después |
| **3** | `fases/fase3-herramientas-propias/` | Dos llamadas a la vez sin pisarse |
| **4** | `fases/fase4-afinar-voz/` | Cinco personas distintas llaman y ninguna se queda colgada |
| **5** | `fases/fase5-paquete-de-venta/` | Enseñárselo a una clínica de verdad |

La **Fase 0** (cuentas, número de Twilio, bundle regulatorio, facturación de Google) es **manual y
del humano**. Ningún agente la hace. Si te falta algo de ahí, **para y dilo**; no lo suplas.

Orden y dependencias: `fases/ORQUESTACION.md`.

## 3. Reglas que valen para todos

1. **`PLAN.md` manda sobre cualquier `CLAUDE.md`.** Si encuentras que el plan está desactualizado o
   equivocado, **señálalo para que se corrija en `PLAN.md`** — no diverjas por tu cuenta en tu
   fichero. Hay cinco agentes y ninguno lee la conversación de los otros: cinco planes divergentes
   son peor que un plan con una errata.
   *(Ya hay contradicciones detectadas y pendientes de corregir, listadas en `fases/ORQUESTACION.md`.)*

2. **No invadas la fase anterior ni la siguiente.** Cada `CLAUDE.md` dice explícitamente qué **no**
   te toca. Si necesitas algo de otra fase, se pide, no se reescribe.

3. **Verifica contra fuente oficial, no contra memoria**, cualquier dato técnico que pueda haber
   cambiado: modelos, formatos de API, precios. Las plantillas del curso en `PAGO` valen como
   **arquitectura**, no como esquema de campos.

4. **`PAGO` y los proyectos anteriores son de SOLO LECTURA.** Se copia de ahí hacia este repo;
   **nunca al revés**, y nunca se edita nada allí. Afecta a:
   - `C:\Users\chica\Desktop\CURSO AGUSTIN MEDINA\PAGO`
   - `C:\Users\chica\Desktop\Bot Clinica Demo V1`
   - `C:\Users\chica\Desktop\Bot Clinica WhatsApp`

   Esto **no depende de tu buena voluntad**: está aplicado en `.claude/settings.json` con reglas
   `deny` sobre las herramientas de escritura, y con un hook (`.claude/hooks/proteger-solo-lectura.py`)
   que corta cualquier comando de Bash que escriba, mueva, borre o redirija hacia esas rutas. Si te
   lo bloquea, no busques la vuelta: es la norma, no un obstáculo.

5. **Datos ficticios siempre.** Son datos de salud (RGPD, §9 del plan). En pruebas y demos: números
   inventados y grabación apagada.

6. **Al terminar, escribe `fases/<tu-fase>/ESTADO.md`** con lo que la fase siguiente necesita. Es el
   único canal entre agentes. Tu `CLAUDE.md` dice qué poner.

## 4. Lo que ya tienes montado

- **14 skills propias** en `.claude/skills/`. Se cargan solas cuando hacen falta; tu `CLAUDE.md`
  dice cuáles son tuyas y cuándo usarlas. No las reescribas sin motivo.
- **`fases/ORQUESTACION.md`**: dependencias entre fases, qué artefacto pasa cada una a la siguiente,
  la estructura de carpetas del código, y las contradicciones del plan ya detectadas.
- **Una skill que NO debes cargar:** `claude-api`. Es de la API de Anthropic; aquí el modelo es
  **Gemini a través de Vapi**.

## 5. Entorno

- Windows. El shell por defecto es PowerShell; hay Bash disponible, cada uno con su sintaxis.
- Si ejecutas los scripts de `skill-creator` u otra herramienta de Python que lea ficheros de este
  repo, **exporta `PYTHONUTF8=1`**: leen sin especificar codificación y en este Windows fallan con
  los acentos y los emoji.
