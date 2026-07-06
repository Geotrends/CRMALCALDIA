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


def apply_rect_padding(box, field_def=None, layout=None):
    field_def = field_def or {}
    layout = layout or {}
    padding = field_def.get("padding", layout.get("fieldPadding"))
    if not padding:
        return box

    if isinstance(padding, (int, float)):
        padding = {
            "left": padding,
            "right": padding,
            "top": padding,
            "bottom": padding,
        }

    return fitz.Rect(
        box.x0 + float(padding.get("left", 0)),
        box.y0 + float(padding.get("top", 0)),
        box.x1 - float(padding.get("right", 0)),
        box.y1 - float(padding.get("bottom", 0)),
    )


def truncate_to_fit(text, max_width, fontname, fontsize, ellipsis="..."):
    if max_width <= 0:
        return ""

    if fitz.get_text_length(text, fontsize=fontsize, fontname=fontname) <= max_width:
        return text

    if fitz.get_text_length(ellipsis, fontsize=fontsize, fontname=fontname) > max_width:
        return ellipsis

    low = 0
    high = len(text)
    best = ellipsis

    while low <= high:
        mid = (low + high) // 2
        candidate = text[:mid].rstrip() + ellipsis
        if fitz.get_text_length(candidate, fontsize=fontsize, fontname=fontname) <= max_width:
            best = candidate
            low = mid + 1
        else:
            high = mid - 1

    return best


def truncate_multiline_to_box(text, box, fontname, fontsize, align, ellipsis="..."):
    scratch = fitz.open()
    try:
        page = scratch.new_page(width=box.width + 20, height=box.height + 20)
        test_box = fitz.Rect(0, 0, box.width, box.height)
        if page.insert_textbox(
            test_box,
            text,
            fontsize=fontsize,
            fontname=fontname,
            align=align,
        ) >= 0:
            return text
    finally:
        scratch.close()

    if not text.strip():
        return text

    low = 0
    high = len(text)
    best = ellipsis

    while low <= high:
        mid = (low + high) // 2
        candidate = text[:mid].rstrip()
        if candidate and candidate != text[:mid].strip():
            candidate = candidate.rstrip()
        if candidate and not candidate.endswith(ellipsis):
            candidate = candidate + ellipsis

        scratch = fitz.open()
        try:
            page = scratch.new_page(width=box.width + 20, height=box.height + 20)
            remaining = page.insert_textbox(
                fitz.Rect(0, 0, box.width, box.height),
                candidate or ellipsis,
                fontsize=fontsize,
                fontname=fontname,
                align=align,
            )
            fits = remaining >= 0
        finally:
            scratch.close()

        if fits:
            best = candidate or ellipsis
            low = mid + 1
        else:
            high = mid - 1

    return best


def should_truncate(layout, field_def):
    field_def = field_def or {}
    layout = layout or {}
    if field_def.get("truncateOverflow") is False:
        return False
    if field_def.get("truncateOverflow"):
        return True
    return bool(layout.get("truncateOverflow"))


def resolve_font_size(value, box, layout, field_def):
    if should_truncate(layout, field_def):
        return float(field_def.get("fontSize", layout.get("fontSize", 10)))
    return fit_font_size(value, box, layout, field_def)


def prepare_field_text(value, box, layout, field_def, align, fontname, fontsize):
    if not should_truncate(layout, field_def):
        return value

    ellipsis = str(field_def.get("ellipsis", layout.get("ellipsis", "...")))
    single_line = field_def.get("singleLine", layout.get("fieldSingleLine", True))

    if single_line:
        return truncate_to_fit(value, box.width, fontname, fontsize, ellipsis)

    return truncate_multiline_to_box(value, box, fontname, fontsize, align, ellipsis)


def field_render_def(field_def, layout):
    merged = dict(field_def or {})
    layout = layout or {}

    if "align" not in merged and layout.get("defaultFieldAlign"):
        merged["align"] = layout["defaultFieldAlign"]
    if "valign" not in merged and layout.get("defaultFieldValign"):
        merged["valign"] = layout["defaultFieldValign"]

    return merged


def field_valign(field_def, layout):
    field_def = field_def or {}
    layout = layout or {}
    return field_def.get("valign", layout.get("defaultFieldValign", "center"))


def single_line_baseline(box, fontsize, valign="center"):
    if valign == "top":
        return box.y0 + fontsize * 0.82

    if valign == "bottom":
        return box.y1 - max(1.2, fontsize * 0.15)

    return box.y0 + (box.height + fontsize * 0.72) / 2.0


def multiline_content_height(text, box, fontname, fontsize, align):
    scratch = fitz.open()
    try:
        probe_height = max(box.height * 4, 300)
        page = scratch.new_page(width=box.width + 20, height=probe_height + 20)
        remaining = page.insert_textbox(
            fitz.Rect(0, 0, box.width, probe_height),
            text,
            fontsize=fontsize,
            fontname=fontname,
            align=align,
        )
        if remaining < 0:
            return min(probe_height, box.height)
        return max(fontsize * 1.15, probe_height - remaining)
    finally:
        scratch.close()


def apply_vertical_valign(box, content_height, valign):
    if valign != "center" or content_height >= box.height:
        return box

    offset = max(0.0, (box.height - content_height) / 2.0)
    return fitz.Rect(box.x0, box.y0 + offset, box.x1, box.y1)


def wrap_text_lines(text, max_width, fontname, fontsize):
    words = str(text or "").split()
    if not words:
        return []

    lines = []
    current = []

    for word in words:
        candidate = " ".join(current + [word])
        if not current or fitz.get_text_length(candidate, fontsize=fontsize, fontname=fontname) <= max_width:
            current.append(word)
            continue

        lines.append(" ".join(current))
        current = [word]

    if current:
        lines.append(" ".join(current))

    return lines


def put_ruled_multiline_text(page, box, text, layout, field_def, fontname, fontsize, color):
    line_spacing = float(field_def.get("lineSpacing", 14))
    max_lines = int(field_def.get("maxLines", 5))
    first_baseline_y = field_def.get("firstBaselineY")
    first_line_x = box.x0 + float(field_def.get("firstLineXOffset", 0))
    first_line_width = float(field_def.get("firstLineWidth", box.width - (first_line_x - box.x0)))
    if first_line_width <= 0:
        first_line_width = box.width

    if first_baseline_y is not None:
        y = float(first_baseline_y) + float(field_def.get("baselineAdjust", 0))
    else:
        y = box.y0 + float(field_def.get("firstLineOffset", fontsize * 0.85))

    lines = wrap_text_lines(text, first_line_width, fontname, fontsize)
    if len(lines) > 1:
        lines = [lines[0]] + wrap_text_lines(" ".join(lines[1:]), box.width, fontname, fontsize)

    for index, line in enumerate(lines[:max_lines]):
        if y > box.y1 + 1:
            break

        x = first_line_x if index == 0 else box.x0
        page.insert_text((x, y), line, fontsize=fontsize, fontname=fontname, color=color)
        y += line_spacing


def put_fitted_textbox(page, rect, text, layout, field_def=None):
    value = str(text or "").strip()
    if not value:
        return

    field_def = field_render_def(field_def, layout)
    box = fitz.Rect(*rect) if not isinstance(rect, fitz.Rect) else rect
    box = apply_rect_padding(box, field_def, layout)
    align = text_align(field_def, layout)
    fontname = font_name(layout, field_def)
    fontsize = resolve_font_size(value, box, layout, field_def)
    value = prepare_field_text(value, box, layout, field_def, align, fontname, fontsize)
    color = text_color(layout)

    if field_def.get("singleLine", layout.get("fieldSingleLine", True)):
        text_width = fitz.get_text_length(value, fontsize=fontsize, fontname=fontname)
        if align == fitz.TEXT_ALIGN_CENTER:
            x = box.x0 + max(0.0, (box.width - text_width) / 2.0)
        elif align == fitz.TEXT_ALIGN_RIGHT:
            x = box.x1 - text_width
        else:
            x = box.x0
        baseline = single_line_baseline(box, fontsize, field_valign(field_def, layout))
        page.insert_text((x, baseline), value, fontsize=fontsize, fontname=fontname, color=color)
        return

    if field_def.get("ruledText"):
        put_ruled_multiline_text(page, box, value, layout, field_def, fontname, fontsize, color)
        return

    valign = field_valign(field_def, layout)
    content_height = multiline_content_height(value, box, fontname, fontsize, align)
    render_box = apply_vertical_valign(box, content_height, valign)

    page.insert_textbox(
        render_box,
        value,
        fontsize=fontsize,
        fontname=fontname,
        color=color,
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


def cover_rects_batch(page, cover_defs):
    redact_boxes = []
    fill_boxes = []

    for cover_def in cover_defs or []:
        if isinstance(cover_def, dict):
            rect = cover_def.get("rect", cover_def)
            mode = cover_def.get("coverMode", "fill")
        else:
            rect = cover_def
            mode = "fill"

        box = fitz.Rect(*rect)
        if mode == "redact":
            redact_boxes.append(box)
        else:
            fill_boxes.append(box)

    for box in redact_boxes:
        page.add_redact_annot(box, fill=(1, 1, 1))
    if redact_boxes:
        page.apply_redactions()

    for box in fill_boxes:
        page.draw_rect(box, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)


def put_static_label(page, field_def, layout):
    covers = list(field_def.get("coverRects") or [])
    cover = field_def.get("coverRect")
    if cover:
        covers.append(cover)

    for rect in covers:
        cover_rect(page, rect, field_def)

    label = field_def.get("label")
    label_rect = field_def.get("labelRect")
    if not label or not label_rect:
        return

    label_def = {
        "rect": label_rect,
        "align": field_def.get("labelAlign", "left"),
        "valign": field_def.get("labelValign", "bottom"),
        "fontName": field_def.get("labelFontName", "hebo"),
    }
    label_layout = dict(layout)
    label_layout["fontSize"] = float(field_def.get("labelFontSize", layout.get("fontSize", 9)))
    label_layout["minFontSize"] = label_layout["fontSize"]
    put_fitted_textbox(page, label_rect, label, label_layout, label_def)


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
            "valign": field_def.get("labelValign", "bottom"),
            "fontName": field_def.get("labelFontName", "hebo"),
        }
        label_layout = dict(layout)
        label_layout["fontSize"] = float(field_def.get("labelFontSize", layout.get("fontSize", 9)))
        label_layout["minFontSize"] = label_layout["fontSize"]
        put_fitted_textbox(page, label_rect, label, label_layout, label_def)

    if "rect" in field_def or "x" in field_def:
        put_fitted_textbox(page, field_rect(field_def), text, layout, field_render_def(field_def, layout))


def border_style(layout, line_def=None):
    layout = layout or {}
    line_def = line_def or {}
    style = layout.get("borderStyle", {})
    width = float(line_def.get("width", style.get("width", 0.35)))
    color = tuple(line_def.get("color", style.get("color", [0.55, 0.55, 0.55])))
    cover_pad = float(line_def.get("coverPad", style.get("coverPad", 1.5)))
    return width, color, cover_pad


def put_line(page, line_def, layout=None):
    layout = layout or {}
    x0, y0 = line_def["from"]
    x1, y1 = line_def["to"]
    width, color, _cover_pad = border_style(layout, line_def)
    page.draw_line(
        fitz.Point(float(x0), float(y0)),
        fitz.Point(float(x1), float(y1)),
        color=color,
        width=width,
        overlay=True,
    )


def restyle_template_borders(page, layout=None):
    layout = layout or {}
    region = layout.get("headerBorderRegion")
    enabled = layout.get("restyleHeaderBorders", layout.get("restyleBorders"))

    if not enabled:
        return

    width, color, cover_pad = border_style(layout)
    segments = []

    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if not rect:
            continue

        x0 = min(rect.x0, rect.x1)
        y0 = min(rect.y0, rect.y1)
        x1 = max(rect.x0, rect.x1)
        y1 = max(rect.y0, rect.y1)
        seg_w = x1 - x0
        seg_h = y1 - y0

        if seg_w >= 1.5 and seg_h >= 1.5:
            continue

        if region:
            rx0, ry0, rx1, ry1 = region
            if x1 < rx0 or x0 > rx1 or y1 < ry0 or y0 > ry1:
                continue

        segments.append((x0, y0, x1, y1))

    for x0, y0, x1, y1 in segments:
        cover = fitz.Rect(
            x0 - cover_pad,
            y0 - cover_pad,
            x1 + cover_pad,
            y1 + cover_pad,
        )
        page.draw_rect(cover, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
        page.draw_line(
            fitz.Point(x0, y0),
            fitz.Point(x1, y1),
            color=color,
            width=width,
            overlay=True,
        )


def fit_mark_font_size(label, box, layout, field_def=None):
    max_size = float(
        (field_def or {}).get("fontSize", layout.get("markFontSize", layout.get("fontSize", 9)))
    )
    min_size = float((field_def or {}).get("minFontSize", 5))
    step = float(layout.get("fontSizeStep", 0.5))
    fontname = font_name(layout, field_def)
    size = max_size

    while size >= min_size:
        if text_fits_in_rect(label, box, fontname, size, fitz.TEXT_ALIGN_CENTER):
            return size
        size -= step

    return min_size


def put_mark(page, point, layout, label="X"):
    if point.get("rect"):
        box = fitz.Rect(*point["rect"])
        fontname = font_name(layout, point)
        fontsize = float(point.get("fontSize", layout.get("markFontSize", 10)))
        text_width = fitz.get_text_length(label, fontsize=fontsize, fontname=fontname)
        x = box.x0 + max(0.0, (box.width - text_width) / 2.0)
        baseline = box.y0 + (box.height + fontsize * 0.72) / 2.0
        page.insert_text(
            (x, baseline),
            label,
            fontsize=fontsize,
            fontname=fontname,
            color=text_color(layout),
        )
        return

    mark_size = float(point.get("fontSize", layout.get("markFontSize", layout.get("fontSize", 9))))
    page.insert_text(
        (float(point["x"]), float(point["y"])),
        label,
        fontsize=mark_size,
        fontname=font_name(layout, point),
        color=text_color(layout),
    )
