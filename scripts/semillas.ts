// Filas de arranque para preparar una hoja. Se usan UNA vez, al crearla: a partir de ahí la verdad
// está en la hoja y la cambia la clínica. El compilador no lee nunca este fichero.
//
// DATOS FICTICIOS. Clínica Dentalvis es inventada (son datos de salud: PLAN.md §9). Salen del prompt
// de una pieza de la Fase 1 (fases/fase1-voz-y-cita/prompt-diego.md), pasados a filas.

import type { Semilla } from "../src/hoja/preparar.js";
import { CLAVES_CONFIG } from "../src/hoja/esquema.js";

const ayuda = (clave: keyof typeof CLAVES_CONFIG) => CLAVES_CONFIG[clave].ayuda;

const lunesAViernes = ["lunes", "martes", "miércoles", "jueves", "viernes"];

export const DENTALVIS: Semilla = {
  config: [
    { clave: "nombre_clinica", valor: "Clínica Dentalvis", público: "sí", comentario: ayuda("nombre_clinica") },
    { clave: "nombre_bot", valor: "Diego", público: "sí", comentario: ayuda("nombre_bot") },
    { clave: "trato", valor: "usted", público: "sí", comentario: ayuda("trato") },
    { clave: "zona_horaria", valor: "Europe/Madrid", público: "sí", comentario: ayuda("zona_horaria") },
    { clave: "telefono_recepcion", valor: "910 000 000", público: "sí", comentario: "FICTICIO. " + ayuda("telefono_recepcion") },
    {
      clave: "privacidad",
      valor: "Sus datos se tratan según nuestra política de privacidad, que puede consultar en nuestra página web.",
      público: "sí",
      comentario: ayuda("privacidad"),
    },
    { clave: "direccion", valor: "Calle Mayor, 47, bajo. Madrid.", público: "sí", comentario: ayuda("direccion") },
    { clave: "parking", valor: "Hay un parking público a dos calles.", público: "sí", comentario: ayuda("parking") },
    { clave: "accesibilidad", valor: "El local está a pie de calle, sin escalones.", público: "sí", comentario: ayuda("accesibilidad") },
  ],
  tratamientos: [
    { código: "REV", nombre: "Revisión o primera visita", duracion_min: "30", gabinete: "Gabinete 1", frase_para_el_bot: "La primera visita de valoración es gratuita y sin compromiso, con radiografía incluida.", público: "sí" },
    { código: "URG", nombre: "Urgencia por dolor", duracion_min: "30", gabinete: "Gabinete 1", frase_para_el_bot: "Tiene prioridad: se busca el hueco más cercano, hoy o mañana.", público: "sí" },
    { código: "LIM", nombre: "Limpieza bucal", duracion_min: "45", gabinete: "Gabinete 1", frase_para_el_bot: "", público: "sí" },
    { código: "EMP", nombre: "Empaste", duracion_min: "45", gabinete: "Gabinete 1", frase_para_el_bot: "", público: "sí" },
    { código: "EXT", nombre: "Extracción", duracion_min: "45", gabinete: "Gabinete 3", frase_para_el_bot: "", público: "sí" },
    { código: "ORT", nombre: "Primera consulta de ortodoncia", duracion_min: "45", gabinete: "Gabinete 2", frase_para_el_bot: "Brackets o alineadores invisibles.", público: "sí" },
    { código: "IMP", nombre: "Primera consulta de implantes", duracion_min: "45", gabinete: "Gabinete 3", frase_para_el_bot: "", público: "sí" },
    { código: "EST", nombre: "Primera consulta de estética dental", duracion_min: "45", gabinete: "Gabinete 1", frase_para_el_bot: "Blanqueamiento y carillas.", público: "sí" },
    { código: "PED", nombre: "Odontopediatría (niños)", duracion_min: "30", gabinete: "Gabinete 1", frase_para_el_bot: "", público: "sí" },
    // La fila confidencial de la demo (PLAN.md §7, punto 5): está en la hoja y el asistente no la ve.
    { código: "SED", nombre: "Sedación consciente, en pruebas internas", duracion_min: "90", gabinete: "Gabinete 3", frase_para_el_bot: "Todavía no se ofrece a pacientes.", público: "no" },
  ],
  faq: [
    { pregunta: "¿Cuánto cuesta la primera visita o una revisión?", respuesta: "Es gratis. La primera visita de valoración es gratuita y sin compromiso, con radiografía incluida.", categoría: "precios", público: "sí" },
    { pregunta: "¿Cuánto cuesta una limpieza?", respuesta: "La limpieza bucal cuesta 55 €. Es un precio orientativo: el exacto se confirma en la visita.", categoría: "precios", público: "sí" },
    { pregunta: "¿Cuánto cuesta un empaste?", respuesta: "Desde 60 €, como orientación. El precio exacto depende de cada caso y se ve en la visita.", categoría: "precios", público: "sí" },
    { pregunta: "¿Cuánto cuesta un blanqueamiento?", respuesta: "Desde 250 €, como orientación. El precio exacto sale de la visita de valoración.", categoría: "precios", público: "sí" },
    { pregunta: "¿Cuánto cuesta un implante, la ortodoncia, una endodoncia, una prótesis o una cirugía?", respuesta: "Depende mucho de cada caso, y por eso la primera visita es gratis: ahí le dan el presupuesto exacto. ¿Quiere que le busque cita de valoración?", categoría: "precios", público: "sí" },
    { pregunta: "¿Con qué seguros trabajáis?", respuesta: "Trabajamos con Sanitas, Adeslas, DKV y Asisa. Si es otro seguro, eso se lo confirma recepción.", categoría: "seguros", público: "sí" },
    { pregunta: "¿Se puede financiar?", respuesta: "Sí, hasta doce meses sin intereses. Los plazos concretos se ven en la clínica.", categoría: "pagos", público: "sí" },
    { pregunta: "¿Qué doctores hay?", respuesta: "La doctora Elena Ruiz, de odontología general y estética dental; el doctor Javier Soler, de implantes y cirugía; la doctora Marta Peña, de ortodoncia; y el doctor Andrés Gil, de odontopediatría. Qué doctor está cada día lo confirma recepción.", categoría: "equipo", público: "sí" },
    { pregunta: "¿Qué tratamientos hacéis?", respuesta: "Revisiones, higiene y limpieza bucal, empastes, endodoncias, extracciones, ortodoncia con brackets y alineadores invisibles, implantes, prótesis, blanqueamiento, odontopediatría y urgencias por dolor.", categoría: "clínica", público: "sí" },
    // Las dos filas confidenciales: un coste de laboratorio y un acuerdo con una mutua (PLAN.md §1).
    { pregunta: "¿Cuánto nos cuesta una corona de zirconio en el laboratorio?", respuesta: "El laboratorio nos la cobra a 140 €. Margen objetivo sobre la corona: 60 %.", categoría: "interno", público: "no" },
    { pregunta: "Acuerdo con la mutua", respuesta: "Descuento pactado del 15 % sobre tarifa en implantes. No comunicar a pacientes.", categoría: "interno", público: "no" },
  ],
  horarios: [
    ...lunesAViernes.flatMap((día) => [
      { día, de: "9:00", a: "14:00" },
      { día, de: "16:00", a: "20:00" },
    ]),
    { día: "sábado", de: "9:00", a: "14:00" },
  ],
};

/** La plantilla vacía: una fila de ejemplo por pestaña, marcadas para que se vea que hay que cambiarlas. */
export const PLANTILLA: Semilla = {
  config: (Object.keys(CLAVES_CONFIG) as (keyof typeof CLAVES_CONFIG)[]).map((clave) => ({
    clave,
    valor: {
      nombre_clinica: "EJEMPLO: Clínica Nombre",
      nombre_bot: "EJEMPLO: Lucía",
      trato: "usted",
      zona_horaria: "Europe/Madrid",
      telefono_recepcion: "EJEMPLO: 910 000 000",
      privacidad: "Puede consultar cómo tratamos sus datos en nuestra página web.",
      direccion: "EJEMPLO: Calle, número, ciudad",
      parking: "EJEMPLO: Hay parking público a dos calles.",
      accesibilidad: "EJEMPLO: El local está a pie de calle, sin escalones.",
      mensaje_urgencia: "",
    }[clave],
    público: "sí",
    comentario: (CLAVES_CONFIG[clave].obligatoria ? "OBLIGATORIA. " : "") + CLAVES_CONFIG[clave].ayuda,
  })),
  tratamientos: [
    { código: "REV", nombre: "EJEMPLO: Revisión", duracion_min: "30", gabinete: "Gabinete 1", frase_para_el_bot: "EJEMPLO: La primera visita es gratuita.", público: "sí" },
    { código: "INT", nombre: "EJEMPLO de fila confidencial: tratamiento en pruebas", duracion_min: "60", gabinete: "Gabinete 1", frase_para_el_bot: "", público: "no" },
  ],
  faq: [
    { pregunta: "EJEMPLO: ¿Cuánto cuesta una limpieza?", respuesta: "EJEMPLO: La limpieza cuesta 50 €. Es un precio orientativo.", categoría: "precios", público: "sí" },
    { pregunta: "EJEMPLO de fila confidencial: coste de laboratorio", respuesta: "EJEMPLO: El laboratorio nos cobra 100 € por corona.", categoría: "interno", público: "no" },
  ],
  horarios: [
    { día: "lunes", de: "9:00", a: "14:00" },
    { día: "lunes", de: "16:00", a: "20:00" },
  ],
};
