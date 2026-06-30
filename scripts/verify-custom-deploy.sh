#!/bin/bash
# Comprueba que el custom base llegó al contenedor EspoCRM.
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

check_file "scriptList sin flujos por rol" \
  "$CUSTOM/Resources/metadata/app/client.json" \
  "theme-login.js" || errors=$((errors + 1))

if grep -q "case-radicacion-flow.js\|alcaldia-profile-sync.js\|case-create-guard.js" "$CUSTOM/Resources/metadata/app/client.json" 2>/dev/null; then
  echo "FALTA: scriptList aún referencia loaders de flujo por roles"
  errors=$((errors + 1))
else
  echo "OK: scriptList sin loaders de flujo por roles"
fi

if [ -f "$CUSTOM/Resources/metadata/app/clientRoutes.json" ] && grep -q "radicar\|asignar" "$CUSTOM/Resources/metadata/app/clientRoutes.json" 2>/dev/null; then
  echo "FALTA: clientRoutes.json aún define rutas radicar/asignar"
  errors=$((errors + 1))
else
  echo "OK: sin rutas radicar/asignar"
fi

check_file "Vista record edit (Inspección)" \
  "$CLIENT/src/views/case/record/edit.js" \
  "inspeccion-case-flow" || errors=$((errors + 1))

check_file "Helper radicacion-fields" \
  "$CLIENT/src/helpers/radicacion-fields.js" \
  "isInspeccionUser" || errors=$((errors + 1))

check_file "Helper inspeccion-case-flow" \
  "$CLIENT/src/helpers/inspeccion-case-flow.js" \
  "lockRadicadoFields" || errors=$((errors + 1))

check_file "Perfil API AlcaldiaUserProfile" \
  "$CUSTOM/Tools/User/AlcaldiaUserProfile.php" \
  "ROLE_INSPECCION" || errors=$((errors + 1))

if [ -f "$CUSTOM/Hooks/User/ApplyAlcaldiaLocaleDefaults.php" ]; then
  echo "FALTA: hook obsoleto ApplyAlcaldiaLocaleDefaults.php aún en el servidor"
  errors=$((errors + 1))
else
  echo "OK: sin hook obsoleto User/ApplyAlcaldiaLocaleDefaults"
fi

check_file "Hook notificación Inspección→Radicación" \
  "$CUSTOM/Hooks/CaseObj/NotifyRadicacionOnCaseCreated.php" \
  "isInspeccion" || errors=$((errors + 1))

check_file "Campo motivo reasignacion" \
  "$CLIENT/src/views/case/fields/c-motivo-reasignacion.js" \
  "views/fields/text" || errors=$((errors + 1))

check_file "Campo numero radicado" \
  "$CLIENT/src/views/case/fields/numero-radicado.js" \
  "radicado-catalog" || errors=$((errors + 1))

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
  exit 1
fi

echo "RESULTADO: custom base presente (rol Inspección activo)."
