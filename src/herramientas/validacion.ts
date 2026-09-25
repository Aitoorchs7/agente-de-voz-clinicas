// Validación de lo que dicta el paciente. Portada de la V1 (`asistente/validacion.py`), que ya peleó
// estas reglas por teléfono. Nada entra en la hoja ni en la agenda sin tener sentido, y si algo no
// cuadra se devuelve EL MOTIVO, para que el bot pueda pedirlo otra vez explicando qué pasa (PLAN.md §6).
//
// Y una regla nueva de esta fase: un teléfono que no sean cifras se rechaza. Cuando no hay número (llamada
// web, número oculto), Vapi deja el texto «{{customer.number}}» sin sustituir, y ya acabó una vez copiado
// en la hoja como si fuera un teléfono.

import { digitoADigito } from "../agenda/palabras.js";

export type Validado<T> = { ok: true; valor: T } | { ok: false; problema: string };

export interface Telefono {
  /** Nueve cifras, sin espacios: «666111222». */
  cifras: string;
  /** «seis, seis, seis, uno, …»: para confirmarlo dígito a dígito. */
  dictado: string;
}

/** Un teléfono español: nueve cifras que empiezan por 6, 7, 8 o 9, con o sin el prefijo +34. */
export function validarTelefono(bruto: string): Validado<Telefono> {
  const texto = (bruto ?? "").trim();
  if (!texto) return { ok: false, problema: "está vacío. Pídele al paciente un teléfono de contacto." };
  if (/\{\{|\}\}/.test(texto)) {
    return {
      ok: false,
      problema:
        "eso no es un teléfono: es el hueco del número desde el que llaman, y viene sin rellenar porque no hay número. " +
        "No ofrezcas «este mismo número»: pídele al paciente un teléfono de contacto.",
    };
  }
  if (/[^\d\s.\-()+]/.test(texto)) {
    return { ok: false, problema: "lleva letras o símbolos. El teléfono se anota en cifras, tal como lo ha dicho el paciente." };
  }
  let d = texto.replace(/\D/g, "");
  if (d.startsWith("0034")) d = d.slice(4);
  else if (d.startsWith("34") && d.length === 11) d = d.slice(2);
  if (d.length < 9) return { ok: false, problema: `faltan dígitos: solo tiene ${d.length}, y un teléfono tiene nueve.` };
  if (d.length > 9) return { ok: false, problema: `sobran dígitos: tiene ${d.length}, y un teléfono tiene nueve.` };
  if (!"6789".includes(d[0]!)) return { ok: false, problema: "no empieza por seis, siete, ocho ni nueve, así que no parece un teléfono de España." };
  return { ok: true, valor: { cifras: d, dictado: digitoADigito(d) } };
}

// Partículas que van en minúscula dentro de un nombre. La «i» catalana es la que más se ve: «Jordi Bosch
// i Ferrà», no «Bosch I Ferrà».
const PARTICULAS = new Set(["i", "de", "del", "la", "las", "los", "y", "e", "da", "das", "do", "dos", "van", "von", "der", "den", "el", "al", "bin"]);

/**
 * Un nombre o unos apellidos. Acepta cualquier letra, no solo las del castellano: la V1 rechazaba «Ferrà»
 * y «Françesc», que son apellidos de la puerta de al lado en una clínica de Barcelona.
 */
export function validarNombre(bruto: string): Validado<string> {
  const t = (bruto ?? "").trim().replace(/\s+/g, " ");
  if (/\{\{|\}\}/.test(t)) return { ok: false, problema: "eso no es un nombre. Pregúntaselo al paciente." };
  if (t.length < 2) return { ok: false, problema: "es demasiado corto." };
  if (t.length > 45) return { ok: false, problema: "es demasiado largo." };
  // Letras de cualquier idioma, espacio, apóstrofo, guion y el punto volado catalán de «Paral·lel».
  if (![...t].every((c) => /\p{L}/u.test(c) || " '’-·.".includes(c))) return { ok: false, problema: "tiene caracteres que no son letras." };
  if (![...t].some((c) => /\p{L}/u.test(c))) return { ok: false, problema: "no tiene ninguna letra." };

  // Si ya viene con mayúsculas y minúsculas, se respeta: recapitalizar «O'Donnell» solo lo estropea.
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return { ok: true, valor: t };

  const partes = t.toLowerCase().split(" ").map((palabra, i) => {
    if (i > 0 && PARTICULAS.has(palabra)) return palabra;
    let trozo = palabra;
    for (const sep of ["-", "'", "’"]) trozo = trozo.split(sep).map((x) => x.slice(0, 1).toUpperCase() + x.slice(1)).join(sep);
    // El apóstrofo catalán de «d'Assís» y «l'Hospitalet» va en minúscula.
    if (palabra.length > 2 && ["'", "’"].includes(palabra[1]!) && "dl".includes(palabra[0]!)) trozo = palabra[0] + trozo.slice(1);
    return trozo;
  });
  return { ok: true, valor: partes.join(" ") };
}
