#!/usr/bin/env python3
import os, subprocess, time, uno

WORK = "/tmp/lo-inspect-sol"
os.makedirs(WORK + "/lo-profile", exist_ok=True)
template = "/var/www/html/custom/Espo/Custom/files/templates/FormatoSolicitud.doc"
port = 20301
proc = subprocess.Popen(
    ["soffice", "--headless", "--invisible", f"-env:UserInstallation=file://{WORK}/lo-profile", f"--accept=socket,host=127.0.0.1,port={port};urp;"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(2)
ctx = uno.getComponentContext().ServiceManager.createInstanceWithContext(
    "com.sun.star.bridge.UnoUrlResolver", uno.getComponentContext()
).resolve(f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
doc = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx).loadComponentFromURL(
    uno.systemPathToFileUrl(template), "_blank", 0, ()
)

text = doc.getText()
enum = text.createEnumeration()
idx = 0
while enum.hasMoreElements():
    el = enum.nextElement()
    impl = el.getImplementationName()
    if "Paragraph" in impl:
        s = el.getString()
        if "_" in s or any(k in s for k in ["DESCRIPCION", "RESPUESTA", "RECIBIDA", "REMITIDO", "ATENCI"]):
            print(f"P{idx} {impl}: {repr(s[:180])}")
    elif "TextTable" in impl:
        print(f"T{idx} table rows={el.getRows().getCount()} cols={el.getColumns().getCount()}")
    idx += 1

tables = []
enum2 = text.createEnumeration()
while enum2.hasMoreElements():
    el = enum2.nextElement()
    if "TextTable" in el.getImplementationName():
        tables.append(el)

for ti, t in enumerate(tables):
    print(f"\n=== Table {ti} ===")
    for r in range(t.getRows().getCount()):
        for c in range(t.getColumns().getCount()):
            try:
                cell = t.getCellByPosition(c, r)
                s = cell.getString()
                if s.strip():
                    print(f"  [{r},{c}]: {repr(s[:120])}")
            except Exception as e:
                print(f"  [{r},{c}]: ERR {e}")

doc.close(True)
proc.terminate()
proc.wait()
