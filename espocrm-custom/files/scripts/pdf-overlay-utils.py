"""Utilidades compartidas para superposición PDF (solicitud y acta de visita)."""

import pymupdf as fitz


def text_color(layout):
    return tuple(layout.get("textColor", [0, 0, 0]))


def font_name(layout, field_def=None):
    field_def = field_def or {}
    return field_def.get("fontName", layout.get("fontName", "helv"))


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


def text_align(field_def=None, layout=None):
    field_def = field_def or {}
    layout = layout or {}
    align = field_def.get("align", layout.get("align", "left"))

    if align == "right":
        return fitz.TEXT_ALIGN_RIGHT
    if align == "center":
        return fitz.TEXT_ALIGN_CENTER

    return fitz.TEXT_ALIGN_LEFT


def text_fits_in_rect(text, rect, fontname, fontsize, align=fitz.TEXT_ALIGN_LEFT):
    scratch = fitz.open()
    try:
        page = scratch.new_page(width=rect.width + 20, height=rect.height + 20)
        remaining = page.insert_textbox(
            fitz.Rect(0, 0, rect.width, rect.height),
            text,
            fontsize=fontsize,
            fontname=fontname,
            align=align,
        )
        return remaining >= 0
    finally:
        scratch.close()


def fit_font_size(text, rect, layout, field_def=None):
    max_size, min_size = font_limits(layout)
    fontname = font_name(layout, field_def)
    step = float(layout.get("fontSizeStep", 0.5))
    align = text_align(field_def, layout)

    size = max_size
    while size >= min_size:
        if text_fits_in_rect(text, rect, fontname, size, align):
            return size
        size -= step

    return min_size


def put_fitted_textbox(page, rect, text, layout, field_def=None):
    value = str(text or "").strip()
    if not value:
        return

    box = fitz.Rect(*rect) if not isinstance(rect, fitz.Rect) else rect
    fontsize = fit_font_size(value, box, layout, field_def)
    align = text_align(field_def, layout)

    page.insert_textbox(
        box,
        value,
        fontsize=fontsize,
        fontname=font_name(layout, field_def),
        color=text_color(layout),
        align=align,
    )


def cover_rect(page, rect, field_def=None):
    field_def = field_def or {}
    box = fitz.Rect(*rect)
    mode = field_def.get("coverMode", "fill")

    if mode == "redact":
        page.add_redact_annot(box, fill=(1, 1, 1))
        page.apply_redactions()
        return

    page.draw_rect(box, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)


def put_fitted_field(page, field_def, text, layout):
    cover = field_def.get("coverRect")
    if cover:
        cover_rect(page, cover, field_def)

    label = field_def.get("label")
    label_rect = field_def.get("labelRect")
    if label and label_rect:
        label_def = {
            "rect": label_rect,
            "align": field_def.get("labelAlign", "left"),
            "fontName": field_def.get("labelFontName", "hebo"),
        }
        label_layout = dict(layout)
        label_layout["fontSize"] = float(field_def.get("labelFontSize", layout.get("fontSize", 9)))
        label_layout["minFontSize"] = label_layout["fontSize"]
        put_fitted_textbox(page, label_rect, label, label_layout, label_def)

    put_fitted_textbox(page, field_rect(field_def), text, layout, field_def)


def put_mark(page, point, layout, label="X"):
    mark_size = float(layout.get("markFontSize", layout.get("fontSize", 10)))
    page.insert_text(
        (float(point["x"]), float(point["y"])),
        label,
        fontsize=mark_size,
        fontname=font_name(layout),
        color=text_color(layout),
    )
