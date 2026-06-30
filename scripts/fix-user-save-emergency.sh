#!/usr/bin/env bash
# Limpieza de emergencia en el contenedor espocrm (Dokploy → Terminal).
# Borra hooks/clases obsoletos que cp -R dejó en el servidor y reconstruye caché.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/html}"
CUSTOM_TARGET="$APP_ROOT/custom/Espo/Custom"
CLIENT_TARGET="$APP_ROOT/client/custom"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# shellcheck source=includes/purge-obsolete-custom.sh
source "$SCRIPTS_DIR/includes/purge-obsolete-custom.sh"

purge_obsolete_custom "$CUSTOM_TARGET" "$CLIENT_TARGET"

cd "$APP_ROOT"
php command.php rebuild
php command.php clear-cache

echo ""
echo "Listo. Recarga el navegador (Ctrl+Shift+R) e intenta crear/editar usuario."
echo "Hooks User restantes (debe estar vacío o no existir):"
ls -la "$CUSTOM_TARGET/Hooks/User" 2>/dev/null || echo "  (sin carpeta Hooks/User — correcto)"
