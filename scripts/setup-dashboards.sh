#!/usr/bin/env bash
# Despliega tablero KPI + configura Home por perfil de usuario.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo 'Copiando archivos del tablero...'
docker exec espocrm mkdir -p /var/www/html/client/custom
docker cp "$ROOT/espocrm-custom/files/client/custom/dashboard.html" espocrm:/var/www/html/client/custom/dashboard.html
docker cp "$ROOT/espocrm-custom/files/client/custom/dashboard.js" espocrm:/var/www/html/client/custom/dashboard.js
docker cp "$ROOT/espocrm-custom/files/client/custom/dashboard.css" espocrm:/var/www/html/client/custom/dashboard.css

echo 'Desplegando backend (filtros, metadata)...'
bash "$ROOT/scripts/deploy-custom.sh"

echo 'Configurando dashboards por usuario...'
docker cp "$ROOT/scripts/configure-user-dashboards.php" espocrm:/tmp/configure-user-dashboards.php
docker exec espocrm php /tmp/configure-user-dashboards.php

echo "Listo. Cierra sesión y vuelve a entrar en http://localhost:8080"
