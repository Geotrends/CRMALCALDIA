#!/usr/bin/env python3
"""
Genera formato-actuo-archivo-layout.json a partir del PDF plantilla real.
Detecta renglones por guiones bajos del texto (sin alargar líneas de la plantilla).

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


def field_rect(line, pad_x=0.0, baseline_offset=4.0):
    return [
        round(line["x0"] + pad_x, 1),
        round(line["y"] + baseline_offset - 3.0, 1),
        round(line["x1"] - pad_x, 1),
        round(line["y"] + baseline_offset, 1),
    ]


def build_uniform_body_lines(referencia, motivo):
    uniform_right = round(referencia[-1]["x1"], 1)
    full_left = round(referencia[-1]["x0"], 1)
    lines = []

    ref_first = referencia[0]
    first = {
        "from": [round(ref_first["x0"], 1), ref_first["y"]],
        "to": [uniform_right, ref_first["y"]],
    }
    if ref_first["x1"] > uniform_right + 0.5:
        first["trimFrom"] = round(ref_first["x1"], 1)
    lines.append(first)

    for row in referencia[1:] + motivo:
        item = {
            "from": [full_left, row["y"]],
            "to": [uniform_right, row["y"]],
        }
        if row["x1"] > uniform_right + 0.5:
            item["trimFrom"] = round(row["x1"], 1)
        lines.append(item)

    return lines


def build_layout(page):
    rect = page.rect
    all_lines = underscore_lines(page)
    envigado_line = next((line for line in all_lines if line["y"] < 180.0), None)
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
    ref_first_width = round(min(ref_first["x1"], referencia[-1]["x1"]) - ref_first["x0"], 1)
    ref_spacing = round(referencia[1]["y"] - referencia[0]["y"], 1) if len(referencia) > 1 else 14.0
    motivo_spacing = round(motivo[1]["y"] - motivo[0]["y"], 1) if len(motivo) > 1 else 14.0

    colombia_rect = [148, 163, 256, 175]
    if envigado_line:
        # Centrar «Colombia,» sobre el espacio de guiones tras «Envigado,»
        short_underscore = next(
            (
                line
                for line in all_lines
                if abs(line["y"] - envigado_line["y"]) <= 1.5
                and line["x0"] > envigado_line["x0"] + 40
            ),
            None,
        )
        if short_underscore:
            colombia_rect = [
                round(short_underscore["x0"], 1),
                round(envigado_line["y"] - 1.8, 1),
                round(short_underscore["x1"], 1),
                round(envigado_line["y"] + 10.2, 1),
            ]

    return {
        "pageSize": [round(rect.width, 1), round(rect.height, 1)],
        "fontSize": 10,
        "minFontSize": 7,
        "textColor": [0, 0, 0],
        "borderStyle": {
            "width": 0.25,
            "color": [0.65, 0.65, 0.65],
            "coverPad": 1.0,
        },
        "restyleHeaderBorders": True,
        "headerBorderRegion": [78, 34, 534, 122],
        "bodyLineStyle": {
            "width": 0.25,
            "color": [0.55, 0.55, 0.55],
        },
        "restyleBodyLines": True,
        "uniformBodyLines": build_uniform_body_lines(referencia, motivo),
        "fieldPadding": {"left": 1, "right": 1, "top": 0, "bottom": 0},
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
        "labels": {
            "colombia": {
                "label": "Colombia,",
                "labelRect": colombia_rect,
                "labelAlign": "center",
                "labelFontName": "helv",
                "labelFontSize": 12,
                "labelValign": "bottom",
            },
            "consecutivoInternoCaption": {
                "coverRect": [
                    round(consecutivo["x0"] - 16, 1),
                    244,
                    round(consecutivo["x1"] + 38, 1),
                    255,
                ],
                "label": "(Consecutivo  interno)",
                "labelRect": [
                    round(consecutivo["x0"] - 12, 1),
                    246,
                    round(consecutivo["x1"] - 12, 1),
                    253,
                ],
                "labelAlign": "center",
                "labelFontName": "helv",
                "labelFontSize": 12,
                "labelValign": "center",
            },
        },
        "fields": {
            "numeroRadicado": {
                "rect": field_rect(radicado),
                "align": "center",
                "valign": "bottom",
                "fontSize": 10,
            },
            "consecutivoInterno": {
                "rect": field_rect(consecutivo),
                "align": "center",
                "valign": "bottom",
                "fontSize": 10,
            },
            "fechaDada": {
                "rect": [
                    round(fecha["x0"], 1),
                    round(fecha["y"] + 3.0, 1),
                    round(fecha["x1"], 1),
                    round(fecha["y"] + 8.0, 1),
                ],
                "align": "center",
                "valign": "bottom",
                "fontSize": 10,
            },
            "inspectorNombre": {
                "rect": [
                    round(inspector["x0"], 1),
                    round(inspector["y"] + 3.0, 1),
                    round(inspector["x1"], 1),
                    round(inspector["y"] + 8.0, 1),
                ],
                "align": "center",
                "valign": "bottom",
                "fontSize": 10,
            },
        },
        "textBoxes": {
            "referencia": {
                "rect": [
                    round(radicado["x0"], 1),
                    round(referencia[0]["y"] - 2.0, 1),
                    round(referencia[-1]["x1"], 1),
                    round(referencia[-1]["y"] + 2.0, 1),
                ],
                "align": "left",
                "singleLine": False,
                "ruledText": True,
                "lineSpacing": ref_spacing,
                "firstBaselineY": ref_first["y"],
                "baselineAdjust": 9.2,
                "firstLineXOffset": ref_offset,
                "firstLineWidth": ref_first_width,
                "maxLines": len(referencia),
                "fontSize": 9,
                "minFontSize": 7,
                "padding": {"left": 0, "right": 0, "top": 0, "bottom": 0},
            },
            "motivoArchivo": {
                "rect": [
                    round(motivo[0]["x0"], 1),
                    round(motivo[0]["y"] - 2.0, 1),
                    round(referencia[-1]["x1"], 1),
                    round(motivo[-1]["y"] + 2.0, 1),
                ],
                "align": "left",
                "singleLine": False,
                "ruledText": True,
                "lineSpacing": motivo_spacing,
                "firstBaselineY": motivo[0]["y"],
                "baselineAdjust": 10.0,
                "maxLines": len(motivo),
                "fontSize": 10,
                "padding": {"left": 0, "right": 0, "top": 0, "bottom": 0},
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
