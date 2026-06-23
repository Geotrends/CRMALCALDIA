#!/bin/bash
# Runs inside the espocrm container. The repository must be mounted in Dokploy.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/opt/bootstrap/repo}"
APP_ROOT="${APP_ROOT:-/var/www/html}"
PHP_BIN="${PHP_BIN:-php}"
RUN_APT_CHECKS="${RUN_APT_CHECKS:-1}"

CUSTOM_SOURCE="$REPO_ROOT/espocrm-custom"
CLIENT_SOURCE="$REPO_ROOT/espocrm-custom/files/client/custom"
SCRIPTS_SOURCE="$REPO_ROOT/scripts"
FORMATOS_SOURCE="$REPO_ROOT/formatos"
EXPORTS_SOURCE="$REPO_ROOT/exports"
EXCEL_SOURCE="$REPO_ROOT/excelAlcaldia.xlsx"

CUSTOM_TARGET="$APP_ROOT/custom/Espo/Custom"
CLIENT_TARGET="$APP_ROOT/client/custom"
TEMPLATES_TARGET="$CUSTOM_TARGET/files/templates"

require_path() {
  local path="$1"
  local label="$2"

  if [ ! -e "$path" ]; then
    echo "ERROR: Missing $label at $path"
    exit 1
  fi
}

run_php_script() {
  local script_name="$1"
  local script_path="$SCRIPTS_SOURCE/$script_name"

  require_path "$script_path" "script $script_name"
  echo "Running $script_name..."
  "$PHP_BIN" "$script_path"
}

ensure_package() {
  local check_cmd="$1"
  local install_cmd="$2"

  if bash -lc "$check_cmd" >/dev/null 2>&1; then
    return 0
  fi

  if [ "$RUN_APT_CHECKS" != "1" ]; then
    echo "Skipping package install: $install_cmd"
    return 0
  fi

  bash -lc "apt-get update -qq && DEBIAN_FRONTEND=noninteractive $install_cmd"
}

generate_pdf_if_missing() {
  local input_file="$1"
  local output_pdf="$2"
  local temp_name="$3"

  if [ -f "$output_pdf" ] || [ ! -f "$input_file" ]; then
    return 0
  fi

  local temp_profile="/tmp/$temp_name-$$"
  mkdir -p "$temp_profile"

  soffice --headless --invisible --nologo \
    "-env:UserInstallation=file://$temp_profile" \
    --convert-to pdf \
    --outdir "$(dirname "$output_pdf")" \
    "$input_file" >/dev/null 2>&1 || true
}

require_path "$CUSTOM_SOURCE" "espocrm-custom"
require_path "$SCRIPTS_SOURCE" "scripts"

echo "Copying backend custom..."
mkdir -p "$CUSTOM_TARGET" "$CLIENT_TARGET" "$APP_ROOT/data"
cp -R "$CUSTOM_SOURCE/." "$CUSTOM_TARGET/"

echo "Removing obsolete classes..."
rm -f \
  "$CUSTOM_TARGET/Hooks/CaseObj/SyncCasePartyFullNamesOnSave.php" \
  "$CUSTOM_TARGET/Hooks/CaseObj/SyncLegacyCaseFieldsOnSave.php" \
  "$CUSTOM_TARGET/Tools/CaseObj/LegacyCaseFieldMirror.php"

if [ -d "$FORMATOS_SOURCE" ]; then
  echo "Copying templates from formatos/..."
  mkdir -p "$TEMPLATES_TARGET"

  if [ -f "$FORMATOS_SOURCE/FormatoSolicitud.doc" ]; then
    cp "$FORMATOS_SOURCE/FormatoSolicitud.doc" "$TEMPLATES_TARGET/FormatoSolicitud.doc"
  elif [ -f "$FORMATOS_SOURCE/FormatoSolicitud.docx" ]; then
    cp "$FORMATOS_SOURCE/FormatoSolicitud.docx" "$TEMPLATES_TARGET/FormatoSolicitud.doc"
  fi

  [ -f "$FORMATOS_SOURCE/ActaVisita2.docx" ] && cp "$FORMATOS_SOURCE/ActaVisita2.docx" "$TEMPLATES_TARGET/ActaVisita2.docx"
  [ -f "$FORMATOS_SOURCE/ActaVisita.xlsx" ] && cp "$FORMATOS_SOURCE/ActaVisita.xlsx" "$TEMPLATES_TARGET/ActaVisita.xlsx"
  [ -f "$FORMATOS_SOURCE/ActuoArchivo.docx" ] && cp "$FORMATOS_SOURCE/ActuoArchivo.docx" "$TEMPLATES_TARGET/ActuoArchivo.docx"
fi

echo "Copying frontend client/custom..."
require_path "$CLIENT_SOURCE" "client custom source"
cp -R "$CLIENT_SOURCE/." "$CLIENT_TARGET/"

if [ -f "$EXCEL_SOURCE" ]; then
  echo "Copying excelAlcaldia.xlsx..."
  mkdir -p "$APP_ROOT/data/exports"
  cp "$EXCEL_SOURCE" "$APP_ROOT/data/exports/excelAlcaldia.xlsx"
elif [ -d "$EXPORTS_SOURCE" ] && [ -f "$EXPORTS_SOURCE/excelAlcaldia.xlsx" ]; then
  echo "Copying exports/excelAlcaldia.xlsx..."
  mkdir -p "$APP_ROOT/data/exports"
  cp "$EXPORTS_SOURCE/excelAlcaldia.xlsx" "$APP_ROOT/data/exports/excelAlcaldia.xlsx"
else
  echo "WARNING: excelAlcaldia.xlsx not found in repo root or exports/."
fi

echo "Checking runtime packages..."
ensure_package "dpkg -s libreoffice-writer-nogui && dpkg -s libreoffice-calc-nogui" \
  "apt-get install -y -qq libreoffice-writer-nogui libreoffice-calc-nogui python3-uno"
ensure_package "python3 -c 'import fitz'" \
  "apt-get install -y -qq python3-pymupdf"
ensure_package "python3 -c 'import openpyxl'" \
  "apt-get install -y -qq python3-openpyxl"

echo "Generating template PDFs if missing..."
generate_pdf_if_missing "$TEMPLATES_TARGET/FormatoSolicitud.doc" "$TEMPLATES_TARGET/FormatoSolicitud-template.pdf" "lo-tpl-sol"
[ -f "$TEMPLATES_TARGET/FormatoSolicitud.pdf" ] && mv "$TEMPLATES_TARGET/FormatoSolicitud.pdf" "$TEMPLATES_TARGET/FormatoSolicitud-template.pdf"
generate_pdf_if_missing "$TEMPLATES_TARGET/ActaVisita2.docx" "$TEMPLATES_TARGET/ActaVisita2-template.pdf" "lo-tpl-acta"
[ -f "$TEMPLATES_TARGET/ActaVisita2.pdf" ] && mv "$TEMPLATES_TARGET/ActaVisita2.pdf" "$TEMPLATES_TARGET/ActaVisita2-template.pdf"

echo "Setting permissions..."
chown -R www-data:www-data "$APP_ROOT/data" "$CUSTOM_TARGET" "$CLIENT_TARGET"

echo "Rebuild + clear cache..."
(cd "$APP_ROOT" && "$PHP_BIN" command.php rebuild)
(cd "$APP_ROOT" && "$PHP_BIN" command.php clear-cache)

echo "Updating appTimestamp..."
"$PHP_BIN" -r '
$path = "/var/www/html/data/state.php";
$state = file_exists($path) ? include $path : [];
if (!is_array($state)) {
    $state = [];
}
$state["appTimestamp"] = time();
$state["cacheTimestamp"] = time();
$state["microtimeState"] = microtime(true);
file_put_contents($path, "<?php\nreturn " . var_export($state, true) . ";\n");
echo "appTimestamp=" . $state["appTimestamp"] . "\n";
'

run_php_script configure-case-create-defaults.php
run_php_script configure-case-assignment-permissions.php
run_php_script configure-radicacion-field-level.php
run_php_script configure-excel-alcaldia-case-fields.php
run_php_script configure-case-enum-placeholders.php
run_php_script configure-global-tablist.php
run_php_script configure-calendar-meetings-only.php
run_php_script configure-case-kanban.php
run_php_script configure-acta-visita-entity.php
run_php_script configure-user-dashboards.php
run_php_script configure-full-access-all-roles.php
run_php_script configure-document-plantillas.php
run_php_script migrate-drop-case-categoria-tipo.php
run_php_script migrate-case-documento-fields.php
run_php_script migrate-case-canonical-fields.php
run_php_script migrate-case-peticionario-db-columns.php
run_php_script migrate-case-party-field-names.php
run_php_script configure-case-party-field-access.php
run_php_script configure-asignacion-historial.php
run_php_script configure-comunicacion-caso-entity.php

echo "Dokploy custom deployment completed."
