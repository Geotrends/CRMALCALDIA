#!/usr/bin/env python3
"""Rellena ActaVisita2.docx conservando el diseño de la plantilla."""

import json
import os
import re
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


def replace_label_underscores(doc, label, value):
    text = (value or "").strip()
    if not text:
        return
    pattern = re.escape(label) + r"\s*_+"
    replace_regex(doc, pattern, label + " " + text)


def fill_label_value(doc, label, value):
    text = (value or "").strip()
    if not text:
        return
    pattern = re.escape(label) + r"\s*"
    replace_regex(doc, pattern, label + " " + text)


def mark_zona(doc, zona):
    zona = (zona or "").strip()
    if zona == "Urbano":
        replace_regex(doc, r"Urbano \(\s*\)", "Urbano ( X )")
    elif zona == "Rural":
        replace_regex(doc, r"Rural\s*\(\s*\)", "Rural  ( X )")


def fill_signature_row(doc, label, left_value, right_value):
    left = (left_value or "").strip()
    right = (right_value or "").strip()
    if not left and not right:
        return

    pattern = (
        "("
        + re.escape(label)
        + r"\s*_+\s+"
        + re.escape(label)
        + r"\s*_+)"
    )
    # La plantilla usa tabulaciones entre columnas (funcionario | establecimiento).
    replacement = label + " " + (left or "_____________________")
    replacement += "\t\t" + label + " " + (right or "_____________________")
    replace_regex(doc, pattern, replacement)


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

        anio = str(data.get("anio") or "").strip()
        if anio:
            replace_regex(doc, r"AÑO:\s*", "AÑO: " + anio + " ")

        replace_label_underscores(
            doc, "Posible Afectante:", data.get("posibleAfectante", "")
        )

        radicado = (data.get("numeroRadicado") or "").strip()
        expediente = (data.get("expediente") or "").strip()
        radicado_text = radicado
        if expediente:
            radicado_text = (radicado + " / Exp: " + expediente).strip(" /")
        replace_label_underscores(doc, "Radicado de la solicitud:", radicado_text)

        replace_label_underscores(
            doc,
            "Dirección donde se origina la afectación:",
            data.get("direccionAfectacion", ""),
        )
        replace_label_underscores(doc, "Teléfono:", data.get("telefono", ""))

        barrio = (data.get("barrio") or "").strip()
        if barrio:
            pattern = re.escape("Barrio:") + r"\s*_+"
            replace_regex(doc, pattern, "Barrio: " + barrio + " ")

        mark_zona(doc, data.get("zona", ""))

        fecha = (data.get("fechaVisita") or "").strip()
        if fecha:
            replace_regex(
                doc,
                r"Fecha de la Visita: \(AAAA/MM/DD\)\s*_+",
                "Fecha de la Visita: (AAAA/MM/DD) " + fecha,
            )

        fill_label_value(doc, "OBJETO DE LA VISITA O SOLICITUD:", data.get("objetoVisita", ""))
        fill_label_value(doc, "SITUACIÓN ENCONTRADA:", data.get("situacionEncontrada", ""))
        fill_label_value(doc, "ANÁLISIS DE LA SITUACIÓN", data.get("analisisSituacion", ""))
        fill_label_value(doc, "REGISTRO FOTOGRAFICO:", data.get("registroFotografico", ""))
        fill_label_value(doc, "CONCLUSIÓN:", data.get("conclusion", ""))
        fill_label_value(doc, "REQUERIMIENTOS", data.get("requerimientos", ""))

        fill_signature_row(
            doc,
            "Nombre:",
            data.get("funcionarioNombre", ""),
            data.get("establecimientoNombre", ""),
        )
        fill_signature_row(
            doc,
            "C.C:",
            data.get("funcionarioCedula", ""),
            data.get("establecimientoCedula", ""),
        )
        fill_signature_row(
            doc,
            "Cargo:",
            data.get("funcionarioCargo", ""),
            data.get("establecimientoCargo", ""),
        )

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
            "Uso: fill-formato-acta-visita.py <plantilla.docx> <salida> [docx|pdf]",
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
