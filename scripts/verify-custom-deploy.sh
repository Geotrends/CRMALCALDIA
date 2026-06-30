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

if head -c 2 "$CLIENT/src/helpers/radicacion-fields.js" 2>/dev/null | od -An -tx1 | grep -q "ff fe"; then
  echo "FALTA: radicacion-fields.js está en UTF-16 (debe ser UTF-8)"
  errors=$((errors + 1))
else
  echo "OK: radicacion-fields.js codificación UTF-8"
fi

check_file "numero-radicado sin sintaxis rota" \
  "$CLIENT/src/views/case/fields/numero-radicado.js" \
  "change:cExpediente" || errors=$((errors + 1))

if grep -q $'        },\n\n            this.listenTo' "$CLIENT/src/views/case/fields/numero-radicado.js" 2>/dev/null; then
  echo "FALTA: numero-radicado.js tiene listenTo huérfano (SyntaxError en cliente)"
  errors=$((errors + 1))
else
  echo "OK: numero-radicado.js sin listenTo huérfano"
fi

check_file "Helper inspeccion-case-flow" \
  "$CLIENT/src/helpers/inspeccion-case-flow.js" \
  "hideAsignacionPanel" || errors=$((errors + 1))

check_file "Defaults Recibida/Remitido al crear" \
  "$CUSTOM/Tools/CaseObj/CaseCreateDefaultsService.php" \
  "cRecibidaPorId" || errors=$((errors + 1))

check_file "PartyRegistryService (sync peticionario/perjudicante)" \
  "$CUSTOM/Tools/Party/PartyRegistryService.php" \
  "findContactByDocument" || errors=$((errors + 1))

check_file "CasePartyNameHelper completo" \
  "$CUSTOM/Tools/CaseObj/CasePartyNameHelper.php" \
  "hasPerjudicanteName" || errors=$((errors + 1))

check_file "Sync peticionario con skipAll" \
  "$CUSTOM/Hooks/CaseObj/SyncPeticionarioToContact.php" \
  "skipAll" || errors=$((errors + 1))

check_file "Notificaciones con enlaces (helper)" \
  "$CLIENT/src/helpers/alcaldia-notification-message.js" \
  "isNuevaSolicitud" || errors=$((errors + 1))

check_file "Vista notificaciones custom" \
  "$CUSTOM/Resources/metadata/clientDefs/Notification.json" \
  "custom:views/notification/items/radicado" || errors=$((errors + 1))

check_file "Container notificaciones custom" \
  "$CLIENT/src/views/notification/fields/container.js" \
  "custom:views/notification/items/radicado" || errors=$((errors + 1))

check_file "Hook estado Asignado" \
  "$CUSTOM/Hooks/CaseObj/SetAsignadoOnPatrulleroAssignment.php" \
  "STATUS_ASIGNADO" || errors=$((errors + 1))

check_file "Helper patrullero-acta" \
  "$CLIENT/src/helpers/patrullero-acta.js" \
  "canPrintManualActa" || errors=$((errors + 1))

check_file "Modal acta visita" \
  "$CLIENT/src/helpers/acta-visita-modal.js" \
  "ActaVisita" || errors=$((errors + 1))

check_file "Helper acta-visita-from-case" \
  "$CLIENT/src/helpers/acta-visita-from-case.js" \
  "buildDefaultsFromCase" || errors=$((errors + 1))

check_file "Validacion persona solo tras radicado" \
  "$CUSTOM/Hooks/CaseObj/ValidatePersonaTipoOnSave.php" \
  "isRadicadoCompleto" || errors=$((errors + 1))

check_file "Helper inspeccion-case-flow (radicado)" \
  "$CLIENT/src/helpers/inspeccion-case-flow.js" \
  "lockRadicadoFields" || errors=$((errors + 1))

check_file "Perfil API AlcaldiaUserProfile" \
  "$CUSTOM/Tools/User/AlcaldiaUserProfile.php" \
  "ROLE_INSPECCION" || errors=$((errors + 1))

check_file "Hook locale Bogotá 24h en usuarios nuevos" \
  "$CUSTOM/Hooks/User/ApplyAlcaldiaLocaleDefaults.php" \
  "AlcaldiaLocaleDefaults" || errors=$((errors + 1))

check_file "Helper fecha/hora Bogotá" \
  "$CUSTOM/Tools/App/AlcaldiaDateTimeHelper.php" \
  "America/Bogota" || errors=$((errors + 1))

if [ -f "$CUSTOM/Hooks/User/SyncTeamsFromRoles.php" ]; then
  echo "FALTA: hook obsoleto SyncTeamsFromRoles.php aún en el servidor"
  errors=$((errors + 1))
else
  echo "OK: sin hook obsoleto User/SyncTeamsFromRoles"
fi

if [ -f "$CUSTOM/Tools/User/TeamRoleSync.php" ]; then
  echo "FALTA: TeamRoleSync.php obsoleto aún en el servidor"
  errors=$((errors + 1))
else
  echo "OK: sin TeamRoleSync obsoleto"
fi

check_file "Hook estado Radicado al radicar" \
  "$CUSTOM/Hooks/CaseObj/SetRadicadoOnPostRadicacion.php" \
  "order = 26" || errors=$((errors + 1))

check_file "Hook notificación asignación patrullero" \
  "$CUSTOM/Hooks/CaseObj/NotifyPatrulleroAssignment.php" \
  "skipAll" || errors=$((errors + 1))

check_file "Hook notificación radicado→Inspección/Asignación" \
  "$CUSTOM/Hooks/CaseObj/NotifyInspeccionAndAsignadorOnRadicado.php" \
  "isRadicado" || errors=$((errors + 1))

if grep -q "alcaldia-notification-message.js" "$REPO_ROOT/scripts/includes/purge-obsolete-custom.sh" 2>/dev/null; then
  echo "FALTA: purge-obsolete-custom.sh aún borra alcaldia-notification-message.js"
  errors=$((errors + 1))
else
  echo "OK: purge no borra alcaldia-notification-message.js"
fi

if grep -q "NotifyPatrulleroAssignment.php" "$REPO_ROOT/scripts/includes/purge-obsolete-custom.sh" 2>/dev/null; then
  echo "FALTA: purge-obsolete-custom.sh aún borra NotifyPatrulleroAssignment.php"
  errors=$((errors + 1))
else
  echo "OK: purge no borra NotifyPatrulleroAssignment.php"
fi

if grep -q "SetRadicadoOnPostRadicacion.php" "$REPO_ROOT/scripts/includes/purge-obsolete-custom.sh" 2>/dev/null; then
  echo "FALTA: purge-obsolete-custom.sh aún borra SetRadicadoOnPostRadicacion.php"
  errors=$((errors + 1))
else
  echo "OK: purge no borra SetRadicadoOnPostRadicacion.php"
fi

if grep -q "patrullero-acta.js" "$REPO_ROOT/scripts/includes/purge-obsolete-custom.sh" 2>/dev/null; then
  echo "FALTA: purge-obsolete-custom.sh aún borra patrullero-acta.js"
  errors=$((errors + 1))
else
  echo "OK: purge no borra patrullero-acta.js"
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
  echo "OK: Versión en imagen → $(tr -d '\r\n' < "$REPO_ROOT/.deploy-version")"
else
  echo "AVISO: sin $REPO_ROOT/.deploy-version"
fi

if [ -f "$APP_ROOT/data/.deploy-version-applied" ]; then
  echo "OK: Versión aplicada en volumen → $(tr -d '\r\n' < "$APP_ROOT/data/.deploy-version-applied")"
else
  echo "AVISO: sin $APP_ROOT/data/.deploy-version-applied (auto-deploy no corrió tras último build?)"
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
