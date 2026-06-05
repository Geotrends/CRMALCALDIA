#!/bin/bash
# Despliega backend (metadata, hooks) y frontend (JS) al contenedor EspoCRM.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo 'Copiando backend custom...'
docker cp "$ROOT/espocrm-custom/." espocrm:/var/www/html/custom/Espo/Custom/

echo 'Copiando frontend client/custom...'
docker cp "$ROOT/espocrm-custom/files/client/custom/." espocrm:/var/www/html/client/custom/

echo 'Verificando LibreOffice (generación de formatos)...'
docker exec espocrm bash -c 'command -v soffice >/dev/null || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libreoffice-writer-nogui python3-uno)'

docker exec espocrm chown -R www-data:www-data /var/www/html/custom/Espo/Custom/

echo 'Rebuild + clear cache...'
docker exec espocrm php command.php rebuild
docker exec espocrm php command.php clear-cache

echo 'Listo. Recarga el navegador con Cmd+Shift+R en http://localhost:8080'
