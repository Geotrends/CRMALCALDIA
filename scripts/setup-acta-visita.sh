#!/usr/bin/env bash
# Configura entidad ActaVisita y permisos (Mac/Linux).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo 'Desplegando custom...'
"$ROOT/scripts/deploy-custom.sh"

echo 'Configurando permisos por rol...'
docker cp "$ROOT/scripts/configure-acta-visita-entity.php" espocrm:/tmp/configure-acta-visita-entity.php
docker exec espocrm php /tmp/configure-acta-visita-entity.php

echo 'Listo. Recarga el CRM con Cmd+Shift+R.'
