// Las cuatro herramientas propias (PLAN.md §6). Cada una recibe los argumentos que manda el modelo y
// devuelve UN texto para él: qué ha pasado y qué hacer ahora. Ese texto es lo que el bot tiene delante
// en el momento de hablar, así que lo que importa se le dice aquí y no en una regla lejana del prompt
// (lección de la llamada 1: con `{{customer.number}}` en el prompt, ofreció «este mismo número» sin
// haber número).
//
// Reglas comunes:
// - Lo que el paciente dicta se valida en el momento (`anotar`), y lo que se agenda sale de la ficha de
//   la llamada ya validada, no de lo que el modelo vuelva a teclear al final.
// - Fechas y horas se le dan al modelo en palabras, que es como tiene que decirlas; entre corchetes, la
//   forma que tiene que devolver a las herramientas.
// - Solo tratamientos públicos (ver clinica.ts).

import { idDeEvento, type Agenda } from "../agenda/calendario.js";
import { enFranja, HORIZONTE_DIAS, horaExacta, huecosDelDia, ordenParaOfrecer, type Franja, type Hueco } from "../agenda/huecos.js";
import { fechaEnPalabras, horaEnPalabras } from "../agenda/palabras.js";
import { diaDeLaSemana, enZona, esFecha, hoy, instante, normalizarHora, sumarDias, type Fecha, type Hora } from "../agenda/tiempo.js";
import type { Bloqueos, Intervalo } from "../bloqueo/bloqueos.js";
import type { Candados } from "../bloqueo/candado.js";
import { PESTANAS } from "../hoja/esquema.js";
import type { Escritor } from "../hoja/escritor.js";
import type { DatosAnotados, Fichas } from "../llamada/ficha.js";
import type { LlamadaVapi } from "../vapi/contrato.js";
import { buscarTratamiento, type Clinica } from "./clinica.js";
import { MOTIVOS_ESCALADO, TELEFONO_DE_LA_LLAMADA, type MotivoEscalado } from "./definiciones.js";
import { validarNombre, validarTelefono } from "./validacion.js";

export interface Dependencias {
  fichas: Fichas;
  bloqueos: Bloqueos;
  candados: Candados;
  agenda: Agenda;
  escritor: (spreadsheetId: string) => Escritor;
  ahora: () => Date;
  registrar: (linea: string) => void;
}

export interface Contexto {
  llamada: LlamadaVapi;
  clinica: Clinica;
  dep: Dependencias;
}

export type Argumentos = Record<string, unknown>;

/** Una hora reservada y ofrecida, con todo lo que hace falta para citar sin volver a la hoja. */
export interface Ofrecida {
  fecha: Fecha;
  hora: Hora;
  inicio: number;
  fin: number;
  calendario: string;
  gabinete: string;
  tratamiento: string;
  duracion: number;
}

/** Días que se miran hacia delante cuando el pedido no tiene hueco. */
export const DIAS_DE_BUSQUEDA = 14;

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const intervalo = (o: Pick<Ofrecida, "calendario" | "fecha" | "inicio" | "fin">): Intervalo => ({
  calendario: o.calendario, fecha: o.fecha, inicio: o.inicio, fin: o.fin,
});
const etiqueta = (o: { hora: Hora }) => `${horaEnPalabras(o.hora)} [${o.hora}]`;
const enLista = (os: readonly { hora: Hora }[]) => (os.length === 1 ? etiqueta(os[0]!) : `${etiqueta(os[0]!)} o ${etiqueta(os[1]!)}`);
const hoyEn = (ctx: Contexto) => hoy(ctx.clinica.zona, ctx.dep.ahora());
const ahoraEn = (ctx: Contexto) => {
  const z = enZona(ctx.dep.ahora(), ctx.clinica.zona);
  return `${z.fecha} ${z.hora}`;
};
const CORCHETES = "Lo que va entre corchetes es para las herramientas: no lo digas.";

function leerOfrecidas(ficha: DatosAnotados): Ofrecida[] {
  try {
    const v: unknown = JSON.parse(ficha.ofrecidas ?? "[]");
    return Array.isArray(v) ? (v as Ofrecida[]) : [];
  } catch {
    return [];
  }
}

// ==================================================================================================
// consultar_huecos

export async function consultarHuecos(ctx: Contexto, args: Argumentos): Promise<string> {
  const { clinica, dep, llamada } = ctx;
  const pedido = texto(args.tratamiento);
  const fecha = texto(args.fecha);
  const franja: Franja = (["mañana", "tarde"] as const).find((f) => f === texto(args.franja)) ?? "cualquiera";
  const horaPedida = texto(args.hora) ? normalizarHora(texto(args.hora)) : null;
  if (texto(args.hora) && !horaPedida) return "La hora tiene que ir como HH:MM, en 24 horas (por ejemplo, 17:30). Vuelve a llamarme con ella bien escrita.";

  const busqueda = buscarTratamiento(pedido, clinica.tratamientos);
  if ("ninguno" in busqueda) {
    return (
      `No encuentro «${pedido}» entre los tratamientos que puedo citar, que son: ${clinica.tratamientos.map((t) => t.nombre).join(", ")}. ` +
      "Pregúntale al paciente cuál necesita. Si no es ninguno, ofrécele dejar un aviso a recepción con escalar_a_recepcion."
    );
  }
  if ("varios" in busqueda) {
    return `«${pedido}» puede ser más de uno: ${busqueda.varios.map((t) => t.nombre).join(" o ")}. Pregúntale cuál es y vuelve a llamarme.`;
  }
  const t = busqueda.es;
  const calendario = clinica.ficha.calendarios[t.gabinete.trim()];
  if (!t.duracionMin || !calendario) {
    dep.registrar(`⚠ ${t.codigo || t.nombre}: ${!t.duracionMin ? "sin duracion_min" : `el gabinete «${t.gabinete}» no tiene calendario en la ficha`}`);
    return `La cita de ${t.nombre} no la puedo dar yo por teléfono. Ofrécele dejar un aviso a recepción con escalar_a_recepcion (motivo «sin resolver») para que le llamen.`;
  }

  const hoyF = hoyEn(ctx);
  if (!esFecha(fecha)) return `La fecha tiene que ir como AAAA-MM-DD (hoy es ${fechaEnPalabras(hoyF)} [${hoyF}]). Vuelve a llamarme con ella bien escrita.`;
  if (fecha < hoyF) return `Esa fecha ya ha pasado: hoy es ${fechaEnPalabras(hoyF)} [${hoyF}]. Pregúntale qué día quiere.`;
  const limite = sumarDias(hoyF, HORIZONTE_DIAS);
  if (fecha > limite) return `Solo doy citas hasta ${fechaEnPalabras(limite, hoyF)}. Pregúntale por un día antes.`;

  // Una sola consulta al calendario para el día pedido y los siguientes, por si hay que buscar más allá.
  const fin = sumarDias(fecha, DIAS_DE_BUSQUEDA);
  const ocupado = await dep.agenda.ocupado(calendario, instante(fecha, "00:00", clinica.zona).getTime(), instante(fin, "00:00", clinica.zona).getTime());
  // Consultar otra vez es empezar de nuevo: lo que tuviera reservado esta llamada se suelta.
  await dep.bloqueos.soltar(llamada.id);
  await dep.fichas.olvidar(llamada.id, ["hora", "ofrecidas"]);
  await dep.fichas.anotar(llamada.id, { tratamiento: t.codigo || t.nombre, fecha });

  const base = { duracionMin: t.duracionMin, tramos: clinica.tramos, zona: clinica.zona, ocupado, ahora: dep.ahora() };
  const aOfrecida = (h: Hueco): Ofrecida => ({ ...h, calendario, gabinete: t.gabinete.trim(), tratamiento: t.nombre, duracion: t.duracionMin! });
  const reservar = async (lista: readonly Hueco[], cuantos: number): Promise<Ofrecida[]> => {
    const conseguidos = await dep.bloqueos.reservar(llamada.id, lista.map((h) => intervalo(aOfrecida(h))), cuantos);
    const ofrecidas = conseguidos.map((i) => aOfrecida(lista[i]!)).sort((a, b) => a.inicio - b.inicio);
    if (ofrecidas.length) await dep.fichas.anotar(llamada.id, { ofrecidas: JSON.stringify(ofrecidas), fecha: ofrecidas[0]!.fecha });
    dep.registrar(`${llamada.id.slice(0, 8)} · consultar_huecos · ${t.codigo || t.nombre} ${fecha} → ${ofrecidas.map((o) => `${o.fecha} ${o.hora}`).join(", ") || "nada"}`);
    return ofrecidas;
  };
  const dia = mayuscula(fechaEnPalabras(fecha, hoyF));
  const deEseDia = huecosDelDia({ ...base, fecha });
  const cerradoEseDia = !clinica.tramos.some((tr) => tr.dia === diaDeLaSemana(fecha));
  let antes = cerradoEseDia ? `${dia} la clínica está cerrada.` : "";

  if (cerradoEseDia) {
    // Nada que mirar ese día: directamente a los siguientes.
  } else if (horaPedida) {
    const exacta = horaExacta({ ...base, fecha }, horaPedida);
    if (exacta.libre) {
      const [o] = await reservar([exacta.hueco], 1);
      if (o) {
        await dep.fichas.anotar(llamada.id, { hora: o.hora });
        return `Libre: ${fechaEnPalabras(fecha, hoyF)}, ${etiqueta(o)}, para ${t.nombre} (${t.duracionMin} minutos). Te la guardo unos minutos. Díselo y, si le va bien, sigue con sus datos. ${CORCHETES}`;
      }
    }
    const porque = exacta.libre ? "ocupado" : exacta.porque;
    const motivo = {
      cerrado: "a esa hora la clínica está cerrada",
      "no cabe": `no da tiempo antes de que cierre: ${t.nombre} dura ${t.duracionMin} minutos`,
      ocupado: "esa hora ya está cogida",
      pasada: "esa hora ya ha pasado o es demasiado justa",
    }[porque];
    const cerca = await reservar(ordenParaOfrecer(deEseDia, { cerca: horaPedida }), 2);
    if (cerca.length) {
      return `${dia}, ${horaEnPalabras(horaPedida)}: ${motivo}. Lo más cerca que tengo ese día: ${enLista(cerca)}. Te las guardo unos minutos. Ofréceselas y, cuando elija, apúntala con anotar (hora). ${CORCHETES}`;
    }
    antes = `${dia}, ${horaEnPalabras(horaPedida)}: ${motivo}, y ese día no me queda nada más para ${t.nombre}.`;
  } else {
    const enLaFranja = deEseDia.filter((h) => enFranja(h, franja));
    if (enLaFranja.length) {
      const os = await reservar(ordenParaOfrecer(enLaFranja), 2);
      if (os.length) {
        return `${dia}, para ${t.nombre} (${t.duracionMin} minutos), ${os.length === 1 ? "solo me queda" : "tengo"} ${enLista(os)}. Te las guardo unos minutos. Ofrécele ${os.length === 1 ? "esa" : "las dos"} y, cuando elija, apúntala con anotar (hora). ${CORCHETES}`;
      }
    }
    if (franja !== "cualquiera" && deEseDia.length) {
      const os = await reservar(ordenParaOfrecer(deEseDia), 2);
      if (os.length) {
        return `${dia}, por la ${franja} ya no me queda nada para ${t.nombre}, pero tengo ${enLista(os)}. Te las guardo unos minutos. Ofréceselas y, cuando elija, apúntala con anotar (hora). ${CORCHETES}`;
      }
    }
    antes = `${dia} ya no me queda nada para ${t.nombre}.`;
  }

  // El día pedido no tiene: el primero de los siguientes que sí.
  for (let d = 1; d < DIAS_DE_BUSQUEDA; d++) {
    const otro = sumarDias(fecha, d);
    if (otro > limite) break;
    const libres = huecosDelDia({ ...base, fecha: otro });
    if (!libres.length) continue;
    const preferidos = libres.filter((h) => enFranja(h, franja));
    const os = await reservar(ordenParaOfrecer(preferidos.length ? preferidos : libres), 2);
    if (os.length) {
      return `${antes} El primer día con hueco es ${fechaEnPalabras(otro, hoyF)} [${otro}]: ${enLista(os)}. Te las guardo unos minutos. Ofréceselas y, cuando elija, apúntala con anotar (hora). ${CORCHETES}`;
    }
  }
  return `${antes} Y no encuentro hueco para ${t.nombre} en las dos semanas siguientes. Ofrécele dejar un aviso a recepción con escalar_a_recepcion para que le busquen hora.`;
}

// ==================================================================================================
// anotar

const CAMPOS = ["nombre", "apellidos", "telefono", "quien_llama", "hora"] as const;

function numeroDeLaLlamada(ctx: Contexto) {
  const n = ctx.llamada.numeroCliente;
  if (!n) return null;
  const v = validarTelefono(n);
  return v.ok ? v.valor : null;
}

function guiaDelTelefono(ctx: Contexto): string {
  return numeroDeLaLlamada(ctx)
    ? `Ahora el teléfono. Esta llamada viene de un número: pregúntale si le llamamos a este mismo número o prefiere darte otro, sin recitarlo. Si dice que a este, anótalo con telefono «${TELEFONO_DE_LA_LLAMADA}».`
    : "Ahora el teléfono. Esta llamada NO trae número (pasa en las llamadas por internet y con número oculto): pídele un teléfono de contacto y no ofrezcas «este mismo número».";
}

function loQueFalta(ficha: DatosAnotados): string {
  const ofrecidas = leerOfrecidas(ficha);
  if (!ofrecidas.length) return "";
  const falta: string[] = [];
  if (!ficha.hora && ofrecidas.length > 1) falta.push("que elija la hora");
  if (!ficha.nombre) falta.push("el nombre");
  if (!ficha.apellidos) falta.push("los apellidos");
  if (!ficha.telefono) falta.push("el teléfono");
  if (!falta.length) {
    return "Ya está todo para la cita: repítesela (día, hora, tratamiento y nombre) y, si te dice que sí, llama a crear_cita con la hora.";
  }
  return `Para la cita falta ${falta.length === 1 ? falta[0] : `${falta.slice(0, -1).join(", ")} y ${falta.at(-1)}`}.`;
}

export async function anotar(ctx: Contexto, args: Argumentos): Promise<string> {
  const { dep, llamada } = ctx;
  const dados = CAMPOS.filter((c) => texto(args[c]));
  if (!dados.length) return "No me has pasado ningún dato. Llama a anotar con lo que haya dicho el paciente: nombre, apellidos, teléfono…";
  await dep.bloqueos.renovar(llamada.id);
  const ficha = await dep.fichas.leer(llamada.id);

  const bien: DatosAnotados = {};
  const problemas: string[] = [];
  const despues: string[] = [];

  let nombre = texto(args.nombre);
  const apellidos = texto(args.apellidos);
  if (apellidos) {
    const v = validarNombre(apellidos);
    if (v.ok) bien.apellidos = v.valor;
    else problemas.push(`Los apellidos: ${v.problema}`);
  }
  if (nombre) {
    // Si el modelo mete el nombre completo en «nombre» y además los apellidos, se quitan del nombre.
    const ape = bien.apellidos ?? ficha.apellidos;
    if (ape && nombre.toLowerCase().endsWith(` ${ape.toLowerCase()}`)) nombre = nombre.slice(0, -ape.length).trim();
    const v = validarNombre(nombre);
    if (v.ok) bien.nombre = v.valor;
    else problemas.push(`El nombre: ${v.problema}`);
  }
  const quien = texto(args.quien_llama);
  if (quien) {
    const v = validarNombre(quien);
    if (v.ok) bien.quien_llama = v.valor;
    else problemas.push(`El nombre de quien llama: ${v.problema}`);
  }

  const telefono = texto(args.telefono);
  if (telefono) {
    const deLaLlamada = /\best[ae]\b|\bmism[oa]\b|llamada/i.test(telefono) && !/\d{3}/.test(telefono);
    if (deLaLlamada) {
      const n = numeroDeLaLlamada(ctx);
      if (n) {
        bien.telefono = n.cifras;
        despues.push("Apuntado el número desde el que llama; no hace falta leérselo.");
      } else {
        problemas.push("El teléfono: esta llamada no trae número. Pídele un teléfono de contacto; no ofrezcas «este mismo número».");
      }
    } else {
      const v = validarTelefono(telefono);
      if (v.ok) {
        bien.telefono = v.valor.cifras;
        despues.push(`Confírmale el teléfono leyéndolo exactamente así, sin cambiar nada: «${v.valor.dictado}».`);
      } else {
        problemas.push(`El teléfono ${v.problema}`);
      }
    }
  }

  const hora = texto(args.hora);
  if (hora) {
    const h = normalizarHora(hora);
    const elegida = h ? leerOfrecidas(ficha).find((o) => o.hora === h) : undefined;
    if (!h) problemas.push("La hora tiene que ir como HH:MM, en 24 horas.");
    else if (!elegida) problemas.push(`La hora ${h} no la has consultado. Llama a consultar_huecos con esa hora antes de dársela al paciente.`);
    else {
      // La que elige se queda; la otra se suelta para que la pueda coger otra llamada.
      await dep.bloqueos.soltar(llamada.id, [intervalo(elegida)]);
      bien.hora = h;
      bien.ofrecidas = JSON.stringify([elegida]);
    }
  }

  if (Object.keys(bien).length) await dep.fichas.anotar(llamada.id, bien);
  const ahora = { ...ficha, ...bien };
  if ((bien.nombre || bien.apellidos) && !ahora.telefono && !telefono) despues.push(guiaDelTelefono(ctx));

  const partes = [
    Object.keys(bien).length ? "Anotado." : "",
    problemas.length ? `${Object.keys(bien).length ? "Pero hay" : "Hay"} un problema. ${problemas.join(" ")} Pídeselo otra vez al paciente explicándole qué pasa; no lo corrijas ni lo completes tú.` : "",
    ...despues,
    problemas.length ? "" : loQueFalta(ahora),
  ];
  return partes.filter(Boolean).join(" ");
}

// ==================================================================================================
// crear_cita

const FALLO_AL_CREAR =
  "No se ha podido crear la cita por un fallo técnico: NO está citado, no le digas que sí. Sigue lo que te dice el prompt para cuando algo falla al crear la cita.";

export async function crearCita(ctx: Contexto, args: Argumentos): Promise<string> {
  const { dep, llamada, clinica } = ctx;
  const hora = normalizarHora(texto(args.hora));
  if (!hora) return "La hora tiene que ir como HH:MM, en 24 horas: la que el paciente ha confirmado.";

  return dep.candados.con(`llamada:${llamada.id}`, async () => {
    const ficha = await dep.fichas.leer(llamada.id);
    const hoyF = hoyEn(ctx);

    // Si Vapi repite la herramienta después de haberla creado, se contesta lo mismo.
    const ultima = ficha.ultima_cita ? (JSON.parse(ficha.ultima_cita) as { hora: Hora; respuesta: string }) : null;
    const o = leerOfrecidas(ficha).find((x) => x.hora === hora);
    if (!o && ultima?.hora === hora) return ultima.respuesta;
    if (!o) return `La hora ${hora} no está reservada para esta llamada. Llama a consultar_huecos con ella y vuelve a confirmarla con el paciente.`;

    const falta = [!ficha.nombre && "el nombre", !ficha.apellidos && "los apellidos", !ficha.telefono && "el teléfono"].filter(Boolean);
    if (falta.length) return `Todavía no puedo crearla: falta ${falta.join(" y ")}. Pídeselo, anótalo con anotar y vuelve a llamar a crear_cita.`;

    const id = idDeEvento(llamada.id, o.calendario, o.inicio);
    const yaCreado = (await dep.agenda.deLaLlamada(o.calendario, llamada.id)).includes(id);
    if (!yaCreado) {
      // El bloqueo tiene que seguir siendo de esta llamada (caduca si pasa mucho rato sin herramientas).
      if (!(await dep.bloqueos.esMio(llamada.id, intervalo(o)))) {
        const otraVez = await dep.bloqueos.reservar(llamada.id, [intervalo(o)], 1);
        if (!otraVez.length) {
          await dep.fichas.olvidar(llamada.id, ["hora", "ofrecidas"]);
          return "Esa hora se la acaba de llevar otra persona mientras hablabais. Discúlpate y llama a consultar_huecos para ofrecerle otra.";
        }
      }
      // Y nadie tiene que haberla ocupado a mano en el calendario.
      const pisa = (await dep.agenda.ocupado(o.calendario, o.inicio, o.fin)).some((x) => x.inicio < o.fin && o.inicio < x.fin);
      if (pisa) {
        await dep.bloqueos.soltar(llamada.id);
        await dep.fichas.olvidar(llamada.id, ["hora", "ofrecidas"]);
        return "Esa hora acaba de ocuparse en la agenda. Discúlpate y llama a consultar_huecos para ofrecerle otra.";
      }
    }

    const paciente = `${ficha.nombre} ${ficha.apellidos}`;
    const lineas = [`Paciente: ${paciente}`, `Teléfono: ${ficha.telefono}`];
    if (ficha.quien_llama) lineas.push(`Pidió la cita: ${ficha.quien_llama}`);
    lineas.push(`Cita creada por el asistente de voz (llamada ${llamada.id}).`);
    try {
      await dep.agenda.crear(o.calendario, {
        id, inicio: o.inicio, fin: o.fin, zona: clinica.zona, resumen: `${o.tratamiento} · ${paciente}`, descripcion: lineas.join("\n"), llamada: llamada.id,
      });
    } catch (e) {
      dep.registrar(`⚠ ${llamada.id.slice(0, 8)} · crear_cita · Calendar: ${(e as Error).message}`);
      return FALLO_AL_CREAR;
    }

    try {
      await dep.escritor(clinica.ficha.spreadsheetId).escribir(
        PESTANAS.citas,
        {
          fecha_creacion: ahoraEn(ctx), fecha_cita: o.fecha, hora_cita: o.hora, duracion_min: o.duracion, tratamiento: o.tratamiento,
          gabinete: o.gabinete, paciente, telefono: ficha.telefono!, quien_llama: ficha.quien_llama ?? "", id_evento: id,
          estado: "confirmada", notas: "", id_llamada: llamada.id,
        },
        { igual: ["id_evento"] },
      );
    } catch (e) {
      // Sin fila en Citas, la cita no existe para la clínica: se deshace el evento (y si esto también
      // falla, lo limpia el cierre de la llamada, que busca los eventos huérfanos).
      dep.registrar(`⚠ ${llamada.id.slice(0, 8)} · crear_cita · hoja: ${(e as Error).message}`);
      await dep.agenda.borrar(o.calendario, id).catch((b) => dep.registrar(`⚠ ${llamada.id.slice(0, 8)} · evento sin deshacer: ${(b as Error).message}`));
      return FALLO_AL_CREAR;
    }

    const respuesta =
      `Cita creada: ${fechaEnPalabras(o.fecha, hoyF)}, ${horaEnPalabras(o.hora)}, ${o.tratamiento}, a nombre de ${paciente}. ` +
      "Díselo así y pregúntale si necesita algo más. Si quiere otra cita, sea para quien sea, vuelve a anotar el nombre y los apellidos.";
    await dep.bloqueos.soltar(llamada.id);
    await dep.fichas.olvidar(llamada.id, ["tratamiento", "fecha", "hora", "ofrecidas", "nombre", "apellidos"]);
    await dep.fichas.anotar(llamada.id, { paciente, ultima_cita: JSON.stringify({ hora: o.hora, respuesta }) });
    dep.registrar(`${llamada.id.slice(0, 8)} · crear_cita · ${o.fecha} ${o.hora} ${o.gabinete} → creada`);
    return respuesta;
  }, { esperaMs: 12_000, vidaMs: 30_000 });
}

// ==================================================================================================
// escalar_a_recepcion

export async function escalarARecepcion(ctx: Contexto, args: Argumentos): Promise<string> {
  const { dep, llamada, clinica } = ctx;
  const motivo: MotivoEscalado = MOTIVOS_ESCALADO.find((m) => m === texto(args.motivo)) ?? "sin resolver";
  const detalle = texto(args.detalle);
  if (!detalle) return "Dime en una frase qué necesita el paciente, para que recepción lo sepa antes de llamarle.";
  await dep.bloqueos.renovar(llamada.id);
  const ficha = await dep.fichas.leer(llamada.id);

  if (!ficha.telefono && !ficha.sin_telefono_avisado) {
    await dep.fichas.anotar(llamada.id, { sin_telefono_avisado: "sí" });
    const como = numeroDeLaLlamada(ctx)
      ? `pregúntale si le llaman a este mismo número (entonces anota telefono «${TELEFONO_DE_LA_LLAMADA}») o a otro`
      : "pídele un teléfono de contacto (esta llamada no trae número: no ofrezcas «este mismo número»)";
    return `Antes de dejar el aviso necesito un teléfono para que le llamen: ${como}, y anótalo con anotar. Si no quiere darlo, vuelve a llamar a escalar_a_recepcion y lo dejo sin teléfono.`;
  }

  const nombre = [ficha.nombre, ficha.apellidos].filter(Boolean).join(" ") || ficha.paciente || "";
  await dep.escritor(clinica.ficha.spreadsheetId).escribir(
    PESTANAS.escalados,
    { fecha: ahoraEn(ctx), telefono: ficha.telefono ?? "", nombre, motivo, detalle, estado: "pendiente", id_llamada: llamada.id },
    { igual: ["id_llamada", "motivo", "detalle"] },
  );
  dep.registrar(`${llamada.id.slice(0, 8)} · escalar_a_recepcion · ${motivo}`);
  return ficha.telefono
    ? "Aviso dejado para recepción. Dile que le llamarán en cuanto puedan, en horario de la clínica, y no le prometas una hora concreta."
    : "Aviso dejado para recepción, sin teléfono. Dile que, si quiere que le llamen, lo mejor es que vuelva a llamar en horario de la clínica.";
}

export const MANEJADORES: Record<string, (ctx: Contexto, args: Argumentos) => Promise<string>> = {
  consultar_huecos: consultarHuecos,
  anotar,
  crear_cita: crearCita,
  escalar_a_recepcion: escalarARecepcion,
};
