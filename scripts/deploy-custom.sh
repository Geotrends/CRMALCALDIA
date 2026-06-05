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

docker exec espocrm chown -R www-data:www-data /var/www/html/custom/Espo/Custom/

echo 'Rebuild + clear cache...'
docker exec espocrm php command.php rebuild
docker exec espocrm php command.php clear-cache

echo 'Listo. Recarga el navegador con Cmd+Shift+R en http://localhost:8080'
