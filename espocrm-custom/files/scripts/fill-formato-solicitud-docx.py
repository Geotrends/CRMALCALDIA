#!/usr/bin/env python3
"""Diligencia el Formato IV-F-007 y entrega una copia en DOCX."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = "{" + WORD_NS + "}"
ET.register_namespace("w", WORD_NS)
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")


def convert_to_docx(template_path, output_path, profile_path):
    work_dir = os.path.dirname(output_path)
    converted_path = os.path.join(work_dir, "FormatoSolicitud.docx")
    subprocess.run(
        [
            "soffice", "--headless", "--invisible", "--nologo",
            "-env:UserInstallation=file://" + profile_path,
            "--convert-to", "docx", "--outdir", work_dir, template_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not os.path.isfile(converted_path):
        raise RuntimeError("No se pudo convertir la plantilla IV-F-007 a Word.")
    shutil.move(converted_path, output_path)


def paragraph_text(paragraph):
    return "".join(node.text or "" for node in paragraph.iter(W + "t"))


def write_paragraph(paragraph, text):
    nodes = list(paragraph.iter(W + "t"))
    if not nodes:
        run = ET.SubElement(paragraph, W + "r")
        nodes = [ET.SubElement(run, W + "t")]

    nodes[0].text = text
    for node in nodes[1:]:
        node.text = ""


def set_after_label(paragraph, label, value):
    value = str(value or "").strip()
    if value:
        write_paragraph(paragraph, label + " " + value)


def fill_document(docx_path, payload):
    with zipfile.ZipFile(docx_path, "r") as archive:
        members = {name: archive.read(name) for name in archive.namelist()}

    root = ET.fromstring(members["word/document.xml"])
    paragraphs = list(root.iter(W + "p"))
    mappings = [
        ("FECHA:", "fecha"),
        ("RADICADO Nº", "radicado"),
        ("PETICIONARIO:", "peticionario"),
        ("CEDULA", "cedula"),
        ("DIRECCIÓN:", "direccion"),
        ("TELEFONO", "telefono"),
        ("BARRIO", "barrio"),
        ("CORREO ELECTRÓNICO", "correo"),
        ("PERJUDICANTE:", "perjudicante"),
        ("TEL:", "telPerjudicante"),
        ("RECIBIDA POR:", "recibidaPor"),
        ("REMITIDO A:", "remitidoA"),
    ]
    seen = {label: 0 for label, _ in mappings}

    for paragraph in paragraphs:
        original = paragraph_text(paragraph)
        normalized = original.replace("_", "").strip()

        if normalized.startswith("DESCRIPCION QUEJA:"):
            set_after_label(paragraph, "DESCRIPCION QUEJA:", payload.get("descripcion"))
            continue
        if normalized.startswith("RESPUESTA INMEDIATA:"):
            set_after_label(paragraph, "RESPUESTA INMEDIATA:", payload.get("respuestaInmediata"))
            continue

        for label, key in mappings:
            if normalized.startswith(label):
                # La segunda DIRECCIÓN y BARRIO corresponden al perjudicante.
                if label == "DIRECCIÓN:" and seen[label] == 1:
                    key = "direccionPerjudicante"
                if label == "BARRIO" and seen[label] == 1:
                    key = "barrioPerjudicante"
                set_after_label(paragraph, label, payload.get(key))
                seen[label] += 1
                break

        if normalized.startswith("ATENCIÓN PERSONAL") and str(payload.get("canalDeReporte") or "").lower() == "personal":
            write_paragraph(paragraph, "☒ ATENCIÓN PERSONAL")
        elif normalized.startswith("ATENCIÓN TELEFONICA") and str(payload.get("canalDeReporte") or "").lower() in ("telefono", "teléfono"):
            write_paragraph(paragraph, "☒ ATENCIÓN TELEFONICA")
        elif normalized.startswith("Aceptó me sea") and payload.get("aceptaCorreo"):
            write_paragraph(paragraph, "☒ " + original)

    members["word/document.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in members.items():
            archive.writestr(name, content)


def main():
    if len(sys.argv) < 3:
        raise RuntimeError("Uso: fill-formato-solicitud-docx.py <plantilla.doc> <salida.docx>")

    template_path, output_path = sys.argv[1:3]
    payload = json.load(sys.stdin)
    profile_path = os.environ.get("LO_PROFILE") or tempfile.mkdtemp(prefix="lo-formato-007-")
    os.makedirs(profile_path, exist_ok=True)
    convert_to_docx(template_path, output_path, profile_path)
    fill_document(output_path, payload)
    print(output_path)


if __name__ == "__main__":
    main()
