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
import zipfile

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


# Posiciones de tabulación en twips (definidas en ActaVisita2.docx).
SIGNATURE_TAB_LEFT = 5620
SIGNATURE_TAB_RIGHT = 6493


def escape_xml(text):
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def run_props(bold=False):
    bold_tag = "<w:b/>" if bold else ""
    return (
        "<w:rPr>"
        '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
        f"{bold_tag}"
        '<w:color w:val="000000"/>'
        '<w:sz w:val="22"/>'
        '<w:szCs w:val="22"/>'
        '<w:lang w:val="es-ES" w:eastAsia="es-ES"/>'
        "</w:rPr>"
    )


def build_signature_cell(label, value):
    content = str(value or "").strip()
    if content:
        return f"{label} {content}"
    return f"{label} "


def signature_paragraph_xml(left_label, left_value, right_label, right_value):
    left = escape_xml(build_signature_cell(left_label, left_value))
    right = escape_xml(build_signature_cell(right_label, right_value))
    rpr = run_props()
    tabs = (
        "<w:tabs>"
        f'<w:tab w:val="left" w:pos="{SIGNATURE_TAB_LEFT}"/>'
        f'<w:tab w:val="left" w:pos="{SIGNATURE_TAB_RIGHT}"/>'
        "</w:tabs>"
    )
    return (
        '<w:p w:rsidR="003E1B93" w:rsidRDefault="003E1B93" w:rsidP="003E1B93">'
        '<w:pPr><w:pStyle w:val="NormalWeb"/>'
        f"{tabs}"
        '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
        '<w:lang w:val="es-ES" w:eastAsia="es-ES"/></w:rPr></w:pPr>'
        f"<w:r>{rpr}<w:t xml:space=\"preserve\">{left}</w:t></w:r>"
        f"<w:r>{rpr}<w:tab/></w:r>"
        f"<w:r>{rpr}<w:tab/></w:r>"
        f"<w:r>{rpr}<w:t xml:space=\"preserve\">{right}</w:t></w:r>"
        "</w:p>"
    )


def fecha_visita_paragraph_xml(fecha):
    fecha = escape_xml(fecha)
    return (
        '<w:p w:rsidR="003E1B93" w:rsidRDefault="003E1B93" w:rsidP="003E1B93">'
        "<w:pPr>"
        '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto" w:shadow="1"/></w:pBdr>'
        '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
        '<w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>'
        "</w:pPr>"
        f"<w:r>{run_props(bold=True)}<w:t>Fecha de la Visita:</w:t></w:r>"
        f"<w:r>{run_props()}<w:t xml:space=\"preserve\"> {fecha}</w:t></w:r>"
        "</w:p>"
    )


def replace_paragraph_containing(xml, marker, new_paragraph):
    pattern = (
        r"<w:p[^>]*>(?:(?!</w:p>).)*?"
        + re.escape(marker)
        + r"(?:(?!</w:p>).)*?</w:p>"
    )
    return re.sub(pattern, new_paragraph, xml, count=1, flags=re.DOTALL)


def patch_docx_xml(docx_path, data):
    with zipfile.ZipFile(docx_path, "r") as zin:
        xml = zin.read("word/document.xml").decode("utf-8")
        other_files = {
            name: zin.read(name)
            for name in zin.namelist()
            if name != "word/document.xml"
        }

    fecha_visita = (data.get("fechaVisita") or "").strip()
    if fecha_visita:
        xml = replace_paragraph_containing(
            xml,
            "Fecha de la Visita",
            fecha_visita_paragraph_xml(fecha_visita),
        )

    signature_rows = [
        ("Firma:", "", "Firma:", ""),
        ("Nombre:", data.get("funcionarioNombre"), "Nombre:", data.get("establecimientoNombre")),
        ("C.C:", data.get("funcionarioCedula"), "C.C:", data.get("establecimientoCedula")),
        ("Cargo:", data.get("funcionarioCargo"), "Cargo:", data.get("establecimientoCargo")),
    ]

    for left_label, left_value, right_label, right_value in signature_rows:
        marker = left_label + " _"
        xml = replace_paragraph_containing(
            xml,
            marker,
            signature_paragraph_xml(left_label, left_value, right_label, right_value),
        )

    # Quitar placeholder gris y forzar texto negro en todo el documento.
    xml = re.sub(
        r"<w:r[^>]*>(?:(?!</w:r>).)*?<w:color w:val=\"D9D9D9\"/>.*?</w:r>",
        "",
        xml,
        flags=re.DOTALL,
    )
    xml = xml.replace('w:val="D9D9D9"', 'w:val="000000"')

    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("word/document.xml", xml.encode("utf-8"))
        for name, content in other_files.items():
            zout.writestr(name, content)


def format_signature_date(value):
    text = (value or "").strip()
    if not text:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text):
        year, month, day = text.split("-")
        return f"{day}/{month}/{year}"
    return text


def fill_doc(template_path, output_path, data):
    proc, port = start_soffice()

    try:
        shutil.copy2(template_path, output_path)
        patch_docx_xml(output_path, data)
        ctx = connect(port)
        desktop = ctx.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", ctx
        )
        url = uno.systemPathToFileUrl(os.path.abspath(output_path))
        doc = desktop.loadComponentFromURL(url, "_blank", 0, ())

        fecha = format_signature_date(data.get("fecha"))
        if fecha:
            replace_regex(doc, r"AÑO:\s*.*", "FECHA: " + fecha + " ")
            replace_regex(doc, r"FECHA:\s*[\d/\-]*", "FECHA: " + fecha + " ")

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

        fill_label_value(doc, "OBJETO DE LA VISITA O SOLICITUD:", data.get("objetoVisita", ""))
        fill_label_value(doc, "SITUACIÓN ENCONTRADA:", data.get("situacionEncontrada", ""))
        fill_label_value(doc, "ANÁLISIS DE LA SITUACIÓN", data.get("analisisSituacion", ""))
        fill_label_value(doc, "REGISTRO FOTOGRAFICO:", data.get("registroFotografico", ""))
        fill_label_value(doc, "CONCLUSIÓN:", data.get("conclusion", ""))
        fill_label_value(doc, "REQUERIMIENTOS", data.get("requerimientos", ""))

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
