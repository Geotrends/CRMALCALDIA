#!/usr/bin/env python3
import os, subprocess, tempfile, time, uno

template = "/var/www/html/custom/Espo/Custom/files/templates/FormatoSolicitud.doc"
profile = "/tmp/lo-inspect2"
os.makedirs(profile, exist_ok=True)
port = 20199
proc = subprocess.Popen(
    ["soffice", "--headless", "--invisible", f"-env:UserInstallation=file://{profile}", f"--accept=socket,host=127.0.0.1,port={port};urp;"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(2)
localContext = uno.getComponentContext()
resolver = localContext.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", localContext)
ctx = resolver.resolve(f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(template), "_blank", 0, ())

tables = []
enum = doc.getText().createEnumeration()
while enum.hasMoreElements():
    el = enum.nextElement()
    if "TextTable" in el.getImplementationName():
        tables.append(el)

for ti, t in enumerate(tables):
    rows = t.getRows().getCount()
    cols = t.getColumns().getCount()
    print(f"Table {ti}: {rows}x{cols}")
    for r in range(rows):
        row_parts = []
        for c in range(cols):
            try:
                s = t.getCellByPosition(c, r).getString()
            except Exception as e:
                s = f"<ERR {e}>"
            row_parts.append(repr(s[:80]))
        print(f"  row {r}: " + " | ".join(row_parts))

doc.close(True)
proc.terminate()
proc.wait()
