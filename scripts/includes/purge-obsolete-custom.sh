#!/usr/bin/env bash
# Archivos PHP/JS que ya no están en el repo pero cp -R deja en el servidor.
# Uso: purge_obsolete_custom "$CUSTOM_TARGET" "$CLIENT_TARGET"

purge_obsolete_custom() {
  local custom_target="${1:-}"
  local client_target="${2:-}"

  if [ -z "$custom_target" ] && [ -z "$client_target" ]; then
    echo "ERROR: purge_obsolete_custom requiere al menos un target"
    return 1
  fi

  if [ -n "$custom_target" ]; then
    echo "Purging obsolete custom backend files..."

    rm -f \
    "$custom_target/Hooks/User/ApplyAlcaldiaLocaleDefaults.php" \
    "$custom_target/Hooks/User/SyncTeamsFromRoles.php" \
    "$custom_target/Tools/User/TeamRoleSync.php" \
    "$custom_target/Classes/Select/User/PrimaryFilters/Patrulleros.php" \
    "$custom_target/Classes/Select/User/PrimaryFilters/Radicacion.php" \
    "$custom_target/Classes/Select/User/PrimaryFilters/Recibidores.php" \
    "$custom_target/Classes/Select/Case/AccessControlFilters/Mandatory.php" \
    "$custom_target/Classes/Select/Case/PrimaryFilters/EnSeguimiento.php" \
    "$custom_target/Classes/Select/Case/PrimaryFilters/MisCasos.php" \
    "$custom_target/Classes/Select/Case/PrimaryFilters/PendienteAsignacion.php" \
    "$custom_target/Classes/Select/Case/PrimaryFilters/PendienteRadicacion.php" \
    "$custom_target/Classes/Select/Case/PrimaryFilters/Todos.php" \
    "$custom_target/Hooks/CaseObj/SyncCasePartyFullNamesOnSave.php" \
    "$custom_target/Hooks/CaseObj/SyncLegacyCaseFieldsOnSave.php" \
    "$custom_target/Hooks/CaseObj/ExportCaseSolicitudExcelOnSave.php" \
    "$custom_target/Hooks/CaseObj/EnsureCaseCreateDefaults.php" \
    "$custom_target/Hooks/CaseObj/LimitAsignadorCaseEdit.php" \
    "$custom_target/Hooks/CaseObj/LimitFechaVencimientoEdit.php" \
    "$custom_target/Hooks/CaseObj/LimitPatrulleroCaseEdit.php" \
    "$custom_target/Hooks/CaseObj/LimitRadicadoFieldEdit.php" \
    "$custom_target/Hooks/CaseObj/NotifyInspeccionAndAsignadorOnRadicado.php" \
    "$custom_target/Hooks/CaseObj/NotifyPatrulleroAssignment.php" \
    "$custom_target/Hooks/CaseObj/RestrictAsignadorCaseAccess.php" \
    "$custom_target/Hooks/CaseObj/SetEnProcesoOnPatrulleroAssignment.php" \
    "$custom_target/Hooks/CaseObj/SetPendienteRadicacionOnCaseCreate.php" \
    "$custom_target/Hooks/CaseObj/SetRadicadoOnPostRadicacion.php" \
    "$custom_target/Hooks/CaseObj/ValidateSolicitudCompletaOnSave.php" \
    "$custom_target/Tools/CaseObj/LegacyCaseFieldMirror.php" \
    "$custom_target/Tools/CaseObj/CrmRegistroExcelExporter.php" \
    "$custom_target/files/scripts/upsert-crm-excel.py"

    rmdir "$custom_target/Hooks/User" 2>/dev/null || true
    rmdir "$custom_target/Classes/Select/User/PrimaryFilters" 2>/dev/null || true
    rmdir "$custom_target/Classes/Select/User" 2>/dev/null || true
  fi

  if [ -n "$client_target" ]; then
    echo "Purging obsolete client JS..."
    rm -f \
      "$client_target/src/helpers/radicacion-edit-mode.js" \
      "$client_target/src/helpers/post-radicacion-fields.js" \
      "$client_target/src/helpers/asignador-edit-mode.js" \
      "$client_target/src/helpers/patrullero-edit-mode.js" \
      "$client_target/src/helpers/patrullero-acta.js" \
      "$client_target/src/helpers/inspeccion-acta.js" \
      "$client_target/src/helpers/inspeccion-actuo-archivo.js" \
      "$client_target/src/helpers/inspeccion-registro-excel.js" \
      "$client_target/src/helpers/inspeccion-edit-mode.js" \
      "$client_target/src/helpers/alcaldia-case-roles.js" \
      "$client_target/src/helpers/alcaldia-roles-config.js" \
      "$client_target/src/helpers/alcaldia-notification-message.js" \
      "$client_target/src/loader/alcaldia-profile-sync.js" \
      "$client_target/src/loader/case-radicacion-flow.js" \
      "$client_target/src/loader/case-asignacion-flow.js" \
      "$client_target/src/controllers/case.js" \
      "$client_target/src/config/case-create-users.js" \
      "$client_target/src/views/case/fields/assigned-user.js"
  fi
}
