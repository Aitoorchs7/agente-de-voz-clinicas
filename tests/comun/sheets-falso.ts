// Una API de Google Sheets en memoria, con lo justo para el escritor: leer un rango, escribir un rango
// (RAW, con `null` = no tocar), mirar el tamaño de una pestaña y añadirle filas. Se porta como Google en
// lo que importa aquí: no devuelve las filas y columnas vacías del final, y escribir más allá de la
// última fila de la pestaña falla con «exceeds grid limits».

type Celda = string | number | boolean;

export interface PestanaFalsa {
  sheetId: number;
  filas: number;
  celdas: Map<string, Celda>;
}

const columna = (letras: string) => [...letras].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

function rango(texto: string) {
  const m = decodeURIComponent(texto).match(/^'(.+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`rango que el falso no entiende: ${texto}`);
  return { pestana: m[1]!, c0: columna(m[2]!), f0: Number(m[3]) - 1, c1: columna(m[4]!), f1: Number(m[5]) - 1 };
}

export function sheetsFalso(pestanas: Record<string, { filas?: number; valores?: Celda[][] }>) {
  const hojas = new Map<string, PestanaFalsa>();
  let id = 100;
  for (const [nombre, p] of Object.entries(pestanas)) {
    const celdas = new Map<string, Celda>();
    (p.valores ?? []).forEach((fila, f) => fila.forEach((v, c) => v !== "" && celdas.set(`${f},${c}`, v)));
    hojas.set(nombre, { sheetId: id++, filas: p.filas ?? 1000, celdas });
  }
  const peticiones: { metodo: string; url: string; cuerpo?: unknown }[] = [];
  const responder = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });

  /** Lo que hay en la pestaña, como matriz, sin las filas y columnas vacías del final. */
  function matriz(nombre: string, r = { c0: 0, f0: 0, c1: 25, f1: 99_999 }): Celda[][] {
    const h = hojas.get(nombre)!;
    const salida: Celda[][] = [];
    for (let f = r.f0; f <= Math.min(r.f1, h.filas - 1); f++) {
      const fila: Celda[] = [];
      for (let c = r.c0; c <= r.c1; c++) fila.push(h.celdas.get(`${f},${c}`) ?? "");
      while (fila.length && fila.at(-1) === "") fila.pop();
      salida.push(fila);
    }
    while (salida.length && salida.at(-1)!.length === 0) salida.pop();
    return salida;
  }

  const fetchFalso: typeof fetch = async (entrada, init) => {
    const url = new URL(String(entrada));
    const metodo = init?.method ?? "GET";
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined;
    peticiones.push({ metodo, url: url.toString(), cuerpo });
    const ruta = url.pathname.replace(/^\/v4\/spreadsheets\/[^/:]+/, "");

    if (metodo === "GET" && ruta === "") {
      return responder(200, { sheets: [...hojas].map(([title, h]) => ({ properties: { sheetId: h.sheetId, title, gridProperties: { rowCount: h.filas } } })) });
    }
    if (metodo === "POST" && ruta === ":batchUpdate") {
      for (const req of cuerpo.requests) {
        const d = req.appendDimension;
        const h = [...hojas.values()].find((x) => x.sheetId === d.sheetId)!;
        h.filas += d.length;
      }
      return responder(200, {});
    }
    const m = ruta.match(/^\/values\/(.+)$/);
    if (m) {
      const r = rango(m[1]!);
      const h = hojas.get(r.pestana);
      if (!h) return responder(400, { error: { message: `Unable to parse range: ${r.pestana}` } });
      if (metodo === "GET") return responder(200, { values: matriz(r.pestana, r) });
      if (metodo === "PUT") {
        if (url.searchParams.get("valueInputOption") !== "RAW") return responder(400, { error: { message: "el falso solo admite RAW" } });
        if (r.f1 >= h.filas) return responder(400, { error: { message: `Range (${r.pestana}!A${r.f0 + 1}) exceeds grid limits. Max rows: ${h.filas}` } });
        (cuerpo.values as (Celda | null)[][]).forEach((fila, df) =>
          fila.forEach((v, dc) => {
            if (v === null) return;
            const k = `${r.f0 + df},${r.c0 + dc}`;
            if (v === "") h.celdas.delete(k);
            else h.celdas.set(k, v);
          }),
        );
        return responder(200, {});
      }
    }
    return responder(404, { error: { message: `el falso no sabe hacer ${metodo} ${ruta}` } });
  };

  return { fetch: fetchFalso, hojas, peticiones, matriz };
}
