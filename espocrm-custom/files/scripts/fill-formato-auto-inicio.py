#!/usr/bin/env python3
"""Genera el Auto de Inicio prellenado.

Uso: fill-formato-auto-inicio.py <salida> <pdf|docx> [plantilla.docx]   (payload JSON por stdin)

- Con plantilla (formato oficial «Auto de Inicio y Acción de Policía» de la Inspección,
  Ley 1801): se reemplazan los textos guía del Word por los datos del caso,
  conservando encabezado, logo, estilos y texto legal.
- Sin plantilla (p. ej. régimen sancionatorio ambiental): borrador provisional en HTML.

Los datos que falten dejan su espacio subrayado para diligenciarlo a mano.
"""

import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

T_RE = re.compile(r"(<w:t(?:\s[^>]*)?>)(.*?)(</w:t>)", re.S)
P_RE = re.compile(r"<w:p[ >].*?</w:p>", re.S)
BLANK = "______________________"


def xml_escape(value):
    return html.escape(str(value or ""), quote=False)


def paragraph_text(p):
    return "".join(html.unescape(m.group(2)) for m in T_RE.finditer(p))


def set_paragraph_text(p, text):
    """Primer run con el texto nuevo; el resto de runs queda vacío (se conserva el formato del primero)."""
    first = [True]

    def repl(m):
        if first[0]:
            first[0] = False
            open_tag = m.group(1)
            if "xml:space" not in open_tag:
                open_tag = open_tag.replace("<w:t", '<w:t xml:space="preserve"', 1)
            return open_tag + xml_escape(text) + m.group(3)
        return m.group(1) + m.group(3)

    return T_RE.sub(repl, p)


def replace_run(p, old, new):
    """Reemplaza el primer run cuyo texto es exactamente `old`."""
    done = [False]

    def repl(m):
        actual = html.unescape(m.group(2))
        if not done[0] and (actual == old or (old.strip() and actual.strip() == old.strip())):
            done[0] = True
            if actual != old:
                new_value = actual[: len(actual) - len(actual.lstrip())] + new.lstrip()
            else:
                new_value = new
            open_tag = m.group(1)
            if "xml:space" not in open_tag:
                open_tag = open_tag.replace("<w:t", '<w:t xml:space="preserve"', 1)
            return open_tag + xml_escape(new_value) + m.group(3)
        return m.group(0)

    return T_RE.sub(repl, p)


def replace_last_run(p, old, new):
    """Como replace_run, pero sobre el último run cuyo texto es `old`."""
    matches = [m for m in T_RE.finditer(p) if html.unescape(m.group(2)) == old]
    if not matches:
        return p
    m = matches[-1]
    open_tag = m.group(1)
    if "xml:space" not in open_tag:
        open_tag = open_tag.replace("<w:t", '<w:t xml:space="preserve"', 1)
    return p[: m.start()] + open_tag + xml_escape(new) + m.group(3) + p[m.end():]


def plain(p):
    """Quita subrayado y negrita heredados de la línea guía del formato."""
    return re.sub(r"<w:u [^>]*/>|<w:b/>|<w:bCs/>", "", p)


def fill_empty_cell_after(xml, label, text):
    """Escribe `text` en la celda que sigue a la celda con `label` (celda sin runs)."""
    i = xml.find(label)
    if i < 0:
        return xml
    end_label_cell = xml.find("</w:tc>", i)
    next_cell_start = xml.find("<w:tc>", end_label_cell)
    next_cell_end = xml.find("</w:tc>", next_cell_start)
    cell = xml[next_cell_start:next_cell_end]
    if re.search(r"<w:t[ >]", cell):
        cell = set_paragraph_text(cell, text)
    else:
        run = ('<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:iCs/></w:rPr>'
               '<w:t xml:space="preserve">' + xml_escape(text) + "</w:t></w:r>")
        idx = cell.rfind("</w:p>")
        cell = cell[:idx] + run + cell[idx:] if idx >= 0 else cell
    return xml[:next_cell_start] + cell + xml[next_cell_end:]


def fill_docx_template(template, output_docx, p):
    with zipfile.ZipFile(template) as zin:
        xml = zin.read("word/document.xml").decode("utf-8")
        others = {n: zin.read(n) for n in zin.namelist() if n != "word/document.xml"}

    citado = p.get("citado") or BLANK
    fecha_aud = p.get("fechaAudiencia") or "________________"
    hora_aud = p.get("horaAudiencia") or "________________"

    xml = fill_empty_cell_after(xml, "DIRECCION:", p.get("direccion") or "")

    def edit(par):
        text = paragraph_text(par).strip()
        if text and set(text) == {"_"} and len(text) <= 25 and not edit.fecha:
            edit.fecha = True
            return set_paragraph_text(par, p.get("fecha") or text)
        if text == "(Fecha de realización del Auto)":
            return set_paragraph_text(par, "")
        if text == "Nombre quejoso":
            return set_paragraph_text(par, p.get("quejoso") or BLANK)
        if text.startswith("Nombre e identificación del citado"):
            return set_paragraph_text(par, citado)
        if text == "" and "<w:t" in par and not edit.radicado and edit.fecha and "Nombre quejoso" not in par:
            # Celda «RADICADO Y CONSECUTIVO» (texto de solo espacios).
            if paragraph_text(par) and not paragraph_text(par).strip():
                edit.radicado = True
                return set_paragraph_text(par, p.get("radicadoConsecutivo") or "")
        if text == "Normatividad y tema a aplicar en proceso":
            return set_paragraph_text(par, p.get("tema") or BLANK)
        if text.startswith("Se realiza auto de inicio"):
            par = replace_run(par, "en contra de (nombre del citado e identificación) ", "en contra de ")
            par = replace_run(par, "____________________", citado)
            par = replace_run(
                par,
                "la convivencia por afectación___________________________________________",
                "la convivencia por afectación " + (p.get("afectacion") or BLANK),
            )
            return par
        if text == "(Norma u artículo por la que se abre el proceso de acción policiva y auto de inicio)":
            return set_paragraph_text(par, "")
        if text and set(text) == {"_"} and len(text) > 25:
            edit.largos += 1
            if edit.largos == 1:
                return plain(set_paragraph_text(par, p.get("norma"))) if p.get("norma") else par
            if edit.largos == 2:
                return plain(set_paragraph_text(par, p.get("motivo"))) if p.get("motivo") else par
        if text.startswith("ARTICULO SEGUNDO"):
            par = replace_run(par, "(fecha de audiencia) ", "")
            par = replace_run(par, "________________", fecha_aud)
            par = replace_run(par, " las  (", " las ")
            par = replace_run(par, "hora de audiencia", "")
            par = replace_run(par, ")", "")
            par = replace_run(par, " _", " ")
            # La hora va en el último espacio: si la fecha quedó en blanco, su espacio sigue igual.
            par = replace_last_run(par, "________________", hora_aud)
            return par
        if text == "NOMBRE":
            return set_paragraph_text(par, p.get("inspector") or "NOMBRE")
        return par

    edit.fecha = False
    edit.radicado = False
    edit.largos = 0
    xml = P_RE.sub(lambda m: edit(m.group(0)), xml)

    with zipfile.ZipFile(output_docx, "w", zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("word/document.xml", xml)
        for name, data in others.items():
            zout.writestr(name, data)


def build_html(p):
    filas = "".join(
        "<tr><th>{}</th><td>{}</td></tr>".format(xml_escape(k), xml_escape(v) or "&nbsp;")
        for k, v in p.get("datos", [])
    )
    return """<!doctype html><html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; }}
h1 {{ font-size: 13pt; text-align: center; margin: 0; }}
.sub {{ text-align: center; margin: 2px 0 14px; }}
.borrador {{ border: 1px solid #b45309; color: #b45309; padding: 6px; font-size: 9pt; margin-bottom: 12px; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; font-size: 10pt; }}
th {{ width: 32%; background: #f2f2f2; }}
</style></head><body>
<p class="borrador">BORRADOR PROVISIONAL · POR VALIDAR · El modelo no registra formato de acto de apertura para esta ruta (el IV-F-364 corresponde a la Ley 1801). Revise, ajuste, firme y cargue el PDF firmado.</p>
<h1>INSPECCIÓN DE POLICÍA PARA ASUNTOS AMBIENTALES · ENVIGADO</h1>
<p class="sub"><b>AUTO DE INICIO · {regimen}</b><br>{fecha}</p>
<table>{filas}</table>
<h3>Norma aplicable</h3><p>{norma}</p>
<h3>Consideraciones</h3><p>{motivo}</p>
<p style="margin-top:48px">______________________________________<br><b>{inspector}</b><br>INSPECTOR DE POLICÍA PARA ASUNTOS AMBIENTALES</p>
</body></html>""".format(
        fecha=xml_escape(p.get("fecha")), filas=filas, regimen=xml_escape(p.get("regimenTexto")), norma=xml_escape(p.get("norma") or BLANK),
        motivo=xml_escape(p.get("motivo") or BLANK), inspector=xml_escape(p.get("inspector") or "NOMBRE"),
    )


def soffice_convert(source, target_format, work_dir, profile):
    subprocess.run(
        ["soffice", "--headless", "--invisible", "--nologo",
         "-env:UserInstallation=file://" + profile,
         "--convert-to", target_format, "--outdir", work_dir, source],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def main():
    if len(sys.argv) not in (3, 4):
        print("uso: fill-formato-auto-inicio.py <salida> <pdf|docx> [plantilla.docx]", file=sys.stderr)
        return 2

    output_path, fmt = sys.argv[1], sys.argv[2]
    template = sys.argv[3] if len(sys.argv) == 4 else ""
    payload = json.loads(sys.stdin.read() or "{}")
    work_dir = os.path.dirname(output_path) or tempfile.gettempdir()
    profile = os.environ.get("LO_PROFILE") or os.path.join(work_dir, "lo-profile")

    if template and os.path.isfile(template):
        docx_path = os.path.join(work_dir, "AutoInicio.docx")
        fill_docx_template(template, docx_path, payload)
        if fmt == "docx":
            shutil.move(docx_path, output_path)
            return 0
        soffice_convert(docx_path, "pdf:writer_pdf_Export", work_dir, profile)
        shutil.move(os.path.join(work_dir, "AutoInicio.pdf"), output_path)
        return 0

    source = os.path.join(work_dir, "AutoInicio.html")
    with open(source, "w", encoding="utf-8") as handle:
        handle.write(build_html(payload))
    soffice_convert(source, "pdf:writer_pdf_Export" if fmt == "pdf" else "docx:MS Word 2007 XML", work_dir, profile)
    shutil.move(os.path.join(work_dir, "AutoInicio." + ("pdf" if fmt == "pdf" else "docx")), output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
