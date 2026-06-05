#!/usr/bin/env python3
"""Rellena FormatoSolicitud.doc con datos JSON (stdin). Imprime ruta del archivo generado."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

import uno


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
        env={
            **os.environ,
            "HOME": profile,
            "TMPDIR": profile,
        },
    )
    time.sleep(1.5)
    return proc, port


def connect(port):
    localContext = uno.getComponentContext()
    resolver = localContext.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", localContext
    )
    endpoint = f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext"
    for _ in range(50):
        try:
            return resolver.resolve(endpoint)
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("No se pudo conectar a LibreOffice")


def get_tables(doc):
    tables = []
    enum = doc.getText().createEnumeration()
    while enum.hasMoreElements():
        el = enum.nextElement()
        if "TextTable" in el.getImplementationName():
            tables.append(el)
    return tables


def cell_text(table, col, row, label, value):
    table.getCellByPosition(col, row).setString(f"{label}{value or ''}")


def replace_all(doc, search, replace):
    sd = doc.createSearchDescriptor()
    sd.SearchString = search
    sd.ReplaceString = replace
    doc.replaceAll(sd)


def pad_after_label(value, width):
    text = (value or "").strip()
    if len(text) > width:
        return text[:width]
    return text + (" " * (width - len(text)))


def fill_doc(template_path, output_path, data):
    proc, port = start_soffice()

    try:
        shutil.copy2(template_path, output_path)
        ctx = connect(port)
        desktop = ctx.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", ctx
        )
        url = uno.systemPathToFileUrl(os.path.abspath(output_path))
        doc = desktop.loadComponentFromURL(url, "_blank", 0, ())

        tables = get_tables(doc)
        if len(tables) < 5:
            raise RuntimeError("Plantilla FormatoSolicitud.doc: estructura de tablas inesperada")

        cell_text(tables[0], 0, 0, "FECHA: ", data.get("fecha", ""))
        cell_text(tables[0], 1, 0, "RADICADO Nº   ", data.get("radicado", ""))

        cell_text(tables[1], 0, 0, "PETICIONARIO: ", data.get("peticionario", ""))
        cell_text(tables[1], 1, 0, "CEDULA ", data.get("cedula", ""))
        cell_text(tables[1], 0, 1, "DIRECCIÓN: ", data.get("direccion", ""))
        cell_text(tables[1], 0, 2, "TELEFONO ", data.get("telefono", ""))
        cell_text(tables[1], 1, 2, "BARRIO ", data.get("barrio", ""))
        cell_text(tables[1], 0, 3, "CORREO ELECTRÓNICO ", data.get("correo", ""))

        acepta = (
            "Aceptó me sea enviado la respuesta al correo electrónico antes citado"
        )
        if data.get("aceptaCorreo"):
            acepta += "  X"
        tables[1].getCellByPosition(0, 4).setString(acepta)

        cell_text(tables[2], 0, 0, "PERJUDICANTE: ", data.get("perjudicante", ""))
        cell_text(tables[2], 1, 0, "TEL: ", data.get("telPerjudicante", ""))
        cell_text(tables[2], 0, 1, "DIRECCIÓN: ", data.get("direccionPerjudicante", ""))
        cell_text(tables[2], 1, 1, "BARRIO: ", data.get("barrioPerjudicante", ""))

        canal = (data.get("canalDeReporte") or "").strip()
        if canal == "Telefono":
            tables[3].getCellByPosition(1, 0).setString("\nATENCIÓN TELEFONICA  X")
        elif canal == "Personal":
            tables[3].getCellByPosition(0, 0).setString("\nATENCIÓN PERSONAL  X")
        elif canal == "Correo":
            correo_cell = tables[1].getCellByPosition(0, 3).getString()
            if " X" not in correo_cell:
                tables[1].getCellByPosition(0, 3).setString(correo_cell.rstrip() + "  X")

        descripcion = (data.get("descripcion") or "").strip()
        if descripcion:
            replace_all(
                doc,
                "DESCRIPCION QUEJA:  " + ("_" * 305),
                "DESCRIPCION QUEJA:  " + descripcion,
            )

        respuesta = (data.get("respuestaInmediata") or "").strip()
        if respuesta:
            replace_all(
                doc,
                "RESPUESTA INMEDIATA:  " + ("_" * 305),
                "RESPUESTA INMEDIATA:  " + respuesta,
            )

        replace_all(
            doc,
            "RECIBIDA POR: ________________________________________________",
            "RECIBIDA POR: " + pad_after_label(data.get("recibidaPor", ""), 46),
        )
        replace_all(
            doc,
            "REMITIDO A: __________________________________________________",
            "REMITIDO A: " + pad_after_label(data.get("remitidoA", ""), 62),
        )

        props = (uno.createUnoStruct("com.sun.star.beans.PropertyValue"),)
        props[0].Name = "FilterName"
        props[0].Value = "MS Word 97"
        doc.storeToURL(url, tuple(props))
        doc.close(True)
    finally:
        proc.terminate()
        proc.wait()


def convert_to_pdf(doc_path, pdf_path):
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
            doc_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={
            **os.environ,
            "HOME": profile,
            "TMPDIR": profile,
        },
    )
    generated = os.path.join(
        os.path.dirname(pdf_path) or ".",
        os.path.splitext(os.path.basename(doc_path))[0] + ".pdf",
    )
    if generated != pdf_path and os.path.exists(generated):
        shutil.move(generated, pdf_path)


def main():
    if len(sys.argv) < 3:
        print(
            "Uso: fill-formato-solicitud.py <plantilla.doc> <salida> [doc|pdf]",
            file=sys.stderr,
        )
        sys.exit(1)

    template_path = sys.argv[1]
    output_path = sys.argv[2]
    output_format = (sys.argv[3] if len(sys.argv) > 3 else "doc").lower()
    payload = json.load(sys.stdin)

    doc_out = output_path
    if output_format == "pdf":
        doc_out = output_path + ".doc.tmp"

    fill_doc(template_path, doc_out, payload)

    if output_format == "pdf":
        convert_to_pdf(doc_out, output_path)
        os.remove(doc_out)

    print(output_path)


if __name__ == "__main__":
    main()
