#!/usr/bin/env python3
"""Rellena ActaVisita.xlsx conservando diseño, bordes, imágenes y celdas combinadas."""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata

import uno


RECURSO_CELLS = {
    "HIDRICO": "A13",
    "FAUNA SILVESTRE": "H13",
    "FAUNA DOMESTICA": "Q13",
    "SUELO DE PROTECCION": "A14",
    "FLORA": "H14",
    "PAISAJE": "Q14",
    "SUELO": "A15",
    "GESTION SOCIOAMBIENTAL DE OBRA": "H15",
    "MINERO": "Q15",
    "AIRE": "A16",
    "SERVICIOS PUBLICOS": "H16",
    "RESIDUOS SOLIDOS": "Q16",
}

ACCION_CELLS = {
    "REMISION": "A34",
    "SUSPENSION DE ACTIVIDAD": "G34",
    "CONCILIACION": "Q34",
    "VERIFICACION": "A35",
    "MEDIDA PREVENTIVA": "G35",
    "CITACION": "Q35",
    "INFORME TECNICO": "A36",
    "GESTION INTERINSTITUCIONAL": "G36",
    "PROCEDIMIENTO VERBAL ABREVADO": "Q36",
    "VISITA TECNICOS": "A37",
    "ARCHIVO": "G37",
    "OTRO": "Q37",
}


def get_lo_profile():
    profile = os.environ.get("LO_PROFILE")
    if not profile:
        profile = os.path.join(tempfile.gettempdir(), f"lo-profile-{os.getuid()}")
    os.makedirs(profile, exist_ok=True)
    return profile


def start_soffice():
    profile = get_lo_profile()
    profile_url = "file://" + profile.replace(" ", "%20")
    port = 20000 + (os.getpid() % 10000)
    proc = subprocess.Popen(
        [
            "soffice",
            "--headless",
            "--invisible",
            "--nologo",
            "--nofirststartwizard",
            f"-env:UserInstallation={profile_url}",
            f"--accept=socket,host=127.0.0.1,port={port};urp;",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={**os.environ, "HOME": profile, "TMPDIR": profile},
    )
    time.sleep(1.5)
    return proc, port


def connect(port):
    local_context = uno.getComponentContext()
    resolver = local_context.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_context
    )
    endpoint = f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext"
    for _ in range(50):
        try:
            return resolver.resolve(endpoint)
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("No se pudo conectar a LibreOffice")


def normalize_key(value):
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip().upper()


def join_parts(parts):
    chunks = [str(part).strip() for part in parts if str(part or "").strip()]
    return "\n\n".join(chunks)


class CalcFiller:
    def __init__(self, sheet):
        self.sheet = sheet

    def write_cell(self, coord, value):
        text = str(value or "").strip()
        if not text:
            return
        self.sheet.getCellRangeByName(coord).setString(text)

    def write_block(self, row_start, row_end, col, value):
        text = str(value or "").strip()
        if not text:
            return
        col_letter = chr(ord("A") + col - 1)
        self.sheet.getCellRangeByName(f"{col_letter}{row_start}").setString(text)

    def mark_option(self, coord):
        cell = self.sheet.getCellRangeByName(coord)
        current = str(cell.getString() or "").strip()
        if not current:
            return
        if current.startswith("(X)") or current.startswith("X "):
            return
        cell.setString(f"(X) {current}")

    def mark_recurso(self, recurso):
        coord = RECURSO_CELLS.get(normalize_key(recurso))
        if coord:
            self.mark_option(coord)

    def mark_zona(self, zona):
        zona_key = normalize_key(zona)
        if zona_key == "URBANO":
            self.mark_option("R24")
        elif zona_key == "RURAL":
            self.mark_option("V24")

    def mark_acciones(self, acciones):
        if not acciones:
            self.mark_option("A35")
            return
        items = acciones if isinstance(acciones, list) else [acciones]
        marked = False
        for item in items:
            coord = ACCION_CELLS.get(normalize_key(item))
            if coord:
                self.mark_option(coord)
                marked = True
        if not marked:
            self.mark_option("A35")

    def fill(self, data):
        radicado = str(data.get("numeroRadicado") or "").strip()
        expediente = str(data.get("expediente") or "").strip()
        radicado_exp = radicado
        if expediente:
            radicado_exp = f"{radicado} / Exp. {expediente}" if radicado else expediente

        self.write_cell("F5", radicado_exp)
        self.write_cell("R5", data.get("fechaHora") or data.get("fechaVisita") or data.get("fecha"))

        self.write_cell("E6", data.get("acompanante") or data.get("posibleAfectante"))
        self.write_cell("T6", data.get("acompananteCedula"))
        self.write_cell("D7", data.get("acompananteCorreo"))
        self.write_cell("T7", data.get("acompananteTelefono") or data.get("telefono"))
        self.write_cell("D8", data.get("acompananteDireccion") or data.get("direccionAfectacion"))

        self.write_cell("F9", data.get("infractor"))
        self.write_cell("T9", data.get("infractorDocumento"))
        self.write_cell("D10", data.get("infractorCorreo"))
        self.write_cell("T10", data.get("infractorTelefono"))
        self.write_cell("D11", data.get("infractorDireccion"))

        self.mark_recurso(data.get("recursoTema"))

        descripcion = data.get("descripcionHecho") or join_parts(
            [data.get("objetoVisita"), data.get("situacionEncontrada")]
        )
        self.write_block(18, 21, 1, descripcion)

        ubicacion = data.get("ubicacionHechos") or data.get("direccionAfectacion")
        self.write_cell("A23", ubicacion)

        self.write_cell("F24", data.get("barrio"))
        self.mark_zona(data.get("zona"))

        coords = str(data.get("coordenadas") or "").strip()
        if coords:
            self.write_cell("F25", coords)

        procedimiento = data.get("procedimiento") or join_parts(
            [
                data.get("analisisSituacion"),
                data.get("registroFotografico"),
                data.get("conclusion"),
            ]
        )
        self.write_block(28, 31, 1, procedimiento)

        self.mark_acciones(data.get("accionesRecomendadas"))

        observaciones = data.get("observaciones") or data.get("requerimientos")
        self.write_block(39, 42, 1, observaciones)

        self.write_cell("A46", data.get("funcionarioNombre"))
        self.write_cell("A47", data.get("funcionarioCedula"))
        self.write_cell("A48", data.get("funcionarioCargo"))
        self.write_cell("L46", data.get("acompananteNombre") or data.get("establecimientoNombre"))
        self.write_cell("L47", data.get("acompananteCedulaFirma") or data.get("establecimientoCedula"))
        self.write_cell("L48", data.get("acompananteCargo") or data.get("establecimientoCargo"))


def fill_xlsx(template_path, output_path, data):
    proc, port = start_soffice()

    try:
        shutil.copy2(template_path, output_path)
        ctx = connect(port)
        desktop = ctx.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", ctx
        )
        url = uno.systemPathToFileUrl(os.path.abspath(output_path))
        doc = desktop.loadComponentFromURL(url, "_blank", 0, ())
        sheet = doc.getSheets().getByIndex(0)
        CalcFiller(sheet).fill(data)
        doc.storeToURL(url, ())
        doc.close(True)
    finally:
        proc.terminate()
        proc.wait()


def convert_to_pdf(xlsx_path, pdf_path):
    profile = get_lo_profile()
    profile_url = "file://" + profile.replace(" ", "%20")
    subprocess.run(
        [
            "soffice",
            "--headless",
            "--invisible",
            "--nologo",
            "--nofirststartwizard",
            f"-env:UserInstallation={profile_url}",
            "--convert-to",
            "pdf",
            "--outdir",
            os.path.dirname(pdf_path) or ".",
            xlsx_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={**os.environ, "HOME": profile, "TMPDIR": profile},
    )
    generated = os.path.join(
        os.path.dirname(pdf_path) or ".",
        os.path.splitext(os.path.basename(xlsx_path))[0] + ".pdf",
    )
    if generated != pdf_path and os.path.exists(generated):
        shutil.move(generated, pdf_path)


def main():
    if len(sys.argv) < 3:
        print(
            "Uso: fill-formato-acta-visita.py <plantilla.xlsx> <salida> [xlsx|pdf]",
            file=sys.stderr,
        )
        sys.exit(1)

    template_path = sys.argv[1]
    output_path = sys.argv[2]
    output_format = (sys.argv[3] if len(sys.argv) > 3 else "pdf").lower()
    payload = json.load(sys.stdin)

    if output_format == "pdf":
        xlsx_out = os.path.splitext(output_path)[0] + ".xlsx"
        fill_xlsx(template_path, xlsx_out, payload)
        convert_to_pdf(xlsx_out, output_path)
        os.remove(xlsx_out)
    else:
        fill_xlsx(template_path, output_path, payload)

    print(output_path)


if __name__ == "__main__":
    main()
