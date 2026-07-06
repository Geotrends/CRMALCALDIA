#!/usr/bin/env python3
"""
Genera el auto de archivo superponiendo datos sobre ActuoArchivo-template.pdf
(sin alterar líneas ni diseño de la plantilla), igual que solicitud y acta de visita.
"""

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime

import pymupdf as fitz

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
    return os.path.join(script_dir(), "formato-actuo-archivo-layout.json")


def format_date_spanish(date_str):
    text = (date_str or "").strip()
    if not text:
        return ""
    try:
        dt = datetime.strptime(text[:10], "%Y-%m-%d")
        return f"{dt.day} días del mes de {MESES[dt.month - 1]} de {dt.year}"
    except ValueError:
        return text


def resolve_template_path(template_arg):
    if template_arg.lower().endswith(".pdf"):
        return template_arg

    pdf_candidate = os.path.join(
        os.path.dirname(template_arg),
        "ActuoArchivo-template.pdf",
    )
    if os.path.isfile(pdf_candidate):
        return pdf_candidate

    return template_arg


def ensure_pdf_template(template_arg):
    path = resolve_template_path(template_arg)
    if path.lower().endswith(".pdf") and os.path.isfile(path):
        return path

    doc_path = template_arg
    if not doc_path.lower().endswith(".docx"):
        doc_path = os.path.join(os.path.dirname(template_arg), "ActuoArchivo.docx")

    pdf_path = os.path.join(os.path.dirname(doc_path), "ActuoArchivo-template.pdf")
    if os.path.isfile(pdf_path):
        return pdf_path

    profile = os.environ.get("LO_PROFILE") or tempfile.mkdtemp(prefix="lo-tpl-actuo-")
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

    generated = os.path.join(outdir, "ActuoArchivo.pdf")
    if os.path.isfile(generated) and generated != pdf_path:
        shutil.move(generated, pdf_path)

    if not os.path.isfile(pdf_path):
        raise RuntimeError("No se pudo generar ActuoArchivo-template.pdf")

    return pdf_path


def load_layout():
    with open(layout_path(), encoding="utf-8") as handle:
        return json.load(handle)


def apply_modo(values, data, layout):
    modo = str(data.get("modo") or data.get("modoDiligenciamiento") or "digital").strip().lower()
    if modo != "manual":
        return values

    manual_fields = set(layout.get("manualFields", []))
    auto_fields = set(layout.get("autoFields", []))

    for key in list(values.keys()):
        if key in manual_fields or key not in auto_fields:
            values[key] = ""

    return values


def build_field_values(data):
    return {
        "fechaAuto": format_date_spanish(data.get("fechaAuto", "")),
        "numeroRadicado": (data.get("numeroRadicado") or "").strip(),
        "consecutivoInterno": (data.get("consecutivoInterno") or "").strip(),
        "referencia": (data.get("referencia") or "").strip(),
        "motivoArchivo": (data.get("motivoArchivo") or "").strip(),
        "fechaDada": format_date_spanish(data.get("fechaDada", "")),
        "inspectorNombre": (data.get("inspectorNombre") or "").strip(),
    }


def fill_pdf(template_path, output_path, data):
    layout = load_layout()
    doc = fitz.open(template_path)
    page = doc[0]
    values = apply_modo(build_field_values(data), data, layout)

    for key, field_def in layout.get("fields", {}).items():
        overlay.put_fitted_field(page, field_def, values.get(key), layout)

    for key, rect_def in layout.get("textBoxes", {}).items():
        if isinstance(rect_def, dict):
            rect = rect_def.get("rect")
            field_def = rect_def
        else:
            rect = rect_def
            field_def = {"align": "left", "singleLine": False}

        overlay.put_fitted_textbox(page, rect, values.get(key), layout, field_def)

    doc.save(output_path)
    doc.close()


def main():
    if len(sys.argv) < 3:
        print(
            "Uso: fill-formato-actuo-archivo.py <plantilla.pdf|.docx> <salida> [pdf|docx]",
            file=sys.stderr,
        )
        sys.exit(1)

    template_arg = sys.argv[1]
    output_path = sys.argv[2]
    output_format = (sys.argv[3] if len(sys.argv) > 3 else "pdf").lower()
    payload = json.load(sys.stdin)

    if output_format == "docx":
        modo = str(payload.get("modo") or "").strip().lower()
        docx_path = template_arg
        if not docx_path.lower().endswith(".docx"):
            docx_path = os.path.join(os.path.dirname(template_arg), "ActuoArchivo.docx")
        if not os.path.isfile(docx_path):
            raise RuntimeError("No se encontró ActuoArchivo.docx")
        shutil.copy2(docx_path, output_path)
        print(output_path)
        return

    template_pdf = ensure_pdf_template(template_arg)
    fill_pdf(template_pdf, output_path, payload)
    print(output_path)


if __name__ == "__main__":
    main()
