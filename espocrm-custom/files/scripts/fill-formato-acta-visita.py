#!/usr/bin/env python3
"""
Superpone datos sobre ActaVisita2-template.pdf sin modificar la plantilla.
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
    return os.path.join(script_dir(), "formato-acta-visita-layout.json")


def resolve_template_path(template_arg):
    if template_arg.lower().endswith(".pdf"):
        return template_arg

    pdf_candidate = os.path.join(
        os.path.dirname(template_arg),
        "ActaVisita2-template.pdf",
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
        doc_path = os.path.join(os.path.dirname(template_arg), "ActaVisita2.docx")

    pdf_path = os.path.join(os.path.dirname(doc_path), "ActaVisita2-template.pdf")
    if os.path.isfile(pdf_path):
        return pdf_path

    profile = os.environ.get("LO_PROFILE") or tempfile.mkdtemp(prefix="lo-acta-tpl-")
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

    generated = os.path.join(outdir, "ActaVisita2.pdf")
    if os.path.isfile(generated) and generated != pdf_path:
        shutil.move(generated, pdf_path)

    if not os.path.isfile(pdf_path):
        raise RuntimeError("No se pudo generar ActaVisita2-template.pdf")

    return pdf_path


def load_layout():
    with open(layout_path(), encoding="utf-8") as handle:
        return json.load(handle)


def build_field_values(data):
    radicado = str(data.get("numeroRadicado") or "").strip()
    expediente = str(data.get("expediente") or "").strip()
    radicado_text = radicado
    if expediente:
        radicado_text = f"{radicado} / Exp: {expediente}" if radicado else expediente

    fecha = (
        data.get("fechaVisita")
        or data.get("fechaHora")
        or data.get("fecha")
        or ""
    )

    return {
        "fecha": fecha,
        "posibleAfectante": data.get("posibleAfectante"),
        "radicado": radicado_text,
        "direccionAfectacion": data.get("direccionAfectacion"),
        "telefono": data.get("telefono"),
        "barrio": data.get("barrio"),
        "fechaVisita": fecha,
        "objetoVisita": data.get("objetoVisita"),
        "situacionEncontrada": data.get("situacionEncontrada"),
        "analisisSituacion": data.get("analisisSituacion"),
        "registroFotografico": data.get("registroFotografico"),
        "conclusion": data.get("conclusion"),
        "requerimientos": data.get("requerimientos"),
        "funcionarioNombre": data.get("funcionarioNombre"),
        "establecimientoNombre": data.get("establecimientoNombre"),
        "funcionarioCedula": data.get("funcionarioCedula"),
        "establecimientoCedula": data.get("establecimientoCedula"),
        "funcionarioCargo": data.get("funcionarioCargo"),
        "establecimientoCargo": data.get("establecimientoCargo"),
    }


def fill_pdf(template_path, output_path, data):
    layout = load_layout()
    doc = fitz.open(template_path)
    values = build_field_values(data)
    pages = layout.get("pages", [])

    for index, page_layout in enumerate(pages):
        if index >= len(doc):
            break

        page = doc[index]

        for key, field_def in page_layout.get("fields", {}).items():
            overlay.put_fitted_field(page, field_def, values.get(key), layout)

        for key, rect in page_layout.get("textBoxes", {}).items():
            overlay.put_fitted_textbox(page, rect, values.get(key), layout)

        marks = page_layout.get("marks", {})
        zona = str(data.get("zona") or "").strip()

        if zona == "Urbano" and "zonaUrbano" in marks:
            overlay.put_mark(page, marks["zonaUrbano"], layout)
        elif zona == "Rural" and "zonaRural" in marks:
            overlay.put_mark(page, marks["zonaRural"], layout)

    doc.save(output_path)
    doc.close()


def main():
    if len(sys.argv) < 3:
        print(
            "Uso: fill-formato-acta-visita.py <plantilla.pdf|.docx> <salida> [pdf]",
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
