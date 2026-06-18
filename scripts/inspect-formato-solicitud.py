#!/usr/bin/env python3
import os, shutil, subprocess, tempfile, time, uno

template = "/var/www/html/custom/Espo/Custom/files/templates/FormatoSolicitud.doc"
profile = "/tmp/lo-inspect-" + str(os.getpid())
os.makedirs(profile, exist_ok=True)
port = 20000 + (os.getpid() % 10000)
proc = subprocess.Popen(
    [
        "soffice", "--headless", "--invisible",
        f"-env:UserInstallation=file://{profile}",
        f"--accept=socket,host=127.0.0.1,port={port};urp;",
    ],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(2)
localContext = uno.getComponentContext()
resolver = localContext.ServiceManager.createInstanceWithContext(
    "com.sun.star.bridge.UnoUrlResolver", localContext
)
ctx = resolver.resolve(f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
url = uno.systemPathToFileUrl(template)
doc = desktop.loadComponentFromURL(url, "_blank", 0, ())

tables = []
enum = doc.getText().createEnumeration()
while enum.hasMoreElements():
    el = enum.nextElement()
    if "TextTable" in el.getImplementationName():
        tables.append(el)

print(f"Tables: {len(tables)}")
for ti, t in enumerate(tables):
    rows = t.getRows().getCount()
    cols = t.getColumns().getCount()
    print(f"\nTable {ti}: {rows}x{cols}")
    for r in range(rows):
        for c in range(cols):
            s = t.getCellByPosition(c, r).getString().strip()
            if s:
                print(f"  [{r},{c}]: {repr(s[:120])}")

text = doc.getText().getString()
for line in text.split("\n"):
    line = line.strip()
    if line:
        print("BODY:", repr(line[:140]))

doc.close(True)
proc.terminate()
proc.wait()
