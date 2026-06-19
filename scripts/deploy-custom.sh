#!/bin/bash
# Despliega backend (metadata, hooks) y frontend (JS) al contenedor EspoCRM.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo 'Copiando backend custom...'
docker cp "$ROOT/espocrm-custom/." espocrm:/var/www/html/custom/Espo/Custom/

if [ -d "$ROOT/formatos" ]; then
  echo 'Copiando plantillas desde formatos/...'
  docker exec espocrm mkdir -p /var/www/html/custom/Espo/Custom/files/templates
  for f in "$ROOT/formatos"/*.doc "$ROOT/formatos"/*.docx; do
    [ -f "$f" ] || continue
    base="$(basename "$f")"
    if [ "$base" = "FormatoSolicitud.doc" ] || [ "$base" = "FormatoSolicitud.docx" ]; then
      docker cp "$f" "espocrm:/var/www/html/custom/Espo/Custom/files/templates/FormatoSolicitud.doc"
    fi
    if [ "$base" = "ActaVisita2.docx" ]; then
      docker cp "$f" "espocrm:/var/www/html/custom/Espo/Custom/files/templates/ActaVisita2.docx"
    fi
    if [ "$base" = "ActaVisita.xlsx" ]; then
      docker cp "$f" "espocrm:/var/www/html/custom/Espo/Custom/files/templates/ActaVisita.xlsx"
    fi
    if [ "$base" = "ActuoArchivo.docx" ]; then
      docker cp "$f" "espocrm:/var/www/html/custom/Espo/Custom/files/templates/ActuoArchivo.docx"
    fi
  done
fi

echo 'Copiando frontend client/custom...'
docker cp "$ROOT/espocrm-custom/files/client/custom/." espocrm:/var/www/html/client/custom/

echo 'Verificando LibreOffice (generación de formatos)...'
docker exec espocrm bash -c 'dpkg -s libreoffice-writer-nogui >/dev/null 2>&1 || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libreoffice-writer-nogui python3-uno); dpkg -s libreoffice-calc-nogui >/dev/null 2>&1 || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libreoffice-calc-nogui)'

echo 'Verificando PyMuPDF (superposición PDF solicitud)...'
docker exec espocrm bash -c 'python3 -c "import pymupdf" 2>/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-pymupdf)'

echo 'Generando PDF plantilla FormatoSolicitud (si falta)...'
docker exec espocrm bash -c '
  tpl="/var/www/html/custom/Espo/Custom/files/templates"
  pdf="$tpl/FormatoSolicitud-template.pdf"
  doc="$tpl/FormatoSolicitud.doc"
  if [ ! -f "$pdf" ] && [ -f "$doc" ]; then
    profile="/tmp/lo-tpl-sol-$$"
    mkdir -p "$profile"
    soffice --headless --invisible --nologo -env:UserInstallation=file://$profile --convert-to pdf --outdir "$tpl" "$doc" 2>/dev/null || true
    if [ -f "$tpl/FormatoSolicitud.pdf" ]; then
      mv "$tpl/FormatoSolicitud.pdf" "$pdf"
    fi
  fi
'

echo 'Generando PDF plantilla ActaVisita2 (si falta)...'
docker exec espocrm bash -c '
  tpl="/var/www/html/custom/Espo/Custom/files/templates"
  pdf="$tpl/ActaVisita2-template.pdf"
  doc="$tpl/ActaVisita2.docx"
  if [ ! -f "$pdf" ] && [ -f "$doc" ]; then
    profile="/tmp/lo-tpl-acta-$$"
    mkdir -p "$profile"
    soffice --headless --invisible --nologo -env:UserInstallation=file://$profile --convert-to pdf --outdir "$tpl" "$doc" 2>/dev/null || true
    if [ -f "$tpl/ActaVisita2.pdf" ]; then
      mv "$tpl/ActaVisita2.pdf" "$pdf"
    fi
  fi
'

echo 'Verificando openpyxl (export Excel casos)...'
docker exec espocrm bash -c 'python3 -c "import openpyxl" 2>/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-openpyxl)'

echo 'Verificando Excel oficial (excelAlcaldia.xlsx)...'
docker exec espocrm bash -c 'test -f /var/www/html/data/exports/excelAlcaldia.xlsx || echo "AVISO: coloque excelAlcaldia.xlsx en exports/ del proyecto"'

docker exec espocrm mkdir -p /var/www/html/data
docker exec -u root espocrm chown -R www-data:www-data /var/www/html/data /var/www/html/custom/Espo/Custom/ /var/www/html/client/custom/

echo 'Rebuild + clear cache...'
docker exec espocrm php command.php rebuild
docker exec espocrm php command.php clear-cache

echo 'Actualizando appTimestamp (fuerza recarga del navegador)...'
docker exec espocrm php -r '
$path = "/var/www/html/data/state.php";
$state = include $path;
$state["appTimestamp"] = time();
$state["cacheTimestamp"] = time();
$state["microtimeState"] = microtime(true);
file_put_contents($path, "<?php\nreturn " . var_export($state, true) . ";\n");
echo "appTimestamp=" . $state["appTimestamp"] . "\n";
'

echo 'Generando defaults Recibida por / Remitido a...'
docker cp "$ROOT/scripts/configure-case-create-defaults.php" espocrm:/tmp/configure-case-create-defaults.php
docker exec espocrm php /tmp/configure-case-create-defaults.php

echo 'Permisos de asignación (crear caso sin patrullero)...'
docker cp "$ROOT/scripts/configure-case-assignment-permissions.php" espocrm:/tmp/configure-case-assignment-permissions.php
docker exec espocrm php /tmp/configure-case-assignment-permissions.php

echo 'Permisos de campo (radicado, fecha vencimiento)...'
docker cp "$ROOT/scripts/configure-radicacion-field-level.php" espocrm:/tmp/configure-radicacion-field-level.php
docker exec espocrm php /tmp/configure-radicacion-field-level.php

echo 'Catálogos Excel Alcaldía (desplegables)...'
docker cp "$ROOT/scripts/configure-excel-alcaldia-case-fields.php" espocrm:/tmp/configure-excel-alcaldia-case-fields.php
docker exec espocrm php /tmp/configure-excel-alcaldia-case-fields.php

echo 'Placeholder en desplegables Case...'
docker cp "$ROOT/scripts/configure-case-enum-placeholders.php" espocrm:/tmp/configure-case-enum-placeholders.php
docker exec espocrm php /tmp/configure-case-enum-placeholders.php

echo 'Menú lateral (tabList global)...'
docker cp "$ROOT/scripts/configure-global-tablist.php" espocrm:/tmp/configure-global-tablist.php
docker exec espocrm php /tmp/configure-global-tablist.php

echo 'Calendario: solo reuniones...'
docker cp "$ROOT/scripts/configure-calendar-meetings-only.php" espocrm:/tmp/configure-calendar-meetings-only.php
docker exec espocrm php /tmp/configure-calendar-meetings-only.php

echo 'Kanban de Casos (todos los usuarios)...'
docker cp "$ROOT/scripts/configure-case-kanban.php" espocrm:/tmp/configure-case-kanban.php
docker exec espocrm php /tmp/configure-case-kanban.php

echo 'Permisos ActaVisita por rol (Inspección edita acta)...'
docker cp "$ROOT/scripts/configure-acta-visita-entity.php" espocrm:/tmp/configure-acta-visita-entity.php
docker exec espocrm php /tmp/configure-acta-visita-entity.php

echo 'Home: tablero custom + dashlets editables...'
docker cp "$ROOT/scripts/configure-user-dashboards.php" espocrm:/tmp/configure-user-dashboards.php
docker exec espocrm php /tmp/configure-user-dashboards.php

echo 'Acceso completo — menú y permisos para todos los roles...'
docker cp "$ROOT/scripts/configure-full-access-all-roles.php" espocrm:/tmp/configure-full-access-all-roles.php
docker exec espocrm php /tmp/configure-full-access-all-roles.php

echo 'Documentos: plantillas oficiales (solicitud, acta, actuo)...'
docker cp "$ROOT/scripts/configure-document-plantillas.php" espocrm:/tmp/configure-document-plantillas.php
docker exec espocrm php /tmp/configure-document-plantillas.php

echo 'Eliminando columnas obsoletas c_categoria / c_tipo...'
docker cp "$ROOT/scripts/migrate-drop-case-categoria-tipo.php" espocrm:/tmp/migrate-drop-case-categoria-tipo.php
docker exec espocrm php /tmp/migrate-drop-case-categoria-tipo.php

echo 'Listo. Recarga el navegador con Cmd+Shift+R en http://localhost:8080'
