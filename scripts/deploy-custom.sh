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
    if [ "$base" = "ActuoArchivo.docx" ]; then
      docker cp "$f" "espocrm:/var/www/html/custom/Espo/Custom/files/templates/ActuoArchivo.docx"
    fi
  done
fi

echo 'Copiando frontend client/custom...'
docker cp "$ROOT/espocrm-custom/files/client/custom/." espocrm:/var/www/html/client/custom/

echo 'Verificando LibreOffice (generación de formatos)...'
docker exec espocrm bash -c 'command -v soffice >/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libreoffice-writer-nogui python3-uno)'

echo 'Verificando openpyxl (export Excel casos)...'
docker exec espocrm bash -c 'python3 -c "import openpyxl" 2>/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-openpyxl)'

docker exec espocrm mkdir -p /var/www/html/data
docker exec espocrm chown -R www-data:www-data /var/www/html/data /var/www/html/custom/Espo/Custom/

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

echo 'Listo. Recarga el navegador con Cmd+Shift+R en http://localhost:8080'
