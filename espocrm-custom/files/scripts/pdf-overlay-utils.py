"""Utilidades compartidas para superposición PDF (solicitud y acta de visita)."""

import pymupdf as fitz


def text_color(layout):
    return tuple(layout.get("textColor", [0, 0, 0]))


def font_name(layout):
    return layout.get("fontName", "helv")


def font_limits(layout):
    return (
        float(layout.get("fontSize", 10)),
        float(layout.get("minFontSize", 6)),
    )


def field_rect(field_def):
    if "rect" in field_def:
        return fitz.Rect(*field_def["rect"])

    x = float(field_def["x"])
    y = float(field_def["y"])
    width = float(field_def.get("width", 120))
    height = float(field_def.get("height", 14))

    return fitz.Rect(x, y - height + 2, x + width, y + 2)


def text_fits_in_rect(text, rect, fontname, fontsize):
    scratch = fitz.open()
    try:
        page = scratch.new_page(width=rect.width + 20, height=rect.height + 20)
        remaining = page.insert_textbox(
            fitz.Rect(0, 0, rect.width, rect.height),
            text,
            fontsize=fontsize,
            fontname=fontname,
            align=fitz.TEXT_ALIGN_LEFT,
        )
        return remaining >= 0
    finally:
        scratch.close()


def fit_font_size(text, rect, layout):
    max_size, min_size = font_limits(layout)
    fontname = font_name(layout)
    step = float(layout.get("fontSizeStep", 0.5))

    size = max_size
    while size >= min_size:
        if text_fits_in_rect(text, rect, fontname, size):
            return size
        size -= step

    return min_size


def put_fitted_textbox(page, rect, text, layout):
    value = str(text or "").strip()
    if not value:
        return

    box = fitz.Rect(*rect) if not isinstance(rect, fitz.Rect) else rect
    fontsize = fit_font_size(value, box, layout)

    page.insert_textbox(
        box,
        value,
        fontsize=fontsize,
        fontname=font_name(layout),
        color=text_color(layout),
        align=fitz.TEXT_ALIGN_LEFT,
    )


def put_fitted_field(page, field_def, text, layout):
    put_fitted_textbox(page, field_rect(field_def), text, layout)


def put_mark(page, point, layout, label="X"):
    mark_size = float(layout.get("markFontSize", layout.get("fontSize", 10)))
    page.insert_text(
        (float(point["x"]), float(point["y"])),
        label,
        fontsize=mark_size,
        fontname=font_name(layout),
        color=text_color(layout),
    )
