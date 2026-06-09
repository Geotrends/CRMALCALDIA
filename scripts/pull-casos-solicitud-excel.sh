#!/usr/bin/env bash
# El Excel se escribe directo en exports/ (volumen montado en docker-compose).
# Este script solo sirve de respaldo si el volumen no está activo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$ROOT/exports/casos-solicitud.xlsx}"

mkdir -p "$(dirname "$DEST")"
docker cp "espocrm:/var/www/html/data/exports/casos-solicitud.xlsx" "$DEST" 2>/dev/null \
  || docker cp "espocrm:/var/www/html/data/casos-solicitud.xlsx" "$DEST"
echo "Excel copiado a: $DEST"
