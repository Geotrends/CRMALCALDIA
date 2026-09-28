#!/usr/bin/env python3
"""Genera en Word los formatos del proceso del expediente.

Uso: fill-formato-proceso.py <salida.docx> <tipo> [plantilla.docx]   (payload JSON por stdin)

Tipos:
- notificacion-personal: plantilla «Notificación personal» de la Inspección.
- notificacion-aviso: plantilla «Notificación por aviso».
- citacion: plantilla «Citación Inspección de Policía Ambiental» (audiencia).
- resolucion: plantilla IV-F-117 «Modelo de resolución» (decisión de fondo).
- archivo: plantilla «Auto de Archivo» de la Inspección (ActuoArchivo.docx).
- decision: proyecto de decisión (no hay formato institucional: borrador POR VALIDAR).

Reutiliza las utilidades de fill-formato-auto-inicio.py. Los datos que falten
dejan su espacio subrayado para diligenciarlo a mano.
"""

import importlib.util
import json
import os
import shutil
import sys
import tempfile
import zipfile

_spec = importlib.util.spec_from_file_location(
    "fill_auto", os.path.join(os.path.dirname(os.path.abspath(__file__)), "fill-formato-auto-inicio.py"))
fa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fa)

BLANK = fa.BLANK


def fill_notificacion(template, output, p, tipo):
    with zipfile.ZipFile(template) as zin:
        xml = zin.read("word/document.xml").decode("utf-8")
        others = {n: zin.read(n) for n in zin.namelist() if n != "word/document.xml"}

    hora = p.get("hora") or "______________"
    nombre = p.get("nombre") or BLANK
    documento = p.get("documento") or BLANK

    def edit(par):
        text = fa.paragraph_text(par).strip()
        if text and set(text) == {"_"} and not edit.fecha:
            edit.fecha = True
            return fa.set_paragraph_text(par, p.get("fecha") or text)
        if text.startswith("En la fecha indicada"):
            if tipo == "notificacion-personal":
                calidad = ("en nombre propio" if p.get("personaNatural", True)
                           else "como representante legal de " + (p.get("razonSocial") or BLANK) + ", con NIT " + (p.get("nit") or BLANK))
                frase = ("En la fecha indicada, siendo las {hora}, se notifica personalmente al señor (a) {nombre}, "
                         "identificado (a) con cédula de ciudadanía número {doc}, {calidad}, {acto} correspondiente al "
                         "Expediente número {exp}, a quien se le entrega copia íntegra, auténtica y gratuita del mismo, {recursos}.")
            else:
                calidad = ""
                frase = ("En la fecha indicada, siendo las {hora}, se notifica por aviso a la comunidad {nombre} "
                         "a quien se notifica {acto} correspondiente al Expediente número {exp}, {recursos}.")
            return fa.plain(fa.set_paragraph_text(par, frase.format(
                hora=hora, nombre=nombre, doc=documento, calidad=calidad,
                acto=p.get("acto") or BLANK, exp=p.get("expediente") or BLANK,
                recursos=p.get("recursos") or "contra el cual no procede recurso alguno")))
        if text.startswith("Nombre:") and tipo == "notificacion-personal":
            return fa.set_paragraph_text(par, "Nombre: " + (p.get("nombre") or ""))
        if text.startswith("CC No:") and tipo == "notificacion-personal":
            return fa.set_paragraph_text(par, "CC No:   " + (p.get("documento") or ""))
        if text.startswith("Funcionario") and p.get("funcionario"):
            return fa.set_paragraph_text(par, "Funcionario notificador: " + p["funcionario"])
        if text.startswith("Cargo:") and p.get("cargo"):
            return fa.set_paragraph_text(par, "Cargo: " + p["cargo"])
        return par

    edit.fecha = False
    xml = fa.P_RE.sub(lambda m: edit(m.group(0)), xml)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("word/document.xml", xml)
        for name, data in others.items():
            zout.writestr(name, data)


def fill_row_cells(xml, header_first, values):
    """Escribe `values` en las celdas vacías de la fila siguiente a la fila cuyo primer texto es `header_first`."""
    i = xml.find(header_first)
    if i < 0:
        return xml
    end_header_row = xml.find("</w:tr>", i) + len("</w:tr>")
    row_end = xml.find("</w:tr>", end_header_row)
    row = xml[end_header_row:row_end]
    cells = list(fa.re.finditer(r"<w:tc>.*?</w:tc>", row, fa.re.S))
    out, last = [], 0
    for cell, value in zip(cells, values):
        c = cell.group(0)
        if value and not fa.re.search(r"<w:t[ >]", c):
            run = ('<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr>'
                   '<w:t xml:space="preserve">' + fa.xml_escape(value) + "</w:t></w:r>")
            k = c.rfind("</w:p>")
            c = c[:k] + run + c[k:]
        out.append(row[last:cell.start()] + c)
        last = cell.end()
    out.append(row[last:])
    return xml[:end_header_row] + "".join(out) + xml[row_end:]


def fill_citacion(template, output, p):
    with zipfile.ZipFile(template) as zin:
        xml = zin.read("word/document.xml").decode("utf-8")
        others = {n: zin.read(n) for n in zin.namelist() if n != "word/document.xml"}

    # FECHA DE ENTREGA queda para diligenciar al entregar.
    xml = fill_row_cells(xml, "FECHA DE ENTREGA", ["", p.get("radicado") or "", p.get("expediente") or ""])

    def edit(par):
        text = fa.paragraph_text(par).strip()
        if text.startswith("Nombre del citado"):
            return fa.set_paragraph_text(par, "Nombre del citado: " + (p.get("citado") or BLANK))
        if text.startswith("Sírvase acercarse") and p.get("lugar"):
            return fa.set_paragraph_text(par, "Sírvase acercarse a " + p["lugar"] + ", donde se realizará la audiencia, en la siguiente")
        if text.startswith("Fecha:") and "Hora:" in text:
            par = fa.replace_run(par, "Fecha:           ", "Fecha: " + (p.get("fecha") or "________________") + "   ")
            par = fa.replace_run(par, "           ", "")
            par = fa.replace_run(par, " Hora:", " Hora: " + (p.get("hora") or "__________"))
            par = fa.replace_run(par, "                 Tema:", "   Tema: " + (p.get("tema") or ""))
            return par
        if text.startswith("Asunto objeto de la citación"):
            return fa.replace_run(par, "AUDIENCIA   ", "AUDIENCIA (X)   ")
        if text.startswith("Dirección") and "entrega de la citación" in text:
            return fa.set_paragraph_text(par, "Dirección / WhatsApp / correo electrónico de entrega de la citación: " + (p.get("entrega") or ""))
        if text.startswith("Correo electrónico del citado"):
            return fa.set_paragraph_text(par, "Correo electrónico del citado: " + (p.get("correo") or ""))
        return par

    xml = fa.P_RE.sub(lambda m: edit(m.group(0)), xml)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("word/document.xml", xml)
        for name, data in others.items():
            zout.writestr(name, data)


def set_paragraph_lines(par, lines):
    """Repite el párrafo (con su formato) una vez por línea."""
    lines = [l for l in lines if l] or [BLANK]
    return "".join(fa.plain(fa.set_paragraph_text(par, l)) for l in lines)


def fill_resolucion(template, output, p):
    with zipfile.ZipFile(template) as zin:
        xml = zin.read("word/document.xml").decode("utf-8")
        others = {n: zin.read(n) for n in zin.namelist() if n != "word/document.xml"}

    # Celdas del encabezado (tabla): etiqueta → valor en la celda siguiente.
    for label, value in (("PROCESO", p.get("proceso")), ("QUEJOSO.", p.get("quejoso")), ("TEMAS", p.get("temas"))):
        xml = fa.fill_empty_cell_after(xml, label, value or "")

    # Secciones: el primer párrafo con texto después de cada título recibe el contenido.
    secciones = {
        "HECHOS": ("lineas", p.get("hechos")),
        "DEL PROCEDIMIENTO AGOTADO.": ("lineas", p.get("procedimiento")),
        "NORMATIVIDAD APLICABLE AL ASUNTO. “LIMITES LEGALES DE LA DECISIÓN”": ("lineas", p.get("normatividad")),
        "ASUNTO A RESOLVER.": ("lineas", p.get("asunto")),
        "TESIS QUE SE PLANTEA POR LA INSPECCIÓN.": ("lineas", p.get("tesis")),
        "DE LAS PRUEBAS Y SU VALOR:": ("lineas", p.get("pruebas")),
        "COMPETENCIA.": ("lineas", p.get("competencia")),
        "CONCLUSIONES": ("lineas", p.get("conclusiones")),
        "RESUELVE": ("lineas", p.get("resuelve")),
    }

    def edit(par):
        text = fa.paragraph_text(par).strip()
        if text in secciones:
            edit.pendiente = secciones[text]
            return par
        if edit.pendiente and text:
            _, valor = edit.pendiente
            edit.pendiente = None
            if valor:
                return set_paragraph_lines(par, valor if isinstance(valor, list) else [valor])
            return par
        if text == "RESOLUCIÓN Nº":
            return fa.set_paragraph_text(par, "RESOLUCIÓN Nº " + (p.get("numero") or "__________"))
        if text.startswith("_") and "CC. NIT" in text:
            return fa.set_paragraph_text(par, (p.get("contraventor") or "_______________________") + " CC. NIT " + (p.get("documento") or "______________"))
        if text.startswith("NO.") and "CONSECUTIVO" in text:
            return fa.set_paragraph_text(par, "NO. " + (p.get("radicado") or "__________") + " CONSECUTIVO # " + (p.get("consecutivo") or "______"))
        if text.startswith("Expedida en Envigado"):
            return fa.set_paragraph_text(par, "Expedida en Envigado a los " + (p.get("expedida") or "______________"))
        return par

    edit.pendiente = None
    xml = fa.P_RE.sub(lambda m: edit(m.group(0)), xml)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("word/document.xml", xml)
        for name, data in others.items():
            zout.writestr(name, data)


def fill_archivo(template, output, p):
    with zipfile.ZipFile(template) as zin:
        xml = zin.read("word/document.xml").decode("utf-8")
        others = {n: zin.read(n) for n in zin.namelist() if n != "word/document.xml"}

    def edit(par):
        text = fa.paragraph_text(par).strip()
        if text.startswith("Envigado,"):
            return fa.set_paragraph_text(par, "Envigado, " + (p.get("fecha") or "__________________"))
        if text.startswith("_") and "  " in text and not edit.numeros:
            edit.numeros = True
            return fa.set_paragraph_text(par, (p.get("radicado") or "________________") + " " * 30 + (p.get("consecutivo") or "________________"))
        if text.startswith("Referencia"):
            edit.zona = "referencia"
            return fa.plain(fa.set_paragraph_text(par, "Referencia: " + (p.get("referencia") or BLANK)))
        if text.startswith("Motivo"):
            edit.zona = "motivo"
            return fa.set_paragraph_text(par, "Motivo por el cual se archiva el expediente:")
        if text.startswith("Dada"):
            edit.zona = None
            return fa.set_paragraph_text(par, "Dada en Envigado a los " + (p.get("dada") or "_____________________________"))
        if text and set(text) == {"_"} and edit.zona:
            # Líneas guía: la primera recibe el contenido, las demás se eliminan.
            if edit.zona == "motivo" and not edit.motivo:
                edit.motivo = True
                return set_paragraph_lines(par, p.get("motivo") or [BLANK])
            if edit.zona == "motivo" and p.get("motivo"):
                return ""
            if edit.zona == "referencia":
                return ""
        return par

    edit.numeros = False
    edit.zona = None
    edit.motivo = False
    xml = fa.P_RE.sub(lambda m: edit(m.group(0)), xml)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("word/document.xml", xml)
        for name, data in others.items():
            zout.writestr(name, data)


def build_decision_html(p):
    esc = fa.xml_escape
    filas = "".join("<tr><th>{}</th><td>{}</td></tr>".format(esc(k), esc(v) or "&nbsp;") for k, v in p.get("datos", []))

    def lista(items):
        return "".join("<li>{}</li>".format(esc(i)) for i in items) or "<li>—</li>"

    return """<!doctype html><html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; }}
h1 {{ font-size: 13pt; text-align: center; margin: 0; }}
h3 {{ font-size: 11pt; margin: 14px 0 4px; }}
.sub {{ text-align: center; margin: 2px 0 14px; }}
.borrador {{ border: 1px solid #b45309; color: #b45309; padding: 6px; font-size: 9pt; margin-bottom: 12px; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; font-size: 10pt; }}
th {{ width: 32%; background: #f2f2f2; }}
</style></head><body>
<p class="borrador">PROYECTO DE DECISIÓN · POR VALIDAR · No hay formato institucional de fallo registrado. Revise, ajuste, firme y cargue el PDF firmado.</p>
<h1>INSPECCIÓN DE POLICÍA PARA ASUNTOS AMBIENTALES · ENVIGADO</h1>
<p class="sub"><b>DECISIÓN · PROCESO VERBAL ABREVIADO (Ley 1801 de 2016, art. 223)</b><br>{fecha}</p>
<table>{filas}</table>
<h3>Hechos probados</h3><p>{hechos}</p>
<h3>Comportamiento(s) contrario(s) a la convivencia</h3><ul>{conductas}</ul>
<h3>Consideraciones</h3><p>{motivacion}</p>
<h3>RESUELVE</h3>
<p><b>PRIMERO.</b> {resuelve}</p>
<ul>{medidas}</ul>
{orden}
{derivaciones}
<p><b>{n_recursos}.</b> {recursos}</p>
<p><b>{n_notif}.</b> La presente decisión queda notificada en estrados.</p>
<p style="margin-top:48px">______________________________________<br><b>{inspector}</b><br>INSPECTOR DE POLICÍA PARA ASUNTOS AMBIENTALES</p>
</body></html>""".format(
        fecha=esc(p.get("fecha")), filas=filas, hechos=esc(p.get("hechos") or BLANK),
        conductas=lista(p.get("conductas", [])), motivacion=esc(p.get("motivacion") or BLANK),
        resuelve=esc(p.get("resuelve")), medidas=lista(p.get("medidas", [])) if p.get("medidas") else "",
        orden=("<p><b>SEGUNDO.</b> Orden de Policía: {}</p>".format(esc(p["orden"])) if p.get("orden") else ""),
        derivaciones=("<p><b>{}.</b> Remitir a {}</p>".format(
            "TERCERO" if p.get("orden") else "SEGUNDO", esc("; ".join(p["derivaciones"]))) if p.get("derivaciones") else ""),
        n_recursos=p.get("numRecursos") or "SEGUNDO", recursos=esc(p.get("recursos")),
        n_notif=p.get("numNotificacion") or "TERCERO", inspector=esc(p.get("inspector") or "NOMBRE"),
    )


def main():
    if len(sys.argv) not in (3, 4):
        print("uso: fill-formato-proceso.py <salida.docx> <tipo> [plantilla.docx]", file=sys.stderr)
        return 2

    output, tipo = sys.argv[1], sys.argv[2]
    template = sys.argv[3] if len(sys.argv) == 4 else ""
    payload = json.loads(sys.stdin.read() or "{}")
    work_dir = os.path.dirname(output) or tempfile.gettempdir()
    profile = os.environ.get("LO_PROFILE") or os.path.join(work_dir, "lo-profile")

    if tipo in ("notificacion-personal", "notificacion-aviso"):
        if not template or not os.path.isfile(template):
            print("falta la plantilla", file=sys.stderr)
            return 2
        fill_notificacion(template, output, payload, tipo)
        return 0

    if tipo == "citacion":
        if not template or not os.path.isfile(template):
            print("falta la plantilla", file=sys.stderr)
            return 2
        fill_citacion(template, output, payload)
        return 0

    if tipo == "archivo":
        if not template or not os.path.isfile(template):
            print("falta la plantilla", file=sys.stderr)
            return 2
        fill_archivo(template, output, payload)
        return 0

    if tipo == "resolucion":
        if not template or not os.path.isfile(template):
            print("falta la plantilla", file=sys.stderr)
            return 2
        fill_resolucion(template, output, payload)
        return 0

    if tipo == "decision":
        source = os.path.join(work_dir, "Decision.html")
        with open(source, "w", encoding="utf-8") as handle:
            handle.write(build_decision_html(payload))
        fa.soffice_convert(source, "docx:MS Word 2007 XML", work_dir, profile)
        shutil.move(os.path.join(work_dir, "Decision.docx"), output)
        return 0

    print("tipo no válido", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
