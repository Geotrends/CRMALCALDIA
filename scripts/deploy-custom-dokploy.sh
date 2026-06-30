#!/bin/bash
# Runs inside the espocrm container. The repository must be mounted in Dokploy.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/opt/bootstrap/repo}"
APP_ROOT="${APP_ROOT:-/var/www/html}"
PHP_BIN="${PHP_BIN:-php}"
RUN_APT_CHECKS="${RUN_APT_CHECKS:-1}"
export ESPO_DEPLOY_BATCH=1

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
  env \
    ESPOCRM_ADMIN_USERNAME="${ESPOCRM_ADMIN_USERNAME:-admin}" \
    ESPOCRM_ADMIN_PASSWORD="${ESPOCRM_ADMIN_PASSWORD:-}" \
    "$PHP_BIN" "$script_path"
}

write_admin_credentials_file() {
  echo "Guardando credenciales admin para el deploy..."
  run_php_script write-admin-credentials.php
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

mkdir -p "$APP_ROOT/data"
write_admin_credentials_file

echo "Copying backend custom..."
mkdir -p "$CUSTOM_TARGET" "$CLIENT_TARGET" "$APP_ROOT/data"
cp -R "$CUSTOM_SOURCE/." "$CUSTOM_TARGET/"

echo "Removing obsolete classes..."
rm -f \
  "$CUSTOM_TARGET/Hooks/CaseObj/SyncCasePartyFullNamesOnSave.php" \
  "$CUSTOM_TARGET/Hooks/CaseObj/SyncLegacyCaseFieldsOnSave.php" \
  "$CUSTOM_TARGET/Hooks/CaseObj/ExportCaseSolicitudExcelOnSave.php" \
  "$CUSTOM_TARGET/Tools/CaseObj/LegacyCaseFieldMirror.php" \
  "$CUSTOM_TARGET/Tools/CaseObj/CrmRegistroExcelExporter.php" \
  "$CUSTOM_TARGET/files/scripts/upsert-crm-excel.py"
rm -f "$APP_ROOT/data/exports/casos-solicitud.xlsx"

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

# shellcheck source=includes/deploy-steps.sh
source "$SCRIPTS_SOURCE/includes/deploy-steps.sh"

deploy_maybe_wipe_business_data "$APP_ROOT" "$SCRIPTS_SOURCE" "$PHP_BIN"

for entry in "${DEPLOY_SETUP_STEPS[@]}"; do
  run_php_script "${entry#*|}"
done

if "$PHP_BIN" "$SCRIPTS_SOURCE/needs-legacy-db-migrations.php"; then
  for script in "${DEPLOY_LEGACY_MIGRATION_SCRIPTS[@]}"; do
    run_php_script "$script"
  done
else
  echo "Skipping legacy DB migrations (fresh install)."
fi

for entry in "${DEPLOY_POST_LEGACY_STEPS[@]}"; do
  run_php_script "${entry#*|}"
done

echo "Rebuild final..."
(cd "$APP_ROOT" && "$PHP_BIN" command.php rebuild)
(cd "$APP_ROOT" && "$PHP_BIN" command.php clear-cache)

echo "Verificación final: usuario admin..."
run_php_script ensure-admin-login.php

unset ESPO_DEPLOY_BATCH

# shellcheck source=includes/deploy-stamp.sh
source "$SCRIPTS_SOURCE/includes/deploy-stamp.sh"
deploy_stamp_write "$APP_ROOT/data/.custom-deploy-stamp"

echo "Verificando archivos críticos del custom..."
if bash "$SCRIPTS_SOURCE/verify-custom-deploy.sh"; then
  echo "Verificación deploy: OK."
else
  echo "ERROR: verify-custom-deploy falló — revisa la copia client/custom y Resources/."
  exit 1
fi

echo "Dokploy custom deployment completed."
