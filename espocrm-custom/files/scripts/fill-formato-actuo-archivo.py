#!/usr/bin/env python3
"""Rellena ActuoArchivo.docx conservando el diseño de la plantilla."""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime

import uno
from com.sun.star.text.ControlCharacter import PARAGRAPH_BREAK

MESES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]


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


def replace_regex(doc, pattern, replacement):
    sd = doc.createSearchDescriptor()
    sd.SearchRegularExpression = True
    sd.SearchString = pattern
    sd.ReplaceString = replacement
    doc.replaceAll(sd)


def find_first(doc, pattern):
    sd = doc.createSearchDescriptor()
    sd.SearchRegularExpression = True
    sd.SearchString = pattern
    return doc.findFirst(sd)


def insert_paragraph_after_range(text, text_range, content):
    cursor = text.createTextCursorByRange(text_range.getEnd())
    text.insertControlCharacter(cursor, PARAGRAPH_BREAK, False)

    if content:
        text.insertString(cursor, content, False)

    return cursor


def set_title_with_value_below(doc, pattern, title, value):
    value = (value or "").strip()

    if not value:
        return False

    found = find_first(doc, pattern)

    if not found:
        return False

    text = found.getText()
    found.setString(title)
    insert_paragraph_after_range(text, found, value)

    return True


def set_title_with_multiline_below(doc, pattern, title, value):
    value = (value or "").strip()

    if not value:
        return False

    found = find_first(doc, pattern)

    if not found:
        return False

    text = found.getText()
    found.setString(title)

    lines = [line.strip() for line in value.split("\n") if line.strip()]
    current_range = found

    for line in lines:
        cursor = insert_paragraph_after_range(text, current_range, line)
        current_range = cursor

    return True


def replace_labels_with_stacked_values(doc, radicado, consecutivo):
    found = find_first(
        doc,
        r"\(Número de radicado\)\s+\(Consecutivo\s+interno\)",
    )

    if not found:
        return False

    text = found.getText()
    found.setString("(Número de radicado)")

    current = found

    if radicado:
        cursor = insert_paragraph_after_range(text, current, radicado)
        current = cursor

    cursor = insert_paragraph_after_range(text, current, "(Consecutivo  interno)")
    current = cursor

    if consecutivo:
        insert_paragraph_after_range(text, current, consecutivo)

    return True


def clear_underscore_lines(doc):
    for _ in range(30):
        found = find_first(doc, r"^_+$")

        if not found:
            break

        found.setString("")


def format_date_spanish(date_str):
    text = (date_str or "").strip()
    if not text:
        return ""
    try:
        dt = datetime.strptime(text[:10], "%Y-%m-%d")
        return f"{dt.day} días del mes de {MESES[dt.month - 1]} de {dt.year}"
    except ValueError:
        return text


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

        fecha_auto = format_date_spanish(data.get("fechaAuto", ""))
        if fecha_auto:
            set_title_with_value_below(doc, r"Envigado,\s*_+", "Envigado,", fecha_auto)

        radicado = (data.get("numeroRadicado") or "").strip()
        consecutivo = (data.get("consecutivoInterno") or "").strip()

        replace_regex(doc, r"^_+\s+_+$", "")
        replace_labels_with_stacked_values(doc, radicado, consecutivo)

        referencia = (data.get("referencia") or "").strip()
        if referencia:
            set_title_with_multiline_below(
                doc,
                r"Referencia: \(tema de referencia del proceso\)\s*_+",
                "Referencia: (tema de referencia del proceso)",
                referencia,
            )

        motivo = (data.get("motivoArchivo") or "").strip()
        if motivo:
            set_title_with_multiline_below(
                doc,
                r"Motivo por el\s+cual\s+se archiva el expediente\s*_+",
                "Motivo por el  cual  se archiva el expediente",
                motivo,
            )

        fecha_dada = format_date_spanish(data.get("fechaDada", ""))
        if fecha_dada:
            set_title_with_value_below(
                doc,
                r"Dada en envigado a los\s*_+",
                "Dada en envigado a los",
                fecha_dada,
            )

        inspector = (data.get("inspectorNombre") or "").strip()
        cargo = (data.get("inspectorCargo") or "").strip() or (
            "Inspector de Policía para Asuntos Ambientales"
        )

        clear_underscore_lines(doc)

        found = find_first(doc, r"Inspector de Policía para Asuntos Ambientales")

        if found:
            text = found.getText()

            if inspector:
                found.setString(inspector)
                insert_paragraph_after_range(text, found, cargo)
            else:
                found.setString(cargo)

        props = (uno.createUnoStruct("com.sun.star.beans.PropertyValue"),)
        props[0].Name = "FilterName"
        props[0].Value = "Office Open XML Text"
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
            "pdf:writer_pdf_Export",
            "--outdir",
            os.path.dirname(pdf_path) or ".",
            doc_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={**os.environ, "HOME": profile, "TMPDIR": profile},
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
            "Uso: fill-formato-actuo-archivo.py <plantilla.docx> <salida> [docx|pdf]",
            file=sys.stderr,
        )
        sys.exit(1)

    template_path = sys.argv[1]
    output_path = sys.argv[2]
    output_format = (sys.argv[3] if len(sys.argv) > 3 else "docx").lower()
    payload = json.load(sys.stdin)

    doc_out = output_path
    if output_format == "pdf":
        doc_out = output_path + ".docx.tmp"

    fill_doc(template_path, doc_out, payload)

    if output_format == "pdf":
        convert_to_pdf(doc_out, output_path)
        os.remove(doc_out)

    print(output_path)


if __name__ == "__main__":
    main()
