// Del contenido filtrado al texto publicado, con el contenido REAL de contenido/ y la ficha de
// Dentalvis tal como queda en la hoja.

import { describe, expect, it } from "vitest";
import { leerBloques, leerMensajes } from "../src/compilador/bloques.js";
import { compilarFicha, ErrorDeRender, rellenar } from "../src/compilador/render.js";
import { ErrorDeFiltro } from "../src/compilador/filtro.js";
import { PESTANAS } from "../src/hoja/esquema.js";
import { fichaDentalvis, fichaDesdeMatrices, matricesDe } from "./ayudas.js";

const contenido = () => ({ bloques: leerBloques(), mensajes: leerMensajes() });

describe("Dentalvis compila con el contenido real", () => {
  const c = compilarFicha(fichaDentalvis("1IXd-hoja"), contenido());

  it("el contador dice lo que se enseña en la demo", () => {
    expect(c.contadores).toEqual([
      { pestana: "Config", leidas: 9, cargadas: 9, confidenciales: 0, sinMarcar: 0 },
      { pestana: "Tratamientos", leidas: 10, cargadas: 9, confidenciales: 1, sinMarcar: 0 },
      { pestana: "FAQ", leidas: 11, cargadas: 9, confidenciales: 2, sinMarcar: 0 },
    ]);
    expect(c.tramos).toBe(11);
  });

  it("lo confidencial no está en NINGUNO de los textos publicados", () => {
    const todo = [c.prompt, c.firstMessage, c.endCallMessage, c.voicemailMessage].join("\n");
    for (const secreto of ["140 €", "60 %", "15 %", "Sedación", "laboratorio nos la cobra", "mutua", "No comunicar"]) {
      expect(todo).not.toContain(secreto);
    }
  });

  it("lo público sí está", () => {
    expect(c.prompt).toContain("La limpieza bucal cuesta 55 €");
    expect(c.prompt).toContain("- Limpieza bucal: dura 45 minutos.");
    expect(c.prompt).toContain("- Sábado: de 09:00 a 14:00");
    expect(c.prompt).toContain("- Domingo: cerrado");
    expect(c.prompt).toContain("- Teléfono de recepción: 910 000 000");
  });

  it("los huecos de Vapi quedan INTACTOS para que los resuelva en cada llamada", () => {
    expect(c.prompt).toContain('{{"now" | date: "%Y-%m-%d %H:%M", "Europe/Madrid"}}');
    expect(c.prompt).toContain('{{"now" | date: "%A", "Europe/Madrid"}}');
  });

  it("no queda ningún hueco del compilador sin rellenar", () => {
    for (const hueco of ["clinica", "bot", "trato", "privacidad", "datos", "tratamientos", "faq", "horario", "ahora", "dia_semana"]) {
      expect(c.prompt).not.toContain(`{{${hueco}}}`);
    }
  });

  it("los tres mensajes fijos salen de Config, no escritos a mano", () => {
    expect(c.firstMessage).toBe(
      "Clínica Dentalvis, le atiende Diego, el asistente virtual de la clínica. Sus datos se tratan según nuestra política de privacidad, que puede consultar en nuestra página web. Dígame, ¿en qué puedo ayudarle?",
    );
    expect(c.endCallMessage).toBe("Gracias por llamar a Clínica Dentalvis. Que vaya muy bien.");
    expect(c.voicemailMessage).toContain("Ha llamado a Clínica Dentalvis.");
  });

  it("el prompt no lleva la hoja ni el número de la llamada: eso lo saben las herramientas", () => {
    // Fase 3: la fila de cada llamada la escribe el servidor, y si hay número lo dice `anotar` en su
    // respuesta. Con {{customer.number}} en el prompt, el bot ofreció «este mismo número» sin haberlo.
    expect(c.prompt).not.toContain("1IXd-hoja");
    expect(c.prompt).not.toContain("{{customer.number}}");
    expect(c.prompt).not.toMatch(/google_sheets_tool|google_calendar/);
  });

  it("el orden de los bloques es el del frontmatter", () => {
    const pos = ["ERES UN ASISTENTE VIRTUAL", "QUÉ DÍA Y QUÉ HORA ES", "CÓMO HABLAS", "NO INTERPRETES", "NO TE INVENTES NADA", "SI AL OTRO LADO", "CÓMO COGES UNA CITA", "CUÁNDO PASAS A UNA PERSONA", "DATOS DE LA CLÍNICA"].map((t) => c.prompt.indexOf(t));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });
});

describe("cambiar la hoja cambia lo que dice el bot", () => {
  it("un precio nuevo en la FAQ sale en el prompt (el entregable de la fase)", () => {
    const m = matricesDe();
    const fila = m.faq.findIndex((r) => r[0] === "¿Cuánto cuesta una limpieza?");
    m.faq[fila]![1] = "La limpieza bucal cuesta 60 €.";
    const c = compilarFicha(fichaDesdeMatrices(m), contenido());
    expect(c.prompt).toContain("La limpieza bucal cuesta 60 €.");
    expect(c.prompt).not.toContain("cuesta 55 €");
  });

  it("trato «tú» cambia la instrucción y el saludo", () => {
    const m = matricesDe();
    m.config.find((r) => r[0] === "trato")![1] = "tú";
    const c = compilarFicha(fichaDesdeMatrices(m), contenido());
    expect(c.prompt).toContain("Tutea a quien llama.");
    expect(c.firstMessage).toMatch(/^Clínica Dentalvis, te atiende Diego/);
  });

  it("otro nombre de bot cambia el saludo, no solo el prompt", () => {
    const m = matricesDe();
    m.config.find((r) => r[0] === "nombre_bot")![1] = "Lucía";
    const c = compilarFicha(fichaDesdeMatrices(m), contenido());
    expect(c.firstMessage).toContain("le atiende Lucía");
    expect(c.prompt).not.toContain("Diego");
  });
});

describe("no se publica nada dudoso", () => {
  const conCambio = (cambio: (m: ReturnType<typeof matricesDe>) => void) => {
    const m = matricesDe();
    cambio(m);
    return () => compilarFicha(fichaDesdeMatrices(m), contenido());
  };

  it("llaves en una respuesta (Vapi las ejecutaría como plantilla)", () => {
    expect(conCambio((m) => (m.faq[1]![1] = "Cuesta {{precio}} euros"))).toThrow(/llaves/);
    expect(conCambio((m) => (m.faq[1]![1] = "{% if x %}sí{% endif %}"))).toThrow(/llaves/);
  });

  it("un valor raro en «público» de cualquier pestaña", () => {
    expect(conCambio((m) => (m.tratamientos[3]![5] = "quizá"))).toThrow(ErrorDeFiltro);
    expect(conCambio((m) => (m.config[2]![2] = "x"))).toThrow(ErrorDeFiltro);
  });

  it("una clave obligatoria de Config que no es pública", () => {
    expect(conCambio((m) => (m.config.find((r) => r[0] === "nombre_bot")![2] = "no"))).toThrow(/nombre_bot/);
  });

  it("una clave de Config repetida", () => {
    expect(conCambio((m) => m.config.push(["trato", "tú", "sí", ""]))).toThrow(/dos veces/);
  });

  it("un trato que no es usted ni tú", () => {
    expect(conCambio((m) => (m.config.find((r) => r[0] === "trato")![1] = "de vos"))).toThrow(/trato/);
  });

  it("una zona horaria que no existe", () => {
    expect(conCambio((m) => (m.config.find((r) => r[0] === "zona_horaria")![1] = "Madrid"))).toThrow(/zona horaria/);
  });

  it("la privacidad como enlace en vez de frase", () => {
    expect(conCambio((m) => (m.config.find((r) => r[0] === "privacidad")![1] = "https://dentalvis.es/privacidad"))).toThrow(/frase/);
  });

  it("un tratamiento público con la duración en letras", () => {
    expect(conCambio((m) => (m.tratamientos[1]![2] = "media hora"))).toThrow(/duración/);
  });

  it("una FAQ pública sin respuesta", () => {
    expect(conCambio((m) => (m.faq[1]![1] = ""))).toThrow(/respuesta/);
  });

  it("un horario con tramos que se pisan", () => {
    expect(conCambio((m) => m.horarios.push(["lunes", "13:00", "15:00"]))).toThrow(/se pisan/);
  });

  it("un horario con una hora mal escrita", () => {
    expect(conCambio((m) => (m.horarios[1]![1] = "nueve"))).toThrow();
  });

  it("una fila confidencial que repite el texto de una pública", () => {
    expect(
      conCambio((m) => m.faq.push(["¿Precio interno?", "La limpieza bucal cuesta 55 €. Es un precio orientativo: el exacto se confirma en la visita.", "", "no"])),
    ).toThrow(/no es público/);
  });

  it("una nota suelta en Horarios se ignora con aviso, no para", () => {
    const m = matricesDe();
    m.horarios.push(["Agosto: cerrado por vacaciones", "", ""]);
    const c = compilarFicha(fichaDesdeMatrices(m), contenido());
    expect(c.avisos.join(" ")).toMatch(/nota suelta/);
    expect(c.prompt).not.toContain("Agosto");
  });

  it("una nota suelta bajo Tratamientos no se carga, avisa y SÍ publica", () => {
    const m = matricesDe();
    m.tratamientos.push([], ["OJO, subir precios en enero"]);
    const c = compilarFicha(fichaDesdeMatrices(m), contenido());
    expect(c.contadores[1]).toMatchObject({ leidas: 11, cargadas: 9, sinMarcar: 1 });
    expect(c.prompt).not.toContain("subir precios");
  });
});

describe("rellenar huecos", () => {
  it("un hueco que no existe en ningún mundo es un error, no un hueco vacío", () => {
    expect(() => rellenar("Hola {{clinicaa}}", { clinica: "X" }, "prueba")).toThrow(ErrorDeRender);
  });

  it("las variables de Vapi se respetan tal cual", () => {
    const t = 'A {{customer.number}} B {{ now }} C {{"now" | date: "%H:%M", "Europe/Madrid"}}';
    expect(rellenar(t, {}, "prueba")).toBe(t);
  });

  it("una expresión Liquid que no es de fecha de Vapi es un error", () => {
    expect(() => rellenar('{{ customer.number | upcase }}', {}, "prueba")).toThrow(ErrorDeRender);
  });

  it("etiquetas {% %} en un bloque son un error", () => {
    expect(() => rellenar("{% if x %}hola{% endif %}", {}, "prueba")).toThrow(/etiqueta/);
  });

  it("si un valor insertado trae unas llaves que no son de Vapi, también para", () => {
    expect(() => rellenar("{{a}}", { a: "{{b}}", b: "NO" }, "prueba")).toThrow(ErrorDeRender);
  });
});

it("la plantilla de pestañas coincide con el PLAN.md §4", () => {
  expect(Object.values(PESTANAS).map((p) => p.nombre)).toEqual(["Config", "Tratamientos", "FAQ", "Horarios", "Citas", "Llamadas", "Escalados"]);
  expect(PESTANAS.llamadas.columnas).toEqual(["fecha", "duracion", "telefono", "resumen", "transcripcion", "motivo_fin", "coste", "id_llamada"]);
  for (const p of [PESTANAS.citas, PESTANAS.llamadas, PESTANAS.escalados]) expect(p.columnas).toContain("id_llamada");
});
