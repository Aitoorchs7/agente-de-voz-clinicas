// Cómo se le presentan las herramientas propias al modelo (PLAN.md §6). La descripción la lee Gemini
// para decidir cuándo llamar a cada una, así que se escribe para eso: cuándo usarla, cuándo no y qué
// espera recibir. Es lo que el bot ES, no lo que sabe: aquí no va ningún dato de una clínica.
//
// Se registran en Vapi SIN URL propia: las llamadas van a la URL del asistente (prioridad documentada:
// herramienta > asistente > número > cuenta). Así las mismas herramientas sirven al asistente de
// pruebas y a Diego, cada uno apuntando a su servidor. `scripts/herramientas.ts` las crea o actualiza.

export type DefinicionFuncion = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: "string"; description: string; enum?: readonly string[] }>;
    required: readonly string[];
  };
};

// `anotar` recibe VARIOS datos a la vez (26-sep-2026, tras la llamada 1): cada herramienta es un turno
// del modelo con su «un segundo», y cuatro seguidas fueron trece segundos de espera. El tratamiento y el
// día no pasan por aquí: los apunta `consultar_huecos`, que los necesita igualmente.
export const CAMPOS_ANOTAR = ["nombre", "apellidos", "telefono", "quien_llama", "hora"] as const;
export type CampoAnotar = (typeof CAMPOS_ANOTAR)[number];

/** Lo que el modelo escribe en `telefono` cuando el paciente quiere que le llamen al número desde el que llama. */
export const TELEFONO_DE_LA_LLAMADA = "el de esta llamada";

export const MOTIVOS_ESCALADO = ["sin resolver", "urgencia", "anular o cambiar cita", "queja", "hablar con una persona"] as const;
export type MotivoEscalado = (typeof MOTIVOS_ESCALADO)[number];

export const HERRAMIENTAS: readonly DefinicionFuncion[] = [
  {
    name: "consultar_huecos",
    description:
      "Mira en la agenda qué horas hay libres para un tratamiento un día concreto, teniendo en cuenta lo que dura, " +
      "su gabinete y el horario de la clínica, y las reserva unos minutos para esta llamada. Úsala siempre antes de " +
      "ofrecer una hora, y también cuando el paciente pida una hora concreta: nunca la descartes tú. Te devuelve como " +
      "mucho dos horas para ofrecer, o te dice si ese día o a esa hora la clínica está cerrada. Apunta ella misma el " +
      "tratamiento y el día: no hace falta anotarlos aparte. Si el paciente cambia de día o de tratamiento, vuelve a llamarla.",
    parameters: {
      type: "object",
      properties: {
        tratamiento: { type: "string", description: "El tratamiento, como lo ha dicho el paciente." },
        fecha: { type: "string", description: "El día, en formato AAAA-MM-DD." },
        franja: { type: "string", enum: ["mañana", "tarde", "cualquiera"], description: "Si el paciente prefiere mañana o tarde." },
        hora: { type: "string", description: "Solo si el paciente ha pedido una hora concreta: HH:MM, en 24 horas." },
      },
      required: ["tratamiento", "fecha"],
    },
  },
  {
    name: "anotar",
    description:
      "Apunta en la ficha de esta llamada los datos que el paciente acaba de decir y comprueba que tienen sentido. " +
      "Llámala en cuanto te los diga, con todo lo que haya dicho en esa frase: si dice nombre y apellidos, van los dos " +
      "en la misma llamada. El tratamiento y el día no van aquí: los apunta consultar_huecos. Si te devuelve un " +
      "problema, pídeselo otra vez al paciente explicándole qué pasa; no lo corrijas ni lo completes tú. Y haz lo que " +
      "te diga la respuesta sobre el paso siguiente.",
    parameters: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "El nombre de pila de la persona que va a la cita." },
        apellidos: { type: "string", description: "Sus apellidos." },
        telefono: {
          type: "string",
          description:
            "El teléfono de contacto en cifras, tal como lo ha dicho. Si el paciente quiere que le llamen al número desde " +
            `el que llama, escribe exactamente «${TELEFONO_DE_LA_LLAMADA}».`,
        },
        quien_llama: { type: "string", description: "Solo si la cita es para otra persona: el nombre de quien llama." },
        hora: { type: "string", description: "La hora que elige el paciente entre las que le has ofrecido: HH:MM, en 24 horas." },
      },
      required: [],
    },
  },
  {
    name: "crear_cita",
    description:
      "Crea la cita en la agenda y la apunta en la hoja de la clínica, con los datos que ya has anotado en esta " +
      "llamada. Llámala SOLO cuando el paciente haya dicho que sí a la frase de confirmación, nunca antes. Si falta " +
      "algún dato o la hora ya no está libre, te dice qué pasa y no crea nada.",
    parameters: {
      type: "object",
      properties: {
        hora: { type: "string", description: "La hora confirmada por el paciente: HH:MM, en 24 horas." },
      },
      required: ["hora"],
    },
  },
  {
    name: "escalar_a_recepcion",
    description:
      "Deja un aviso para que recepción llame al paciente: cuando pide hablar con una persona, cuando no sabes " +
      "responder algo que necesita resolver, cuando quiere anular o cambiar una cita, o cuando es una urgencia que no " +
      "puedes encajar. Usa el nombre y el teléfono que ya hayas anotado; si no los tienes, pídeselos y anótalos antes.",
    parameters: {
      type: "object",
      properties: {
        motivo: { type: "string", enum: MOTIVOS_ESCALADO, description: "Por qué hay que llamarle." },
        detalle: { type: "string", description: "En una frase, qué necesita el paciente." },
      },
      required: ["motivo", "detalle"],
    },
  },
];

/** `finalizar_llamada` sigue siendo nativa de Vapi (§6): una herramienta de tipo `endCall`. */
export const HERRAMIENTA_COLGAR = { type: "endCall" } as const;

/**
 * Y además, cuelga Vapi en cuanto el bot dice esta frase (`endCallPhrases`), sin esperar a que el modelo
 * llame a la herramienta: en la llamada 2 (26-sep) se despidió y no colgó, y hubo 14 s de silencio hasta
 * que colgó el paciente. Es el final fijo de la despedida del bloque 20: una prueba lo comprueba.
 */
export const FRASE_PARA_COLGAR = "que vaya muy bien";
