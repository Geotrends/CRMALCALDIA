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
import zipfile
import xml.etree.ElementTree as ET
from copy import deepcopy

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


def format_fecha_display(value):
    value = str(value or "").strip()
    if not value:
        return ""

    if " " in value:
        value = value.split(" ", 1)[0]

    parts = value.split("-")
    if len(parts) == 3 and len(parts[0]) == 4:
        return f"{parts[2]}/{parts[1]}/{parts[0]}"

    parts = value.split("/")
    if len(parts) == 3 and len(parts[2]) == 4:
        return value

    return value


def build_field_values(data):
    radicado = str(data.get("numeroRadicado") or "").strip()
    expediente = str(data.get("expediente") or "").strip()
    radicado_text = radicado
    if expediente:
        radicado_text = f"{radicado} / Exp: {expediente}" if radicado else expediente

    fecha_doc = format_fecha_display(data.get("fecha"))
    fecha_visita = format_fecha_display(
        data.get("fechaVisita") or data.get("fechaHora")
    )

    return {
        "fecha": fecha_doc or fecha_visita,
        "posibleAfectante": data.get("posibleAfectante"),
        "radicado": radicado_text,
        "direccionAfectacion": data.get("direccionAfectacion"),
        "telefono": data.get("telefono"),
        "barrio": data.get("barrio"),
        "fechaVisita": fecha_visita or fecha_doc,
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


def apply_modo(values, data, layout):
    modo = str(data.get("modoDiligenciamiento") or data.get("modo") or "digital").strip().lower()

    if modo != "manual":
        return values

    manual_fields = set(layout.get("manualFields", []))
    auto_fields = set(layout.get("autoFields", []))

    for key in list(values.keys()):
        if key in manual_fields or key not in auto_fields:
            values[key] = ""

    return values


# Coordenadas de la plantilla ActaVisita2 (página 1) para insertar las fotos dentro de
# "REGISTRO FOTOGRÁFICO" y desplazar lo que sigue, como crecería la sección en el Word.
FOTOS_HEADER_BOTTOM = 112
FOTOS_FOOTER_TOP = 733
FOTOS_CONTENT_TOP = 125
FOTOS_CONTENT_BOTTOM = 728
FOTOS_REGISTRO_TITULO = (621, 641)
FOTOS_CONCLUSION = (681, 733)
FOTOS_X = (57, 555)
FOTOS_MAX_HEIGHT = 300
FOTOS_CAPTION = 12
FOTOS_GAP = 10
PAGINA_RECT = fitz.Rect(428, 85, 556, 106)


def foto_size(path):
    try:
        pix = fitz.Pixmap(path)
        width, height = pix.width, pix.height
        pix = None
    except Exception:
        return None

    if not width or not height:
        return None

    max_width = FOTOS_X[1] - FOTOS_X[0]
    scale = min(max_width / width, FOTOS_MAX_HEIGHT / height)
    return width * scale, height * scale


def paginate_with_fotos(doc, fotos, fonts):
    """Reconstruye el PDF con las fotos dentro de la sección de registro fotográfico."""
    fotos = [foto for foto in fotos if os.path.isfile(str(foto.get("path") or ""))]
    if not fotos or not len(doc):
        return doc

    width, height = doc[0].rect.width, doc[0].rect.height
    out = fitz.open()

    def show(page, top, bottom, y=None):
        y = top if y is None else y
        page.show_pdf_page(fitz.Rect(0, y, width, y + bottom - top), doc, 0, clip=fitz.Rect(0, top, width, bottom))
        return y + bottom - top

    def new_page():
        page = out.new_page(width=width, height=height)
        for name, buffer in fonts.items():
            page.insert_font(fontname=name, fontbuffer=buffer)
        show(page, 0, FOTOS_HEADER_BOTTOM)
        show(page, FOTOS_FOOTER_TOP, height)
        return page

    items = []
    for foto in fotos:
        size = foto_size(foto["path"])
        items.append((foto, size, (size[1] if size else 0) + FOTOS_CAPTION))

    titulo_alto = FOTOS_REGISTRO_TITULO[1] - FOTOS_REGISTRO_TITULO[0]
    page = out.new_page(width=width, height=height)
    for name, buffer in fonts.items():
        page.insert_font(fontname=name, fontbuffer=buffer)
    show(page, FOTOS_FOOTER_TOP, height)

    # El título viaja con la primera foto si esta no cabe en la página 1.
    if FOTOS_REGISTRO_TITULO[1] + items[0][2] <= FOTOS_CONTENT_BOTTOM:
        y = show(page, 0, FOTOS_REGISTRO_TITULO[1])
    else:
        show(page, 0, FOTOS_REGISTRO_TITULO[0])
        page = new_page()
        y = show(page, *FOTOS_REGISTRO_TITULO, y=FOTOS_CONTENT_TOP)

    caption_font = fitz.Font(fontbuffer=fonts["FotoR"])
    total = len(items)
    for index, (foto, size, needed) in enumerate(items):
        if y + needed > FOTOS_CONTENT_BOTTOM:
            page = new_page()
            y = FOTOS_CONTENT_TOP

        caption = f"Foto {index + 1} de {total}: {foto.get('name') or ''}"
        if size:
            x0 = FOTOS_X[0] + ((FOTOS_X[1] - FOTOS_X[0]) - size[0]) / 2
            try:
                page.insert_image(fitz.Rect(x0, y, x0 + size[0], y + size[1]), filename=foto["path"])
            except Exception:
                caption += " (no se pudo incluir la imagen)"
            y += size[1]
        else:
            caption += " (no se pudo incluir la imagen)"

        caption_width = caption_font.text_length(caption, fontsize=8)
        caption_x = FOTOS_X[0] + max(0, ((FOTOS_X[1] - FOTOS_X[0]) - caption_width) / 2)
        page.insert_text((caption_x, y + 9), caption, fontname="FotoR", fontsize=8)
        y += FOTOS_CAPTION + FOTOS_GAP

    conclusion_alto = FOTOS_CONCLUSION[1] - FOTOS_CONCLUSION[0]
    if y + conclusion_alto > FOTOS_FOOTER_TOP:
        page = new_page()
        y = FOTOS_CONTENT_TOP
    show(page, *FOTOS_CONCLUSION, y=y)

    if len(doc) > 1:
        out.insert_pdf(doc, from_page=1, to_page=len(doc) - 1)

    total_pages = len(out)
    for number, out_page in enumerate(out, start=1):
        out_page.insert_font(fontname="FotoB", fontbuffer=fonts["FotoB"])
        out_page.draw_rect(PAGINA_RECT, color=(1, 1, 1), fill=(1, 1, 1))
        out_page.insert_text((430, 99), f"Página {number} de {total_pages}", fontname="FotoB", fontsize=11)

    doc.close()
    return out


def fill_pdf(template_path, output_path, data):
    layout = load_layout()
    doc = fitz.open(template_path)
    values = apply_modo(build_field_values(data), data, layout)
    pages = layout.get("pages", [])

    for index, page_layout in enumerate(pages):
        if index >= len(doc):
            break

        page = doc[index]

        for label_def in page_layout.get("labels", {}).values():
            overlay.put_static_label(page, label_def, layout)

        for key, field_def in page_layout.get("fields", {}).items():
            if key in layout.get("manualFields", []) and str(
                data.get("modoDiligenciamiento") or data.get("modo") or ""
            ).strip().lower() == "manual" and key not in layout.get("autoFields", []):
                continue
            overlay.put_fitted_field(page, field_def, values.get(key), layout)

        for key, rect in page_layout.get("textBoxes", {}).items():
            if key in layout.get("manualFields", []) and str(
                data.get("modoDiligenciamiento") or data.get("modo") or ""
            ).strip().lower() == "manual":
                continue
            overlay.put_fitted_textbox(page, rect, values.get(key), layout)

        marks = page_layout.get("marks", {})
        zona = str(data.get("zona") or "").strip()

        if zona == "Urbano" and "zonaUrbano" in marks:
            overlay.put_mark(page, marks["zonaUrbano"], layout)
        elif zona == "Rural" and "zonaRural" in marks:
            overlay.put_mark(page, marks["zonaRural"], layout)

    if str(data.get("modo") or "").strip().lower() != "manual" and data.get("fotos"):
        # Fuentes embebidas con nombre propio: las base14 compartidas con las páginas
        # del formato pierden las tildes en las páginas nuevas.
        fonts = {"FotoB": fitz.Font("hebo").buffer, "FotoR": fitz.Font("helv").buffer}
        doc = paginate_with_fotos(doc, data.get("fotos"), fonts)

    titulo = str(data.get("tituloDocumento") or "").strip()
    if titulo:
        metadata = dict(doc.metadata or {})
        metadata["title"] = titulo
        doc.set_metadata(metadata)

    doc.save(output_path)
    doc.close()


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def word_tag(name):
    return f"{{{WORD_NS}}}{name}"


def paragraph_text(paragraph):
    return "".join(node.text or "" for node in paragraph.iter(word_tag("t")))


def fill_word_line(paragraph, value):
    """Reemplaza el espacio subrayado de un dato existente en el formato."""
    value = str(value or "").strip()
    if not value:
        return False

    for node in paragraph.iter(word_tag("t")):
        original = node.text or ""
        if "_" not in original:
            continue

        capacity = original.count("_")
        if capacity < 2:
            continue

        text = value[:capacity]
        node.text = text + ("_" * max(1, capacity - len(text)))
        node.set(XML_SPACE, "preserve")
        return True

    return False


def append_word_value(paragraph, value):
    """Añade un valor a una etiqueta que no tiene línea de subrayado."""
    value = str(value or "").strip()
    runs = list(paragraph.findall(word_tag("r")))
    if not value or not runs:
        return False

    run = deepcopy(runs[-1])
    for child in list(run):
        if child.tag != word_tag("rPr"):
            run.remove(child)

    text = ET.SubElement(run, word_tag("t"))
    text.text = " " + value
    text.set(XML_SPACE, "preserve")
    paragraph.append(run)

    return True


def fill_docx(template_path, output_path, data):
    """Genera una copia editable del Word oficial con datos previos a visita.

    La plantilla no contiene campos de combinación. Se preserva su estructura
    y se sustituyen únicamente los renglones de datos que ya están registrados
    en el caso; las secciones de hallazgos siguen vacías para campo.
    """
    values = build_field_values(data)

    with zipfile.ZipFile(template_path, "r") as source:
        root = ET.fromstring(source.read("word/document.xml"))
        replacements = [
            ("INFORMACIÓN GENERAL FECHA", values.get("fecha")),
            ("Posible Afectante", values.get("posibleAfectante")),
            ("Radicado de la solicitud", values.get("radicado")),
            ("Dirección donde se origina la afectación", values.get("direccionAfectacion")),
            ("Teléfono:", values.get("telefono")),
            ("Barrio:", values.get("barrio")),
        ]

        for label, value in replacements:
            for paragraph in root.iter(word_tag("p")):
                if label.lower() in paragraph_text(paragraph).lower():
                    if not fill_word_line(paragraph, value) and label == "INFORMACIÓN GENERAL FECHA":
                        append_word_value(paragraph, value)
                    break

        updated_document = ET.tostring(root, encoding="utf-8", xml_declaration=True)

        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                content = updated_document if item.filename == "word/document.xml" else source.read(item.filename)
                target.writestr(item, content)


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
    if output_format == "docx":
        if not template_arg.lower().endswith(".docx"):
            raise RuntimeError("La salida Word requiere la plantilla ActaVisita2.docx.")
        fill_docx(template_arg, output_path, payload)
    elif output_format == "pdf":
        fill_pdf(ensure_pdf_template(template_arg), output_path, payload)
    else:
        raise RuntimeError("Formato de salida no válido. Use pdf o docx.")
    print(output_path)


if __name__ == "__main__":
    main()
