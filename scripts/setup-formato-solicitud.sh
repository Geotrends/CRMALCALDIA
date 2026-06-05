#!/usr/bin/env bash
# Instala dependencias del formato solicitud y despliega custom (Mac/Linux).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo 'Instalando Python + LibreOffice en contenedor espocrm...'
docker exec -u root espocrm sh -c "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 python3-uno libreoffice-writer libreoffice-core && rm -rf /var/lib/apt/lists/*"

echo 'Copiando plantilla y scripts...'
docker cp "$ROOT/espocrm-custom/files/templates/FormatoSolicitud.doc" espocrm:/var/www/html/custom/Espo/Custom/files/templates/FormatoSolicitud.doc
docker cp "$ROOT/espocrm-custom/files/scripts/fill-formato-solicitud.py" espocrm:/var/www/html/custom/Espo/Custom/files/scripts/fill-formato-solicitud.py
docker exec -u root espocrm chmod +x /var/www/html/custom/Espo/Custom/files/scripts/fill-formato-solicitud.py

echo 'Desplegando custom...'
"$ROOT/scripts/deploy-custom.sh"

echo 'Listo. Juan puede descargar Word/PDF cuando el caso tenga radicado y expediente.'
