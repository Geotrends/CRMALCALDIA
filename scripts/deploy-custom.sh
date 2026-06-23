#!/bin/bash
# Despliega backend (metadata, hooks) y frontend (JS) al contenedor EspoCRM.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f /var/www/html/command.php ] && ! command -v docker >/dev/null 2>&1; then
  exec bash "$ROOT/scripts/deploy-custom-dokploy.sh"
fi

echo 'Copiando backend custom...'
docker cp "$ROOT/espocrm-custom/." espocrm:/var/www/html/custom/Espo/Custom/

echo 'Eliminando hooks y clases obsoletas (no presentes en el repo)...'
docker exec espocrm rm -f \
  /var/www/html/custom/Espo/Custom/Hooks/CaseObj/SyncCasePartyFullNamesOnSave.php \
  /var/www/html/custom/Espo/Custom/Hooks/CaseObj/SyncLegacyCaseFieldsOnSave.php \
  /var/www/html/custom/Espo/Custom/Tools/CaseObj/LegacyCaseFieldMirror.php

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

echo 'Roles y equipos base (despliegue desde cero)...'
docker cp "$ROOT/scripts/seed-roles.php" espocrm:/tmp/seed-roles.php
docker exec espocrm php /tmp/seed-roles.php

echo 'Sincronizar equipos desde roles (sesión cliente usa teamsNames)...'
docker cp "$ROOT/scripts/sync-user-teams-from-roles.php" espocrm:/tmp/sync-user-teams-from-roles.php
docker exec espocrm php /tmp/sync-user-teams-from-roles.php

echo 'Catálogos Excel Alcaldía (desplegables)...'
docker cp "$ROOT/scripts/configure-excel-alcaldia-case-fields.php" espocrm:/tmp/configure-excel-alcaldia-case-fields.php
docker exec espocrm php /tmp/configure-excel-alcaldia-case-fields.php

echo 'Placeholder en desplegables Case...'
docker cp "$ROOT/scripts/configure-case-enum-placeholders.php" espocrm:/tmp/configure-case-enum-placeholders.php
docker exec espocrm php /tmp/configure-case-enum-placeholders.php

echo 'Menú lateral (tabList global)...'
docker cp "$ROOT/scripts/configure-global-tablist.php" espocrm:/tmp/configure-global-tablist.php
docker exec espocrm php /tmp/configure-global-tablist.php

echo 'Calendario: reuniones, tareas y casos...'
docker cp "$ROOT/scripts/configure-calendar-meetings-only.php" espocrm:/tmp/configure-calendar-meetings-only.php
docker exec espocrm php /tmp/configure-calendar-meetings-only.php

echo 'Kanban de Casos (todos los usuarios)...'
docker cp "$ROOT/scripts/configure-case-kanban.php" espocrm:/tmp/configure-case-kanban.php
docker exec espocrm php /tmp/configure-case-kanban.php

echo 'Home: tablero custom + dashlets editables...'
docker cp "$ROOT/scripts/configure-user-dashboards.php" espocrm:/tmp/configure-user-dashboards.php
docker exec espocrm php /tmp/configure-user-dashboards.php

echo 'Acceso completo — menú y permisos para todos los roles...'
docker cp "$ROOT/scripts/configure-full-access-all-roles.php" espocrm:/tmp/configure-full-access-all-roles.php
docker exec espocrm php /tmp/configure-full-access-all-roles.php

echo 'Permisos de asignación (crear caso sin patrullero)...'
docker cp "$ROOT/scripts/configure-case-assignment-permissions.php" espocrm:/tmp/configure-case-assignment-permissions.php
docker exec espocrm php /tmp/configure-case-assignment-permissions.php

echo 'Permisos ActaVisita por rol (Inspección edita acta)...'
docker cp "$ROOT/scripts/configure-acta-visita-entity.php" espocrm:/tmp/configure-acta-visita-entity.php
docker exec espocrm php /tmp/configure-acta-visita-entity.php

echo 'Permisos ActuoArchivo por rol...'
docker cp "$ROOT/scripts/configure-actuo-archivo-entity.php" espocrm:/tmp/configure-actuo-archivo-entity.php
docker exec espocrm php /tmp/configure-actuo-archivo-entity.php

echo 'Documentos: plantillas oficiales (solicitud, acta, actuo)...'
docker cp "$ROOT/scripts/configure-document-plantillas.php" espocrm:/tmp/configure-document-plantillas.php
docker exec espocrm php /tmp/configure-document-plantillas.php

echo 'Eliminando columnas obsoletas / migraciones legacy (si aplica)...'
docker cp "$ROOT/scripts/needs-legacy-db-migrations.php" espocrm:/tmp/needs-legacy-db-migrations.php
if docker exec espocrm php /tmp/needs-legacy-db-migrations.php; then
  docker cp "$ROOT/scripts/migrate-drop-case-categoria-tipo.php" espocrm:/tmp/migrate-drop-case-categoria-tipo.php
  docker exec espocrm php /tmp/migrate-drop-case-categoria-tipo.php
  docker cp "$ROOT/scripts/migrate-case-documento-fields.php" espocrm:/tmp/migrate-case-documento-fields.php
  docker exec espocrm php /tmp/migrate-case-documento-fields.php
  docker cp "$ROOT/scripts/migrate-case-canonical-fields.php" espocrm:/tmp/migrate-case-canonical-fields.php
  docker exec espocrm php /tmp/migrate-case-canonical-fields.php
  docker cp "$ROOT/scripts/migrate-case-peticionario-db-columns.php" espocrm:/tmp/migrate-case-peticionario-db-columns.php
  docker exec espocrm php /tmp/migrate-case-peticionario-db-columns.php
  docker cp "$ROOT/scripts/migrate-case-party-field-names.php" espocrm:/tmp/migrate-case-party-field-names.php
  docker exec espocrm php /tmp/migrate-case-party-field-names.php
else
  echo 'BD nueva — migraciones legacy omitidas.'
fi

echo 'Permisos campos peticionario y perjudicante...'
docker cp "$ROOT/scripts/configure-case-party-field-access.php" espocrm:/tmp/configure-case-party-field-access.php
docker exec espocrm php /tmp/configure-case-party-field-access.php

echo 'Permisos de campo (radicado, registro Excel, fecha vencimiento)...'
docker cp "$ROOT/scripts/configure-radicacion-field-level.php" espocrm:/tmp/configure-radicacion-field-level.php
docker exec espocrm php /tmp/configure-radicacion-field-level.php

echo 'Historial de asignaciones (permisos por rol)...'
docker cp "$ROOT/scripts/configure-asignacion-historial.php" espocrm:/tmp/configure-asignacion-historial.php
docker exec espocrm php /tmp/configure-asignacion-historial.php

echo 'Comunicaciones por caso (permisos por rol)...'
docker cp "$ROOT/scripts/configure-comunicacion-caso-entity.php" espocrm:/tmp/configure-comunicacion-caso-entity.php
docker exec espocrm php /tmp/configure-comunicacion-caso-entity.php

echo 'Defaults Recibida por / Remitido a (por rol)...'
docker cp "$ROOT/scripts/configure-case-create-defaults.php" espocrm:/tmp/configure-case-create-defaults.php
docker exec espocrm php /tmp/configure-case-create-defaults.php

echo 'Auditoría usuarios y roles...'
docker cp "$ROOT/scripts/audit-users-roles.php" espocrm:/tmp/audit-users-roles.php
docker exec espocrm php /tmp/audit-users-roles.php

echo 'Listo. Recarga el navegador con Cmd+Shift+R en http://localhost:8080'
