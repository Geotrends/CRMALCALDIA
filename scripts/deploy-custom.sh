#!/bin/bash
# Despliega backend (metadata, hooks) y frontend (JS) al contenedor EspoCRM.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f /var/www/html/command.php ] && ! command -v docker >/dev/null 2>&1; then
  exec bash "$ROOT/scripts/deploy-custom-dokploy.sh"
fi

echo 'Copiando backend custom (sync limpio)...'
docker exec espocrm bash -c 'find /var/www/html/custom/Espo/Custom -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
docker cp "$ROOT/espocrm-custom/." espocrm:/var/www/html/custom/Espo/Custom/

echo 'Eliminando hooks y clases obsoletas (no presentes en el repo)...'
docker cp "$ROOT/scripts/includes/purge-obsolete-custom.sh" espocrm:/tmp/purge-obsolete-custom.sh
docker exec espocrm bash -c 'source /tmp/purge-obsolete-custom.sh && purge_obsolete_custom /var/www/html/custom/Espo/Custom /var/www/html/client/custom'
docker exec espocrm rm -f /var/www/html/data/exports/casos-solicitud.xlsx

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

echo 'Copiando frontend client/custom (sync limpio)...'
docker exec espocrm bash -c 'find /var/www/html/client/custom -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
docker cp "$ROOT/espocrm-custom/files/client/custom/." espocrm:/var/www/html/client/custom/

echo 'Eliminando JS obsoleto...'
docker exec espocrm bash -c 'source /tmp/purge-obsolete-custom.sh && purge_obsolete_custom /var/www/html/custom/Espo/Custom /var/www/html/client/custom'

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

# shellcheck source=includes/deploy-steps.sh
source "$ROOT/scripts/includes/deploy-steps.sh"

deploy_maybe_wipe_business_data_docker "$ROOT"

deploy_run_steps_docker "$ROOT" "${DEPLOY_SETUP_STEPS[@]}"
deploy_run_legacy_migrations_docker "$ROOT" "${DEPLOY_LEGACY_MIGRATION_SCRIPTS[@]}"
deploy_run_steps_docker "$ROOT" "${DEPLOY_POST_LEGACY_STEPS[@]}"

echo 'Listo. Recarga el navegador con Cmd+Shift+R en http://localhost:8080'
