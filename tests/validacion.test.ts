// Lo que dicta el paciente: el teléfono y el nombre. Reglas de la V1 más la de esta fase: un teléfono
// que no sean cifras se rechaza, empezando por el «{{customer.number}}» sin sustituir.

import { describe, expect, it } from "vitest";
import { validarNombre, validarTelefono } from "../src/herramientas/validacion.js";

describe("el teléfono", () => {
  it.each([
    ["666111222", "666111222"],
    ["666 11 12 22", "666111222"],
    ["666-111-222", "666111222"],
    ["+34 666 111 222", "666111222"],
    ["0034666111222", "666111222"],
    ["34666111222", "666111222"],
    ["910000000", "910000000"],
  ])("«%s» vale y se guarda en cifras: %s", (bruto, cifras) => {
    const r = validarTelefono(bruto);
    expect(r.ok && r.valor.cifras).toBe(cifras);
  });

  it("devuelve cómo dictarlo dígito a dígito", () => {
    const r = validarTelefono("666 11 12 22");
    expect(r.ok && r.valor.dictado).toBe("seis, seis, seis, uno, uno, uno, dos, dos, dos");
  });

  it("el {{customer.number}} sin sustituir se rechaza, diciendo qué es y que no se ofrezca «este mismo número»", () => {
    const r = validarTelefono("{{customer.number}}");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problema).toMatch(/este mismo número/);
  });

  it.each([
    ["66611122", /faltan dígitos: solo tiene 8/],
    ["6661112223", /sobran dígitos: tiene 10/],
    ["566111222", /no empieza por seis/],
    ["seis seis seis", /letras/],
    ["666111222 o 677000000", /letras/],
    ["", /vacío/],
  ])("«%s» se rechaza con el problema concreto", (bruto, problema) => {
    const r = validarTelefono(bruto);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problema).toMatch(problema);
  });
});

describe("el nombre", () => {
  it.each([
    ["ana pérez", "Ana Pérez"],
    ["ANA PÉREZ", "Ana Pérez"],
    ["jordi bosch i ferrà", "Jordi Bosch i Ferrà"],
    ["ana de la fuente", "Ana de la Fuente"],
    ["garcía-lópez", "García-López"],
    ["o'donnell", "O'Donnell"],
    ["maria d'assís", "Maria d'Assís"],
    ["María José", "María José"],
    ["McDonald", "McDonald"],
    ["  ana   pérez  ", "Ana Pérez"],
  ])("«%s» → «%s»", (bruto, limpio) => {
    const r = validarNombre(bruto);
    expect(r.ok && r.valor).toBe(limpio);
  });

  it.each([
    ["a", /corto/],
    ["Ana3", /no son letras/],
    ["{{customer.name}}", /no es un nombre/],
    ["x".repeat(46), /largo/],
  ])("«%s» se rechaza con el problema concreto", (bruto, problema) => {
    const r = validarNombre(bruto);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problema).toMatch(problema);
  });
});
