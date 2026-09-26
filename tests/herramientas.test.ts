// Las cuatro herramientas propias, de principio a fin, sin red. Lo que se comprueba es lo que le llega al
// modelo (el texto) y lo que queda en la agenda, la hoja, la ficha y los bloqueos.

import { describe, expect, it } from "vitest";
import { instante } from "../src/agenda/tiempo.js";
import { entorno, DOMINGO, llamadaTelefono, llamadaWeb, MARTES, ZONA } from "./comun/entorno-herramientas.js";

const t = (fecha: string, hora: string) => instante(fecha, hora, ZONA).getTime();
const ofrecidas = async (e: ReturnType<typeof entorno>, llamada = "llamada-web-1") =>
  JSON.parse((await e.fichas.leer(llamada)).ofrecidas ?? "[]").map((o: { hora: string }) => o.hora);

describe("consultar_huecos", () => {
  it("ofrece dos horas, una de mañana y otra de tarde, en palabras, y apunta tratamiento y día", async () => {
    const e = entorno();
    const r = await e.llamar("consultar_huecos", { tratamiento: "una limpieza", fecha: MARTES });
    expect(r).toContain("El martes veintinueve de septiembre, para Limpieza bucal (45 minutos), tengo a las nueve de la mañana [09:00] o a las cuatro de la tarde [16:00]");
    expect(r).toContain("apúntala con anotar (hora)");
    expect(await ofrecidas(e)).toEqual(["09:00", "16:00"]);
    expect(await e.fichas.leer("llamada-web-1")).toMatchObject({ tratamiento: "LIM", fecha: MARTES });
  });

  it("una hora concreta libre se reserva y queda elegida", async () => {
    const e = entorno();
    const r = await e.llamar("consultar_huecos", { tratamiento: "Limpieza bucal", fecha: MARTES, hora: "18:00" });
    expect(r).toMatch(/^Libre: el martes veintinueve de septiembre, a las seis de la tarde \[18:00\]/);
    expect((await e.fichas.leer("llamada-web-1")).hora).toBe("18:00");
  });

  it("una hora ocupada en el calendario: lo dice y ofrece las más cercanas", async () => {
    const e = entorno();
    e.agenda.ocupar("cal-g1", t(MARTES, "18:00"), t(MARTES, "18:45"));
    const r = await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" });
    expect(r).toContain("esa hora ya está cogida");
    expect(r).toContain("a las cinco y cuarto de la tarde [17:15] o a las siete menos cuarto de la tarde [18:45]");
  });

  it("una hora que no cabe antes del cierre lo explica con la duración", async () => {
    const r = await entorno().llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "13:30" });
    expect(r).toContain("no da tiempo antes de que cierre: Limpieza bucal dura 45 minutos");
  });

  it("un domingo: cerrado, y el primer día con hueco", async () => {
    const e = entorno();
    const r = await e.llamar("consultar_huecos", { tratamiento: "revisión", fecha: "2026-10-04" });
    expect(r).toMatch(/^El domingo cuatro de octubre la clínica está cerrada\. El primer día con hueco es el lunes cinco de octubre \[2026-10-05\]/);
    expect((await e.fichas.leer("llamada-web-1")).fecha).toBe("2026-10-05");
    // Y si el domingo es mañana, se dice así.
    expect(await e.llamar("consultar_huecos", { tratamiento: "revisión", fecha: DOMINGO })).toMatch(/^Mañana, domingo veintisiete de septiembre la clínica está cerrada/);
  });

  it("por la tarde: las dos de tarde; y si no queda tarde, lo dice y da las de la mañana", async () => {
    const e = entorno();
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, franja: "tarde" })).toContain("[16:00] o a las");
    expect(await ofrecidas(e)).toEqual(["16:00", "18:00"]);
    const e2 = entorno();
    e2.agenda.ocupar("cal-g1", t(MARTES, "16:00"), t(MARTES, "20:00"));
    const r = await e2.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, franja: "tarde" });
    expect(r).toContain("por la tarde ya no me queda nada para Limpieza bucal, pero tengo a las nueve de la mañana [09:00]");
  });

  it("lo confidencial no se encuentra ni se nombra; lo ambiguo se pregunta", async () => {
    const e = entorno();
    const r = await e.llamar("consultar_huecos", { tratamiento: "sedación", fecha: MARTES });
    expect(r).toContain("No encuentro «sedación»");
    expect(r).not.toMatch(/Sedaci[oó]n consciente/i);
    expect(await e.llamar("consultar_huecos", { tratamiento: "primera consulta", fecha: MARTES })).toMatch(/puede ser más de uno: .*ortodoncia.*implantes/);
    expect(await e.llamar("consultar_huecos", { tratamiento: "implante", fecha: MARTES })).toContain("Primera consulta de implantes");
  });

  it("fechas imposibles, pasadas o demasiado lejanas", async () => {
    const e = entorno();
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: "29/09/2026" })).toContain("AAAA-MM-DD");
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: "2026-09-25" })).toContain("ya ha pasado: hoy es el sábado veintiséis de septiembre");
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: "2027-06-01" })).toContain("Solo doy citas hasta");
  });

  it("un gabinete sin calendario en la ficha: no se inventa una hora, se pasa a recepción", async () => {
    const e = entorno();
    expect(await e.llamar("consultar_huecos", { tratamiento: "RAR", fecha: MARTES })).toContain("no la puedo dar yo por teléfono");
    expect(e.registro.some((l) => l.includes("Gabinete 9"))).toBe(true);
  });

  it("DOS LLAMADAS A LA VEZ: la segunda no puede llevarse la hora que tiene reservada la primera", async () => {
    const e = entorno();
    const [a, b] = await Promise.all([
      e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamadaWeb("A")),
      e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamadaWeb("B")),
    ]);
    expect([a, b].filter((r) => r.startsWith("Libre")).length).toBe(1);
    expect([a, b].filter((r) => r.includes("esa hora ya está cogida")).length).toBe(1);
  });

  it("volver a consultar suelta lo que la llamada tenía reservado", async () => {
    const e = entorno();
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamadaWeb("A"));
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: "2026-09-30" }, llamadaWeb("A"));
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamadaWeb("B"))).toMatch(/^Libre/);
  });
});

describe("anotar", () => {
  it("nombre y apellidos a la vez; en una llamada web dice que NO hay número", async () => {
    const r = await entorno().llamar("anotar", { nombre: "juan ramón", apellidos: "ramírez" });
    expect(r).toMatch(/^Anotado\./);
    expect(r).toContain("Esta llamada NO trae número");
    expect(r).toContain("no ofrezcas «este mismo número»");
  });

  it("en una llamada de teléfono dice que puede ofrecer ese número, sin recitarlo", async () => {
    const e = entorno();
    const r = await e.llamar("anotar", { nombre: "Ana", apellidos: "Pérez" }, llamadaTelefono());
    expect(r).toContain("Esta llamada viene de un número");
    expect(r).not.toContain("612345678");
    const r2 = await e.llamar("anotar", { telefono: "el de esta llamada" }, llamadaTelefono());
    expect(r2).toContain("Apuntado el número desde el que llama");
    expect((await e.fichas.leer("llamada-tel-1")).telefono).toBe("612345678");
  });

  it("«el de esta llamada» sin número, o el hueco sin rellenar: se rechaza", async () => {
    const e = entorno();
    expect(await e.llamar("anotar", { telefono: "el de esta llamada" })).toContain("esta llamada no trae número");
    expect(await e.llamar("anotar", { telefono: "{{customer.number}}" })).toContain("No ofrezcas «este mismo número»");
    expect((await e.fichas.leer("llamada-web-1")).telefono).toBeUndefined();
  });

  it("el teléfono dictado vuelve en palabras, para leerlo tal cual: nada de «coma» ni de cifras", async () => {
    const r = await entorno().llamar("anotar", { telefono: "612 34 56 66" });
    expect(r).toContain("«seis, uno, dos, tres, cuatro, cinco, seis, seis, seis»");
    expect(r).not.toMatch(/\bcoma\b|\d/);
  });

  it("un teléfono corto: el problema concreto, y no se apunta", async () => {
    const e = entorno();
    const r = await e.llamar("anotar", { telefono: "61234566" });
    expect(r).toContain("faltan dígitos: solo tiene 8");
    expect(r).toContain("Pídeselo otra vez");
    expect((await e.fichas.leer("llamada-web-1")).telefono).toBeUndefined();
  });

  it("si el nombre trae también los apellidos, se quitan del nombre", async () => {
    const e = entorno();
    await e.llamar("anotar", { nombre: "Juan Ramón Ramírez", apellidos: "Ramírez" });
    expect(await e.fichas.leer("llamada-web-1")).toMatchObject({ nombre: "Juan Ramón", apellidos: "Ramírez" });
  });

  it("elegir una de las dos horas suelta la otra, que ya puede coger otra llamada", async () => {
    const e = entorno();
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES }, llamadaWeb("A"));
    await e.llamar("anotar", { hora: "16:00" }, llamadaWeb("A"));
    expect(await ofrecidas(e, "A")).toEqual(["16:00"]);
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "09:00" }, llamadaWeb("B"))).toMatch(/^Libre/);
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "16:00" }, llamadaWeb("C"))).toContain("ya está cogida");
  });

  it("una hora que no se ha consultado no se anota", async () => {
    const e = entorno();
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES });
    expect(await e.llamar("anotar", { hora: "11:00" })).toContain("La hora 11:00 no la has consultado");
  });

  it("dice lo que falta, y cuando está todo, que confirme y llame a crear_cita", async () => {
    const e = entorno();
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" });
    expect(await e.llamar("anotar", { nombre: "Ana", apellidos: "Pérez" })).toContain("Para la cita falta el teléfono.");
    expect(await e.llamar("anotar", { telefono: "612345666" })).toContain("Ya está todo para la cita");
  });

  it("sin datos, lo dice", async () => {
    expect(await entorno().llamar("anotar", {})).toContain("No me has pasado ningún dato");
  });
});

async function hastaConfirmar(e: ReturnType<typeof entorno>, llamada = llamadaWeb()) {
  await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamada);
  await e.llamar("anotar", { nombre: "Juan Ramón", apellidos: "Ramírez", telefono: "612345666" }, llamada);
}

describe("crear_cita", () => {
  it("crea el evento y la fila en Citas, suelta el bloqueo y deja la ficha lista para otra cita", async () => {
    const e = entorno();
    await hastaConfirmar(e);
    const r = await e.llamar("crear_cita", { hora: "18:00" });
    expect(r).toBe(
      "Cita creada: el martes veintinueve de septiembre, a las seis de la tarde, Limpieza bucal, a nombre de Juan Ramón Ramírez. " +
        "Díselo así y pregúntale si necesita algo más. Si quiere otra cita, sea para quien sea, vuelve a anotar el nombre y los apellidos.",
    );
    const eventos = [...e.agenda.eventos.values()];
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ calendario: "cal-g1", inicio: t(MARTES, "18:00"), fin: t(MARTES, "18:45"), resumen: "Limpieza bucal · Juan Ramón Ramírez", vivo: true });
    expect(e.filas("Citas")).toEqual([
      expect.objectContaining({
        fecha_creacion: "2026-09-26 14:00", fecha_cita: MARTES, hora_cita: "18:00", duracion_min: 45, tratamiento: "Limpieza bucal",
        gabinete: "Gabinete 1", paciente: "Juan Ramón Ramírez", telefono: "612345666", id_evento: eventos[0]!.id, estado: "confirmada", id_llamada: "llamada-web-1",
      }),
    ]);
    const ficha = await e.fichas.leer("llamada-web-1");
    expect(ficha.nombre).toBeUndefined();
    expect(ficha.telefono).toBe("612345666");
    // El bloqueo se ha soltado, pero la hora ya está en el calendario: nadie más la puede coger.
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamadaWeb("B"))).toContain("ya está cogida");
  });

  it("si Vapi la repite, contesta lo mismo y no crea otra", async () => {
    const e = entorno();
    await hastaConfirmar(e);
    const primera = await e.llamar("crear_cita", { hora: "18:00" });
    expect(await e.llamar("crear_cita", { hora: "18:00" })).toBe(primera);
    expect(e.agenda.eventos.size).toBe(1);
    expect(e.filas("Citas")).toHaveLength(1);
  });

  it("sin teléfono no crea nada", async () => {
    const e = entorno();
    await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" });
    await e.llamar("anotar", { nombre: "Ana", apellidos: "Pérez" });
    expect(await e.llamar("crear_cita", { hora: "18:00" })).toContain("falta el teléfono");
    expect(e.agenda.eventos.size).toBe(0);
  });

  it("una hora que no está reservada para la llamada, no", async () => {
    const e = entorno();
    await hastaConfirmar(e);
    expect(await e.llamar("crear_cita", { hora: "10:00" })).toContain("no está reservada para esta llamada");
  });

  it("si la hoja falla, se deshace el evento y el bot sabe que NO está citado", async () => {
    const e = entorno();
    await hastaConfirmar(e);
    e.hoja.hojas.delete("Citas");
    const r = await e.llamar("crear_cita", { hora: "18:00" });
    expect(r).toContain("NO está citado");
    expect([...e.agenda.eventos.values()].every((x) => !x.vivo)).toBe(true);
  });

  it("si Calendar falla, no hay fila en Citas", async () => {
    const e = entorno();
    await hastaConfirmar(e);
    e.agenda.fallarAlCrear = true;
    expect(await e.llamar("crear_cita", { hora: "18:00" })).toContain("NO está citado");
    expect(e.filas("Citas")).toHaveLength(0);
  });

  it("si el bloqueo caducó y otra llamada cogió la hora, lo dice y no la pisa", async () => {
    const e = entorno({ caducidadMs: 40 });
    await hastaConfirmar(e, llamadaWeb("A"));
    await new Promise((r) => setTimeout(r, 60));
    expect(await e.llamar("consultar_huecos", { tratamiento: "limpieza", fecha: MARTES, hora: "18:00" }, llamadaWeb("B"))).toMatch(/^Libre/);
    expect(await e.llamar("crear_cita", { hora: "18:00" }, llamadaWeb("A"))).toContain("se la acaba de llevar otra persona");
    expect(e.agenda.eventos.size).toBe(0);
  });

  it("si alguien la ocupó a mano en el calendario después de consultar, tampoco", async () => {
    const e = entorno();
    await hastaConfirmar(e);
    e.agenda.ocupar("cal-g1", t(MARTES, "18:30"), t(MARTES, "19:00"));
    expect(await e.llamar("crear_cita", { hora: "18:00" })).toContain("acaba de ocuparse en la agenda");
    expect(e.agenda.eventos.size).toBe(0);
  });
});

describe("escalar_a_recepcion", () => {
  it("sin teléfono lo pide una vez; si insiste, deja el aviso sin teléfono", async () => {
    const e = entorno();
    const args = { motivo: "hablar con una persona", detalle: "Quiere hablar con la doctora" };
    expect(await e.llamar("escalar_a_recepcion", args)).toContain("necesito un teléfono para que le llamen");
    expect(e.filas("Escalados")).toHaveLength(0);
    expect(await e.llamar("escalar_a_recepcion", args)).toContain("sin teléfono");
    expect(e.filas("Escalados")).toEqual([expect.objectContaining({ motivo: "hablar con una persona", estado: "pendiente", telefono: "", id_llamada: "llamada-web-1" })]);
  });

  it("con nombre y teléfono, una fila; repetida, sigue siendo una", async () => {
    const e = entorno();
    await e.llamar("anotar", { nombre: "Ana", apellidos: "Pérez", telefono: "612345666" });
    const args = { motivo: "anular o cambiar cita", detalle: "Quiere cambiar la cita del jueves" };
    expect(await e.llamar("escalar_a_recepcion", args)).toContain("Aviso dejado para recepción");
    await e.llamar("escalar_a_recepcion", args);
    expect(e.filas("Escalados")).toEqual([expect.objectContaining({ nombre: "Ana Pérez", telefono: "612345666", motivo: "anular o cambiar cita" })]);
  });

  it("un motivo que no existe se apunta como «sin resolver»", async () => {
    const e = entorno();
    await e.llamar("anotar", { telefono: "612345666" });
    await e.llamar("escalar_a_recepcion", { motivo: "otra cosa", detalle: "Pregunta rara" });
    expect(e.filas("Escalados")[0]!.motivo).toBe("sin resolver");
  });
});
