#!/usr/bin/env python3
"""
Superpone datos sobre FormatoSolicitud-template.pdf sin modificar la plantilla.
La plantilla original (líneas, bordes, guiones) queda intacta debajo.
"""

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile

import pymupdf as fitz


def script_dir():
    return os.path.dirname(os.path.abspath(__file__))


def load_overlay_utils():
    path = os.path.join(script_dir(), "pdf-overlay-utils.py")
    spec = importlib.util.spec_from_file_location("pdf_overlay_utils", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


overlay = load_overlay_utils()


def layout_path():
    return os.path.join(script_dir(), "formato-solicitud-layout.json")


def resolve_template_path(template_arg):
    if template_arg.lower().endswith(".pdf"):
        return template_arg

    pdf_candidate = os.path.join(
        os.path.dirname(template_arg),
        "FormatoSolicitud-template.pdf",
    )
    if os.path.isfile(pdf_candidate):
        return pdf_candidate

    return template_arg


def ensure_pdf_template(template_arg):
    path = resolve_template_path(template_arg)
    if path.lower().endswith(".pdf") and os.path.isfile(path):
        return path

    doc_path = template_arg
    if not doc_path.lower().endswith(".doc"):
        doc_path = os.path.join(os.path.dirname(template_arg), "FormatoSolicitud.doc")

    pdf_path = os.path.join(os.path.dirname(doc_path), "FormatoSolicitud-template.pdf")
    if os.path.isfile(pdf_path):
        return pdf_path

    profile = os.environ.get("LO_PROFILE") or tempfile.mkdtemp(prefix="lo-tpl-")
    profile_url = "file://" + profile.replace(" ", "%20")
    outdir = os.path.dirname(pdf_path) or "."
    subprocess.run(
        [
            "soffice",
            "--headless",
            "--invisible",
            "--nologo",
            f"-env:UserInstallation={profile_url}",
            "--convert-to",
            "pdf",
            "--outdir",
            outdir,
            doc_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    generated = os.path.join(outdir, "FormatoSolicitud.pdf")
    if os.path.isfile(generated) and generated != pdf_path:
        shutil.move(generated, pdf_path)

    if not os.path.isfile(pdf_path):
        raise RuntimeError("No se pudo generar FormatoSolicitud-template.pdf")

    return pdf_path


def load_layout():
    with open(layout_path(), encoding="utf-8") as handle:
        return json.load(handle)


def fill_pdf(template_path, output_path, data):
    layout = load_layout()
    doc = fitz.open(template_path)
    page = doc[0]

    field_map = {
        "fecha": data.get("fecha"),
        "radicado": data.get("radicado"),
        "peticionario": data.get("peticionario"),
        "cedula": data.get("cedula"),
        "direccion": data.get("direccion"),
        "telefono": data.get("telefono"),
        "barrio": data.get("barrio"),
        "correo": data.get("correo"),
        "perjudicante": data.get("perjudicante"),
        "telPerjudicante": data.get("telPerjudicante"),
        "direccionPerjudicante": data.get("direccionPerjudicante"),
        "barrioPerjudicante": data.get("barrioPerjudicante"),
        "recibidaPor": data.get("recibidaPor"),
        "remitidoA": data.get("remitidoA"),
    }

    for key, field_def in layout.get("fields", {}).items():
        overlay.put_fitted_field(page, field_def, field_map.get(key), layout)

    for key, rect in layout.get("textBoxes", {}).items():
        overlay.put_fitted_textbox(page, rect, data.get(key), layout)

    marks = layout.get("marks", {})
    canal = str(data.get("canalDeReporte") or "").strip()

    if data.get("aceptaCorreo") and "aceptaCorreo" in marks:
        overlay.put_mark(page, marks["aceptaCorreo"], layout)

    if canal == "Personal" and "atencionPersonal" in marks:
        overlay.put_mark(page, marks["atencionPersonal"], layout)
    elif canal == "Telefono" and "atencionTelefonica" in marks:
        overlay.put_mark(page, marks["atencionTelefonica"], layout)
    elif canal == "Correo" and data.get("correo") and "aceptaCorreo" in marks:
        overlay.put_mark(page, marks["aceptaCorreo"], layout)

    doc.save(output_path)
    doc.close()


def main():
    if len(sys.argv) < 3:
        print(
            "Uso: fill-formato-solicitud.py <plantilla.pdf|.doc> <salida> [pdf]",
            file=sys.stderr,
        )
        sys.exit(1)

    template_arg = sys.argv[1]
    output_path = sys.argv[2]
    output_format = (sys.argv[3] if len(sys.argv) > 3 else "pdf").lower()

    payload = json.load(sys.stdin)
    template_pdf = ensure_pdf_template(template_arg)

    if output_format != "pdf":
        raise RuntimeError("Solo se admite salida pdf con superposición sobre plantilla.")

    fill_pdf(template_pdf, output_path, payload)
    print(output_path)


if __name__ == "__main__":
    main()
