#!/usr/bin/env python3
"""
Genera formato-actuo-archivo-layout.json a partir del PDF plantilla real
(detecta renglones de guiones bajos en el texto).

Uso:
  python3 calibrate-actuo-archivo-layout.py [ruta/ActuoArchivo-template.pdf]
"""

import json
import os
import sys

import pymupdf as fitz


def script_dir():
    return os.path.dirname(os.path.abspath(__file__))


def default_template_path():
    candidates = [
        os.path.join(script_dir(), "..", "templates", "ActuoArchivo-template.pdf"),
        os.path.join(script_dir(), "..", "..", "formatos", "ActuoArchivo-template.pdf"),
    ]

    for candidate in candidates:
        path = os.path.abspath(candidate)
        if os.path.isfile(path):
            return path

    return os.path.abspath(candidates[0])


def underscore_lines(page, min_length=10):
    lines = []

    for word in page.get_text("words"):
        text = str(word[4] or "").strip()
        if len(text) < min_length:
            continue
        if set(text) != {"_"}:
            continue

        lines.append(
            {
                "y": round(word[1], 1),
                "x0": round(word[0], 1),
                "x1": round(word[2], 1),
                "width": round(word[2] - word[0], 1),
            }
        )

    lines.sort(key=lambda item: (item["y"], item["x0"]))
    return lines


def body_underscore_lines(lines, min_y=180.0):
    return [line for line in lines if line["y"] >= min_y]


def split_radicado_lines(lines):
    if len(lines) < 2:
        raise RuntimeError("No se detectaron los dos renglones de radicado/consecutivo.")

    first_y = lines[0]["y"]
    same_row = [line for line in lines if abs(line["y"] - first_y) <= 1.5]

    if len(same_row) < 2:
        raise RuntimeError("No se detectaron los dos renglones de radicado/consecutivo.")

    same_row.sort(key=lambda item: item["x0"])
    remaining = [line for line in lines if line not in same_row]

    return same_row[0], same_row[1], remaining


def field_rect(line, pad_x=1.0, pad_y=12.0):
    return [
        round(line["x0"] + pad_x, 1),
        round(line["y"] - pad_y, 1),
        round(line["x1"] - pad_x, 1),
        round(line["y"] + 2.0, 1),
    ]


def build_layout(page):
    rect = page.rect
    all_lines = underscore_lines(page)
    lines = body_underscore_lines(all_lines)

    if len(lines) < 8:
        raise RuntimeError(f"Se esperaban al menos 8 renglones; se detectaron {len(lines)}.")

    radicado, consecutivo, remaining = split_radicado_lines(lines)
    referencia = remaining[:3]
    tail = remaining[3:]

    if len(referencia) < 3 or len(tail) < 2:
        raise RuntimeError("No se detectaron todos los bloques del auto de archivo.")

    motivo = tail[:-2]
    fecha = tail[-2]
    inspector = tail[-1]
    ref_first = referencia[0]
    ref_offset = round(ref_first["x0"] - radicado["x0"], 1)
    page_right = max(consecutivo["x1"], motivo[-1]["x1"], inspector["x1"])

    return {
        "pageSize": [round(rect.width, 1), round(rect.height, 1)],
        "fontSize": 10,
        "minFontSize": 7,
        "textColor": [0, 0, 0],
        "borderStyle": {
            "width": 0.35,
            "color": [0.55, 0.55, 0.55],
            "coverPad": 1.5,
        },
        "restyleHeaderBorders": True,
        "headerBorderRegion": [78, 34, 534, 122],
        "fieldPadding": {"left": 2, "right": 4, "top": 0, "bottom": 0},
        "defaultFieldAlign": "left",
        "defaultFieldValign": "center",
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
        "labels": {
            "colombia": {
                "label": " Colombia,",
                "labelRect": [145, 158, 235, 172],
                "labelAlign": "left",
                "labelFontSize": 12,
            }
        },
        "fields": {
            "numeroRadicado": {
                "rect": field_rect(radicado),
                "align": "center",
            },
            "consecutivoInterno": {
                "rect": field_rect(consecutivo),
                "align": "center",
            },
            "fechaDada": {
                "rect": field_rect(fecha, pad_y=10.0),
                "align": "left",
                "valign": "bottom",
            },
            "inspectorNombre": {
                "rect": field_rect(inspector),
                "align": "center",
            },
        },
        "textBoxes": {
            "referencia": {
                "rect": [
                    round(radicado["x0"], 1),
                    round(referencia[0]["y"] - 12.8, 1),
                    round(page_right, 1),
                    round(referencia[-1]["y"] + 7.2, 1),
                ],
                "align": "left",
                "singleLine": False,
                "valign": "top",
                "fontSize": 9,
                "minFontSize": 7,
                "padding": {"left": 2, "right": 4, "top": 18, "bottom": 0},
            },
            "motivoArchivo": {
                "rect": [
                    round(motivo[0]["x0"], 1),
                    round(motivo[0]["y"] - 8.8, 1),
                    round(motivo[0]["x1"], 1),
                    round(motivo[-1]["y"] + 4.2, 1),
                ],
                "align": "left",
                "singleLine": False,
                "valign": "top",
                "fontSize": 10,
                "padding": {"left": 2, "right": 4, "top": 2, "bottom": 0},
            },
        },
        "_detectedLines": lines,
    }


def main():
    template = sys.argv[1] if len(sys.argv) > 1 else default_template_path()
    template = os.path.abspath(template)

    if not os.path.isfile(template):
        print(f"No se encontró plantilla: {template}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(template)
    page = doc[0]
    layout = build_layout(page)

    print(f"Plantilla: {template}")
    print(f"pageSize: {layout['pageSize']}")
    print(f"Renglones detectados: {len(layout['_detectedLines'])}")

    for index, line in enumerate(layout["_detectedLines"], start=1):
        print(
            f"  {index:02d}. y={line['y']:6.1f}  "
            f"x={line['x0']:6.1f}-{line['x1']:6.1f}"
        )

    out_path = os.path.join(script_dir(), "formato-actuo-archivo-layout.json")
    export_layout = dict(layout)
    export_layout.pop("_detectedLines", None)

    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(export_layout, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    detail_path = os.path.join(script_dir(), "actuo-archivo-detected-lines.json")
    with open(detail_path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "pageSize": layout["pageSize"],
                "sampleLines": layout["_detectedLines"],
            },
            handle,
            indent=2,
        )

    print(f"\nLayout guardado en: {out_path}")
    doc.close()


if __name__ == "__main__":
    main()
