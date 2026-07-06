#!/usr/bin/env python3
"""
Sugiere coordenadas para formato-actuo-archivo-layout.json a partir del DOCX fuente.

Uso:
  python3 generate-actuo-layout-from-docx.py [ruta/ActuoArchivo.docx]
"""

import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

import pymupdf as fitz

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
LINE_STEP_PT = 13.8


def script_dir():
    return os.path.dirname(os.path.abspath(__file__))


def default_docx_path():
    candidates = [
        os.path.join(script_dir(), "..", "..", "formatos", "ActuoArchivo.docx"),
        os.path.join(script_dir(), "..", "templates", "ActuoArchivo.docx"),
    ]

    for candidate in candidates:
        path = os.path.abspath(candidate)
        if os.path.isfile(path):
            return path

    return os.path.abspath(candidates[0])


def twips(value, default=0.0):
    if value is None:
        return default
    return int(value) / 20.0


def text_of(element):
    parts = []
    for node in element.iter(f"{W}t"):
        if node.text:
            parts.append(node.text)
        if node.tail:
            parts.append(node.tail)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def paragraph_step(paragraph):
    spacing = paragraph.find(f"{W}pPr/{W}spacing")
    before = twips(spacing.get(f"{W}before")) if spacing is not None else 0.0
    after = twips(spacing.get(f"{W}after")) if spacing is not None else 0.0
    line = spacing.get(f"{W}line") if spacing is not None else None
    line_pt = twips(line, LINE_STEP_PT * 20) if line else LINE_STEP_PT
    return before, line_pt, after


def label_width(label, font_size=12.0):
    return fitz.get_text_length(label, fontsize=font_size, fontname="helv")


def parse_docx_lines(docx_path):
    with zipfile.ZipFile(docx_path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
        body = root.find(f"{W}body")
        section = body.find(f"{W}sectPr")
        margins = section.find(f"{W}pgMar")
        page_size = section.find(f"{W}pgSz")

        top_margin = twips(margins.get(f"{W}top"))
        left_margin = twips(margins.get(f"{W}left"))
        right_margin = twips(margins.get(f"{W}right"))
        page_width = twips(page_size.get(f"{W}w"))
        page_height = twips(page_size.get(f"{W}h"))

        header_height = 0.0
        if "word/header3.xml" in archive.namelist():
            header = ET.fromstring(archive.read("word/header3.xml"))
            for row in header.iter(f"{W}tr"):
                row_height = row.find(f"{W}trPr/{W}trHeight")
                if row_height is not None:
                    header_height += twips(row_height.get(f"{W}val"), 300)
                else:
                    header_height += 24.0

        body_start = top_margin + header_height * 0.55
        x_left = left_margin + 14.0
        x_right = page_width - right_margin - 14.0
        x_mid = page_width * 0.51

        lines = []
        y = body_start
        for paragraph in body.iter(f"{W}p"):
            before, line_pt, after = paragraph_step(paragraph)
            y += before
            text = text_of(paragraph)
            if text:
                lines.append({"y": round(y, 1), "text": text})
            y += line_pt + after

    return {
        "pageSize": [round(page_width, 1), round(page_height, 1)],
        "xLeft": round(x_left, 1),
        "xRight": round(x_right, 1),
        "xMid": round(x_mid, 1),
        "lines": lines,
    }


def find_line(lines, needle):
    for line in lines:
        if needle.lower() in line["text"].lower():
            return line
    return None


def build_layout(docx_path):
    parsed = parse_docx_lines(docx_path)
    lines = parsed["lines"]

    radicado = find_line(lines, "número de radicado")
    referencia = find_line(lines, "referencia:")
    motivo = find_line(lines, "motivo por")
    dada = find_line(lines, "dada en envigado")
    inspector = find_line(lines, "inspector de polic")

    if not all([radicado, referencia, motivo, dada, inspector]):
        raise RuntimeError("No se pudieron ubicar todos los bloques del DOCX.")

    x_left = parsed["xLeft"]
    x_right = parsed["xRight"]
    x_mid = parsed["xMid"]

    radicado_y = radicado["y"] - LINE_STEP_PT
    referencia_y = referencia["y"]
    motivo_y = motivo["y"]
    dada_y = dada["y"]
    inspector_y = inspector["y"] - LINE_STEP_PT

    ref_prefix = "Referencia: (tema de referencia del proceso) "
    motivo_prefix = "Motivo por el  cual  se archiva el expediente"
    dada_prefix = "Dada en envigado a los "

    return {
        "pageSize": parsed["pageSize"],
        "fontSize": 10,
        "minFontSize": 7,
        "textColor": [0, 0, 0],
        "fieldPadding": {"left": 2, "right": 2, "top": 0, "bottom": 0},
        "defaultFieldAlign": "left",
        "defaultFieldValign": "bottom",
        "fieldSingleLine": True,
        "truncateOverflow": True,
        "ellipsis": "...",
        "autoFields": [
            "numeroRadicado",
            "consecutivoInterno",
            "referencia",
            "fechaDada",
            "inspectorNombre",
        ],
        "manualFields": ["motivoArchivo"],
        "fields": {
            "numeroRadicado": {
                "rect": [x_left, round(radicado_y - 12, 1), x_mid - 12, round(radicado_y, 1)],
                "align": "center",
                "valign": "bottom",
            },
            "consecutivoInterno": {
                "rect": [x_mid + 12, round(radicado_y - 12, 1), x_right, round(radicado_y, 1)],
                "align": "center",
                "valign": "bottom",
            },
            "fechaDada": {
                "rect": [
                    round(x_left + label_width(dada_prefix) - 8, 1),
                    round(dada_y - 12, 1),
                    x_right,
                    round(dada_y, 1),
                ],
                "align": "left",
                "valign": "bottom",
                "fontSize": 10,
            },
            "inspectorNombre": {
                "rect": [120, round(inspector_y - 12, 1), round(parsed["pageSize"][0] - 120, 1), round(inspector_y, 1)],
                "align": "center",
                "valign": "bottom",
            },
        },
        "textBoxes": {
            "referencia": {
                "rect": [x_left, round(referencia_y - 14, 1), x_right, round(referencia_y + 42, 1)],
                "align": "left",
                "singleLine": False,
                "ruledText": True,
                "lineSpacing": LINE_STEP_PT,
                "firstBaselineY": referencia_y,
                "firstLineXOffset": round(label_width(ref_prefix), 1),
                "maxLines": 3,
                "fontSize": 9,
                "minFontSize": 7,
                "padding": {"left": 2, "right": 2, "top": 0, "bottom": 0},
            },
            "motivoArchivo": {
                "rect": [x_left, round(motivo_y - 14, 1), x_right, round(dada_y - 14, 1)],
                "align": "left",
                "singleLine": False,
                "ruledText": True,
                "lineSpacing": LINE_STEP_PT,
                "firstBaselineY": motivo_y,
                "firstLineXOffset": round(label_width(motivo_prefix), 1),
                "maxLines": 11,
                "fontSize": 10,
                "padding": {"left": 2, "right": 2, "top": 0, "bottom": 0},
            },
        },
    }


def main():
    docx_path = sys.argv[1] if len(sys.argv) > 1 else default_docx_path()
    docx_path = os.path.abspath(docx_path)

    if not os.path.isfile(docx_path):
        print(f"No se encontró DOCX: {docx_path}", file=sys.stderr)
        sys.exit(1)

    layout = build_layout(docx_path)
    out_path = os.path.join(script_dir(), "formato-actuo-archivo-layout.json")

    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(layout, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Layout generado desde DOCX: {out_path}")
    print(json.dumps(layout, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
