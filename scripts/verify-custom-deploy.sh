#!/bin/bash
# Comprueba que el custom de Radicación llegó al contenedor EspoCRM.
# Uso local:  bash scripts/verify-custom-deploy.sh
# En servidor: docker exec espocrm bash /opt/bootstrap/repo/scripts/verify-custom-deploy.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/html}"
REPO_ROOT="${REPO_ROOT:-/opt/bootstrap/repo}"
CLIENT="$APP_ROOT/client/custom"
CUSTOM="$APP_ROOT/custom/Espo/Custom"
STAMP_FILE="$APP_ROOT/data/.custom-deploy-stamp"

check_file() {
  local label="$1"
  local path="$2"
  local needle="${3:-}"

  if [ ! -f "$path" ]; then
    echo "FALTA: $label → $path"
    return 1
  fi

  if [ -n "$needle" ] && ! grep -q "$needle" "$path" 2>/dev/null; then
    echo "DESACTUALIZADO: $label (no contiene «$needle») → $path"
    return 1
  fi

  echo "OK: $label"
  return 0
}

errors=0

echo "==> Verificación deploy custom (APP_ROOT=$APP_ROOT)"
echo ""

check_file "Loader flujo radicación" \
  "$CLIENT/src/loader/case-radicacion-flow.js" \
  "alcaldia-radicacion-radicar-page" || errors=$((errors + 1))

check_file "Loader perfil (IIFE, sin define)" \
  "$CLIENT/src/loader/alcaldia-profile-sync.js" \
  "Espo.loader.require" || errors=$((errors + 1))

check_file "Rutas cliente radicar" \
  "$CUSTOM/Resources/metadata/app/clientRoutes.json" \
  "Case/radicar" || errors=$((errors + 1))

check_file "scriptList case-radicacion-flow" \
  "$CUSTOM/Resources/metadata/app/client.json" \
  "case-radicacion-flow.js" || errors=$((errors + 1))

check_file "Layout radicar" \
  "$CUSTOM/Resources/layouts/Case/radicar.json" \
  "radicacionCaso" || errors=$((errors + 1))

check_file "Edit case (layout dedicado)" \
  "$CLIENT/src/views/case/record/edit.js" \
  "prepareRadicacionDedicatedLayoutForUser" || errors=$((errors + 1))

if [ -f "$REPO_ROOT/.deploy-version" ]; then
  echo "OK: Versión en imagen → $(cat "$REPO_ROOT/.deploy-version")"
else
  echo "AVISO: sin $REPO_ROOT/.deploy-version (rebuild imagen recomendado)"
fi

if [ -f "$STAMP_FILE" ]; then
  echo "OK: Huella desplegada → $(cat "$STAMP_FILE")"
else
  echo "AVISO: sin huella $STAMP_FILE (deploy-custom no corrió?)"
fi

if [ -f "$APP_ROOT/data/state.php" ]; then
  php -r '
    $s = include "/var/www/html/data/state.php";
    echo "OK: appTimestamp=" . ($s["appTimestamp"] ?? "?") . "\n";
  ' 2>/dev/null || true
fi

echo ""
if [ "$errors" -gt 0 ]; then
  echo "RESULTADO: $errors comprobación(es) fallida(s)."
  echo "En Dokploy: haz REBUILD de la imagen (no solo restart) y revisa logs de espocrm / espocrm-init."
  exit 1
fi

echo "RESULTADO: custom de Radicación presente en el contenedor."
