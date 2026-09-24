#!/usr/bin/env python3
"""Bloquea comandos de Bash que puedan ESCRIBIR en las carpetas de referencia.

Estas carpetas son material de consulta del proyecto y son de SOLO LECTURA:
  - CURSO AGUSTIN MEDINA/PAGO  (plantillas del curso)
  - Bot Clinica Demo V1        (proyecto anterior)
  - Bot Clinica WhatsApp       (proyecto hermano)

Copiar DESDE ellas hacia el repo es correcto y no se bloquea.
Escribir, mover, borrar o redirigir HACIA ellas se bloquea.

Se usa como hook PreToolUse con matcher Bash. Lee el JSON del hook por stdin y
sale con codigo 2 (error bloqueante) si detecta escritura.
"""
import json
import re
import sys

PROTEGIDAS = [
    "curso agustin medina",
    "bot clinica demo v1",
    "bot clinica whatsapp",
]

# Verbos que modifican el destino. `cp`/`copy` se tratan aparte: copiar DESDE
# una carpeta protegida es justo lo que el proyecto manda hacer.
DESTRUCTIVOS = re.compile(
    r"(?:^|[;&|]\s*|\s)"
    r"(rm|rmdir|unlink|shred|truncate|dd|mkdir|touch|chmod|chown|"
    r"del|erase|rd|move|ren|rename|mv)\b",
    re.I,
)
SED_IN_PLACE = re.compile(r"\bsed\b[^|;&]*\s-[a-z]*i\b", re.I)
TEE_A = re.compile(r"\btee\b", re.I)
# Redireccion cuyo destino cae en una carpeta protegida.
REDIRECCION = re.compile(r">>?\s*(\"[^\"]*\"|'[^']*'|\S+)")
# Ultimo argumento de una copia = destino.
COPIA = re.compile(r"\b(cp|copy|xcopy|robocopy)\b(.*)$", re.I | re.S)
# Trocea respetando comillas: las rutas de este proyecto llevan espacios
# ("CURSO AGUSTIN MEDINA"), asi que partir por espacios rompe el destino.
TOKENS = re.compile(r"\"[^\"]*\"|'[^']*'|\S+")


def trocear(texto: str):
    return [t.strip("\"'") for t in TOKENS.findall(texto)]


def toca_protegida(texto: str) -> bool:
    t = texto.replace("\\", "/").lower()
    return any(p in t for p in PROTEGIDAS)


def revisar(cmd: str):
    """Devuelve el motivo del bloqueo, o None si el comando puede pasar."""
    if not toca_protegida(cmd):
        return None

    for destino in REDIRECCION.findall(cmd):
        if toca_protegida(destino.strip("\"'")):
            return "redirige la salida (> o >>) hacia una carpeta de solo lectura"

    if SED_IN_PLACE.search(cmd):
        return "usa `sed -i`, que edita el fichero en el sitio"

    if TEE_A.search(cmd):
        return "usa `tee`, que escribe en el fichero de destino"

    m = COPIA.search(cmd)
    if m:
        args = [a for a in trocear(m.group(2)) if not a.startswith("-")]
        if args and toca_protegida(args[-1]):
            return "copia HACIA una carpeta de solo lectura (copiar DESDE ella si se permite)"

    if DESTRUCTIVOS.search(cmd):
        return "contiene un comando que modifica o borra ficheros"

    return None


def main():
    try:
        datos = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # sin JSON legible no hay nada que juzgar

    cmd = (datos.get("tool_input") or {}).get("command") or ""
    motivo = revisar(cmd)
    if motivo:
        print(
            "BLOQUEADO: " + motivo + ".\n"
            "PAGO y los proyectos anteriores son SOLO LECTURA (ver CLAUDE.md).\n"
            "Para leer, usa la herramienta Read. Para reutilizar material, "
            "copia DESDE esas carpetas HACIA este repo, nunca al reves.",
            file=sys.stderr,
        )
        sys.exit(2)  # 2 = error bloqueante: el comando no se ejecuta
    sys.exit(0)


if __name__ == "__main__":
    main()
