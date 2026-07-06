#!/usr/bin/env python3
"""
Detecta líneas horizontales del PDF plantilla del auto de archivo
para calibrar formato-actuo-archivo-layout.json en el servidor.

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
    return os.path.join(
        script_dir(),
        "..",
        "templates",
        "ActuoArchivo-template.pdf",
    )


def collect_horizontal_lines(page, min_width=200.0, y_tolerance=1.5):
    lines = []

    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if not rect:
            continue

        x0 = min(rect.x0, rect.x1)
        y0 = min(rect.y0, rect.y1)
        x1 = max(rect.x0, rect.x1)
        y1 = max(rect.y0, rect.y1)
        width = x1 - x0
        height = y1 - y0

        if width < min_width:
            continue
        if height > 2.5:
            continue

        y = round((y0 + y1) / 2.0, 1)
        lines.append({"y": y, "x0": round(x0, 1), "x1": round(x1, 1), "width": round(width, 1)})

    lines.sort(key=lambda item: (item["y"], item["x0"]))

    merged = []
    for line in lines:
        if not merged:
            merged.append(line)
            continue

        prev = merged[-1]
        if abs(prev["y"] - line["y"]) <= y_tolerance and abs(prev["x0"] - line["x0"]) < 8:
            continue

        merged.append(line)

    return merged


def main():
    template = sys.argv[1] if len(sys.argv) > 1 else default_template_path()
    template = os.path.abspath(template)

    if not os.path.isfile(template):
        print(f"No se encontró plantilla: {template}", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(template)
    page = doc[0]
    rect = page.rect
    lines = collect_horizontal_lines(page)

    print(f"Plantilla: {template}")
    print(f"pageSize: [{rect.width}, {rect.height}]")
    print(f"Líneas horizontales largas ({len(lines)}):")

    for index, line in enumerate(lines, start=1):
        print(
            f"  {index:02d}. y={line['y']:6.1f}  "
            f"x={line['x0']:6.1f}-{line['x1']:6.1f}  "
            f"w={line['width']:6.1f}"
        )

    if len(lines) >= 2:
        spacings = []
        for i in range(1, len(lines)):
            spacings.append(round(lines[i]["y"] - lines[i - 1]["y"], 2))

        print("\nEspaciado vertical entre líneas consecutivas:")
        print("  " + ", ".join(str(value) for value in spacings[:20]))

    suggestion = {
        "pageSize": [round(rect.width, 1), round(rect.height, 1)],
        "sampleLines": lines[:25],
    }

    out_path = os.path.join(script_dir(), "actuo-archivo-detected-lines.json")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(suggestion, handle, indent=2)

    print(f"\nDetalle guardado en: {out_path}")
    doc.close()


if __name__ == "__main__":
    main()
